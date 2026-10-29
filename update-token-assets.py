from pathlib import Path
import zipfile,json
root=Path('.')
assets=root/'public/images/elements';assets.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile('D:/大学/面向对象文档/元素图标.zip') as z:
 for symbol,key in zip('风岩雷草水火冰',['anemo','geo','electro','dendro','hydro','pyro','cryo']):
  entry=next(n for n in z.namelist() if n.endswith('/'+symbol+'.svg'))
  (assets/(key+'.svg')).write_bytes(z.read(entry))
replacements={'时间之影':'「时之执政」','空间之执政':'「空之执政」','死亡之执政':'「死之执政」','生命之执政':'「生之执政」','黄金 · 炼金术士':'「黄金」','“黄金”莱茵多特':'莱茵多特','吞噬生之执政':'「黄金」/「生之执政」'}
for symbol in '风岩雷草水火冰': replacements[symbol+'之神']=symbol+'之魔神'
for p in (root/'src').rglob('*.js'):
 s=p.read_text(encoding='utf-8-sig')
 for a,b in replacements.items():s=s.replace(a,b)
 p.write_text(s,encoding='utf-8')
p=root/'src/resources/characters.js';s=p.read_text(encoding='utf-8')
for i,key in enumerate(['anemo','geo','electro','dendro','hydro','pyro','cryo']):
 s=s.replace('"id": "CH-'+str(i+1).zfill(2)+'",','"id": "CH-'+str(i+1).zfill(2)+'",\n    "iconUrl": "/images/elements/'+key+'.svg",')
s=s.replace('"color": "#bce9c4"','"color": "#dfc276"');p.write_text(s,encoding='utf-8')
p=root/'src/view/CharacterTokenRenderer.js';s=p.read_text(encoding='utf-8');s=s.replace('return c.paths.map', 'if(c.iconUrl) return `<img class="element-icon" src="${c.iconUrl}" alt="" aria-hidden="true">`;return c.paths.map')
s=s.replace("preview=true}={}){this.root=root;", "preview=true,step=0}={}){this.step=step;this.root=root;")
s=s.replace('<span class="token-seat">','<span class="token-step">第 <b data-token-grade>${this.step}</b> 阶</span><span class="token-seat">')
s=s.replace(' play(state)', ''' setStep(step){if(!Number.isInteger(step)||step<0||step>40)throw new TypeError('阶位必须为0～40整数');this.step=step;this.root.querySelector('[data-token-grade]').textContent=String(step);}
 play(state)''');p.write_text(s,encoding='utf-8')
p=root/'src/view/MountainMapRenderer.js';s=p.read_text(encoding='utf-8').replace('const token=this.tokens[seat], el=token.root, p=anchors[i];','const token=this.tokens[seat], el=token.root, p=anchors[i];\n      token.setStep(this.publicView?.positions[seat] ?? 0);');p.write_text(s,encoding='utf-8')
p=root/'src/styles/characters.css';s=p.read_text(encoding='utf-8');s=s.replace('linear-gradient(90deg,#161b27 0%,#423a27 48%,#d5f3df 52%,#f6fff0 100%)','linear-gradient(130deg,#10131c,#3b3020 55%,#161b27)');s=s.replace('color:#65b18b','color:#dfc276').replace('color:#479e70','color:#dfc276');s+='''
/* Element files are used intact; fixed pixel sizing is independent of map zoom. */
.element-icon{display:block;object-fit:contain;flex-shrink:0;width:48px;height:48px}
.character-list .element-icon{width:27px;height:27px}
.token-aura .element-icon{width:70%;height:70%}
.map-character-anchor .element-icon{width:24px;height:24px}
.token-step{position:absolute;top:-34px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:2px 12px;border:1px solid #d5b86b;border-radius:9px;background:#182e3af2;color:#fff2c9;font-size:12px;line-height:18px;letter-spacing:1px}
.map-character-anchor .token-plaque{height:113px;box-sizing:border-box}
.map-character-anchor .token-plaque strong{font-size:15px;white-space:nowrap}
.map-character-anchor .token-plaque small{white-space:nowrap}
.fusion-token .token-plaque{box-shadow:0 8px 0 #15130ed9,0 9px 0 #b3985d,0 22px 25px #071c3155,inset 0 0 26px #dfc27640}
''';p.write_text(s,encoding='utf-8')
