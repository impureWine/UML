import fs from 'node:fs';
const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/utils/InformationProjector.js',s=>s.replace('  static preparation(m) {',`  static preparationSafe(m,seat) {
 const v=this.preparation({...m,turn:seat,covered:false});delete v.skillBombs;
 if(m.phase==='DRAFT')v.remainingCounts=m.deck.getCounts();return structuredClone(v);
 }
  static preparation(m) {`));
edit('src/controller/Game.js',s=>`import { AIPlayer } from '../model/AIPlayer.js';\nimport { AIController } from './AIController.js';\n`+s.replace('    this.unsubscribeStorage =','    this.aiController = new AIController(this);\n    this.unsubscribeStorage =').replace('new Player(seat,m.characters[seat])',"new (m.mode==='ai'&&seat==='P2'?AIPlayer:Player)(seat,m.characters[seat])").replace('    this.unsubscribeStorage?.();','    this.aiController?.dispose();this.network?.dispose();\n    this.unsubscribeStorage?.();').replace('  async setCameraAutoFollow(value) {',`  async saveSettings(patch){this.requireHome();this.state.profile=await this.accountManager.saveSettings(patch);this.emit();}
  async setCameraAutoFollow(value) {`));
edit('src/view/OpeningPanel.js',s=>s.replaceAll('AI（本轮手动配置与选牌）','AI').replace('AI决策将在迭代10接入；本轮可手动代选或快速补齐。','确认后 AI 将自动选牌、准备及对战。'));
