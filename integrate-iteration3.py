from pathlib import Path
p=Path('src/view/GameView.js');s=p.read_text(encoding='utf-8-sig');s="import { CharacterGuide } from './CharacterGuide.js';\n"+s;s=s.replace('this.mapPanel?.dispose();','this.guide?.dispose();\n      this.guide = null;\n      this.mapPanel?.dispose();');s=s.replace('else this.renderPlaceholder(page);',"else if (page === 'guide') this.guide = new CharacterGuide(this.main, profile);\n      else this.renderPlaceholder(page);");p.write_text(s,encoding='utf-8')
p=Path('src/view/MountainMapRenderer.js');s=p.read_text(encoding='utf-8-sig');s="import { CharacterTokenRenderer } from './CharacterTokenRenderer.js';\n"+s;s=s.replace('this.bind();',"this.tokenLayer = document.createElement('div'); this.tokenLayer.className='map-token-layer'; container.append(this.tokenLayer);\n    this.tokens = Object.fromEntries(['P1','P2'].map((seat,i)=>{const el=document.createElement('div'); el.className='map-character-anchor'; this.tokenLayer.append(el);return [seat,new CharacterTokenRenderer(el,{seat,characterId:i?'CH-02':'CH-01'})];}));\n    this.bind();",1)
a=s.index("    for (const [seat, index] of Object.entries(this.publicView?.positions ?? {})) {");b=s.index('    for (let i = 0; i < 28;',a)
s=s[:a]+'''    const anchors = ['P1','P2'].map(seat => this.project(0, this.publicView?.positions[seat] ?? 0, .7));
    // Fixed screen-space width preserves full names at every camera zoom.
    const cardWidth = Math.min(210, (this.width - 36) / 2);
    const close = Math.abs(anchors[0].y - anchors[1].y) < 125;
    ['P1','P2'].forEach((seat,i)=>{
      const token=this.tokens[seat], el=token.root, p=anchors[i];
      let x=p.x+(close?(i?1:-1)*(cardWidth/2+7):0);
      x=clamp(x,cardWidth/2+4,this.width-cardWidth/2-4);
      el.style.width=`${cardWidth}px`; el.style.left=`${x}px`; el.style.top=`${p.y-20}px`;
      el.style.visibility=p.y < -80 || p.y > this.height+130 ? 'hidden':'visible';
      token.update(this.reducedMotion?0:time);
    });
'''+s[b:];s=s.replace('this.canvas.remove();',"Object.values(this.tokens).forEach(t=>t.dispose()); this.tokenLayer.remove();\n    this.canvas.remove();");p.write_text(s,encoding='utf-8')
p=Path('src/view/MountainMapPanel.js');s=p.read_text(encoding='utf-8-sig');s="import { CHARACTERS } from '../resources/characters.js';\n"+s;s=s.replace("    this.bindEvents();",'''    const test = document.createElement('section'); test.className='token-mount-test';
    test.innerHTML=`<h2>角色信标挂载测试</h2><p>纯视觉预览 · 不选角、不出牌、不记战绩</p>${['P1','P2'].map((seat,i)=>`<fieldset><legend>${seat}</legend><label>角色 <select data-token-character="${seat}">${CHARACTERS.map((c,n)=>`<option value="${c.id}" ${n===i?'selected':''}>${c.name}</option>`).join('')}</select></label><label>阶位 <input data-token-step="${seat}" type="number" min="0" max="40" step="1" value="${this.view.positions[seat]}"></label></fieldset>`).join('')}<button type="button" data-mount-tokens>应用预览站位</button><output data-mount-status role="status"></output>`;
    root.querySelector('.mountain-inspector').append(test);
    this.bindEvents();''',1)
s=s.replace("      if (button.dataset.focus)",'''      if (button.hasAttribute('data-mount-tokens') && this.renderer) {
        const get=seat=>this.root.querySelector(`[data-token-step="${seat}"]`).valueAsNumber;
        const p1Step=get('P1'),p2Step=get('P2');
        if (![p1Step,p2Step].every(n=>Number.isInteger(n)&&n>=0&&n<=40)) {this.root.querySelector('[data-mount-status]').textContent='请输入0～40的整数阶位。'; return;}
        for (const seat of ['P1','P2']) this.renderer.tokens[seat].setCharacter(this.root.querySelector(`[data-token-character="${seat}"]`).value,seat);
        this.applyAuthorizedView(InformationProjector.mapPreview({p1Step,p2Step}));
        this.renderer.focusTarget('P1');
        this.root.querySelector('[data-mount-status]').textContent=`预览已更新：P1 ${p1Step}阶 / P2 ${p2Step}阶`;
      }
      if (button.dataset.focus)''');p.write_text(s,encoding='utf-8')
p=Path('src/main.js');s=p.read_text(encoding='utf-8-sig');p.write_text("import './styles/characters.css';\n"+s,encoding='utf-8')
# Strip internal method identifiers from user-facing rules copied from the design contract.
p=Path('src/resources/characters.js');s=p.read_text(encoding='utf-8');import re
s=re.sub(r'[A-Za-z][A-Za-z0-9_]*(?:、[A-Za-z][A-Za-z0-9_]*)*：','',s)
s=s.replace('ROUND_REVIEW','本轮结果回顾窗口').replace('ROUND_SKILLS','出牌前技能窗口').replace('NABERIUS','生命').replace('Game','规则系统').replace('JudgeRule','裁决').replace('owner','归属').replace('sourceOrigin=','来源为').replace('firstBombGraceUsed','首次免退标记').replace('firstDiscountUsed','首次优惠标记')
p.write_text(s,encoding='utf-8')
