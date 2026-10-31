import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../../src/controller/Game.js';
import { GameView } from '../../src/view/GameView.js';
import { NetworkManager } from '../../src/utils/NetworkManager.js';

async function hostFixture(guestReady) {
  const profile={accountId:'host-account',unlockedCharacterIds:['CH-01','CH-02']};
  const game=new Game({observeChanges:()=>()=>{},login:async()=>profile,getCurrentProfile:()=>profile});
  await game.submitAuth({});game.navigate('online');
  const room={host:'host',guests:['guest'],ready:{P1:false,P2:guestReady}};
  const network=Object.create(NetworkManager.prototype);
  Object.assign(network,{game,seat:'P1',code:'123456',id:'host',seen:new Set(),room:()=>room,write:()=>{},lock:async fn=>fn(),send:()=>{}});
  game.ensureNetwork=()=>network;
  // Keep actual Game projections and startSetup; fake only the DOM paint.
  const screen={page:'',paints:[]};
  game.subscribe(snapshot=>{screen.page=snapshot.setup?'CHARACTER_SELECT':'LOBBY';screen.paints.push(screen.page);});
  const view={game,main:{querySelector:()=>null},renderOnline:()=>{screen.page='LOBBY';screen.paints.push('STALE_LOBBY');}};
  return {game,network,view,room,screen};
}

test('房主后就绪：异步按钮完成不得把已启动的选角页覆盖为大厅',async()=>{
 const {game,view,screen}=await hostFixture(true);
 try{await GameView.prototype.handleRoomAction.call(view,'ready');assert.equal(game.match.phase,'CHARACTER_SELECT');assert.equal(screen.page,'CHARACTER_SELECT');assert.ok(!screen.paints.includes('STALE_LOBBY'));}finally{game.dispose();}
});
test('房主先就绪：等待客人后启动，重复ready消息不重建比赛',async()=>{
 const {game,network,view,room,screen}=await hostFixture(false);
 try{await GameView.prototype.handleRoomAction.call(view,'ready');assert.equal(screen.page,'LOBBY');assert.equal(game.match,null);
 room.ready.P2=true;const message={code:network.code,from:'guest',id:'ready-one',type:'ready',data:{}};
 await network.receive(message);assert.equal(screen.page,'CHARACTER_SELECT');const match=game.match;
 await network.receive(message);await network.receive({...message,id:'ready-two'});assert.equal(game.match,match);assert.equal(screen.page,'CHARACTER_SELECT');
 }finally{game.dispose();}
});
test('异步ready恢复前其他通知启动比赛，回调完成后仍保持选角',async()=>{
 const {game,network,view,room,screen}=await hostFixture(false);
 let resume;const ready=network.ready.bind(network);network.ready=async()=>{await ready();await new Promise(resolve=>{resume=resolve;});};
 try{const pending=GameView.prototype.handleRoomAction.call(view,'ready');while(!resume)await Promise.resolve();room.ready.P2=true;network.start();assert.equal(screen.page,'CHARACTER_SELECT');resume();await pending;assert.equal(screen.page,'CHARACTER_SELECT');}finally{game.dispose();}
});
test('房间退出回到首页，不被异步按钮回调覆盖为大厅',async()=>{
 const {game,network,view,screen}=await hostFixture(false);
 network.disconnected=async()=>{game.state.page='home';game.emit();screen.page='HOME';};
 try{await GameView.prototype.handleRoomAction.call(view,'leave');assert.equal(screen.page,'HOME');assert.equal(game.state.page,'home');}finally{game.dispose();}
});
test('大厅渲染保护：已有比赛或已经离开联机页面时不改动DOM',()=>{
 for(const snapshot of [{page:'online',setup:{phase:'CHARACTER_SELECT'}},{page:'home'}]){
 const view={game:{getSnapshot:()=>snapshot},main:{innerHTML:'existing-screen',className:'existing'}};
 GameView.prototype.renderOnline.call(view);assert.equal(view.main.innerHTML,'existing-screen');assert.equal(view.main.className,'existing');
 }
});
