import test from 'node:test';
import assert from 'node:assert/strict';
import {ServerRoomSession,GameRoomServer} from '../../server.js';
import {createServer} from 'node:http';
import {WebSocket} from 'ws';
const fake=()=>({readyState:1,messages:[],send(s){this.messages.push(JSON.parse(s));}});
test('公网权威视图、席位权限、绝对期限、超时代出及断线结果',()=>{
 const a=fake(),b=fake(),r=new ServerRoomSession('123456',a,['CH-12']);r.clients.P2=b;r.pools.P2=['CH-11'];r.start();const g=r.game;
 assert.throws(()=>r.command('P2',{name:'selectCharacter',args:['P1','CH-11']}));
 g.selectCharacter('P1','CH-12');g.selectCharacter('P2','CH-11');g.confirmCharacters();g.chooseCoinFace('P1','heads');g.tossCoin();g.finishCoin();g.quickFill();
 g.adjustBomb('P1',null,17,g.actionToken('P1'));r.publish();let v=b.messages.at(-1).data;
 assert.equal(v.ownPlaced.some(x=>x.stepIndex===17),false);assert.equal(v.ownHand.length,30);assert.equal('players' in v,false);assert.equal('ledger' in v,false);assert.equal('board' in v,false);
 const deadline=r.deadline;g.adjustBomb('P1',null,19,g.actionToken('P1'));assert.equal(r.deadline,deadline);
 r.deadline=0;r.pulse();assert.equal(g.match.phase,'ROUND_SKILLS');r.deadline=0;r.pulse();assert.equal(g.match.phase,'CARD_LOCK');
 g.lockCard('P1',g.match.players.P1.hand[0].cardId,g.actionToken('P1'));v=b.messages.at(-1).data;assert.equal(v.history.length,0);assert.equal(v.resolution,null);r.deadline=0;r.pulse();assert.equal(g.match.phase,'RESOLVE');
 r.close('P2');v=a.messages.filter(m=>m.type==='view').at(-1).data;assert.equal(v.candidate.winner,'P1');assert.equal(v.candidate.reason,'opponent_left');assert.equal(v.characters.P1,'CH-12');assert.equal(v.characters.P2,'CH-11');
});
test('真实WebSocket双端建房、满员拒绝、就绪及close三秒内推送胜利',async()=>{
 const http=createServer(),manager=new GameRoomServer(http);await new Promise(r=>http.listen(0,'127.0.0.1',r));const sockets=[];
 async function client(){const ws=new WebSocket(`ws://127.0.0.1:${http.address().port}/ws`);sockets.push(ws);ws.queue=[];ws.on('message',raw=>ws.queue.push(JSON.parse(raw)));await new Promise(r=>ws.once('open',r));return ws;}
 async function wait(ws,type){const until=Date.now()+2900;while(Date.now()<until){const i=ws.queue.findIndex(m=>m.type===type);if(i>=0)return ws.queue.splice(i,1)[0].data;await new Promise(r=>setTimeout(r,10));}throw Error('消息超时 '+type);}
 const send=(ws,type,data)=>ws.send(JSON.stringify({type,data}));
 try{const a=await client(),b=await client(),c=await client();send(a,'create',{pool:['CH-01']});const {code}=await wait(a,'joined');send(b,'join',{code,pool:['CH-02']});assert.equal((await wait(b,'joined')).seat,'P2');send(c,'join',{code,pool:['CH-02']});assert.match(await wait(c,'error'),/已满/);send(a,'ready');send(b,'ready');assert.equal((await wait(a,'view')).phase,'CHARACTER_SELECT');const at=Date.now();b.close();let v;do{v=await wait(a,'view');}while(v.phase!=='FINAL');assert.equal(v.candidate.winner,'P1');assert.ok(Date.now()-at<3000);
 }finally{for(const ws of sockets)ws.terminate();clearInterval(manager.timer);clearInterval(manager.heartbeat);for(const ws of manager.wss.clients)clearTimeout(ws.pongTimer);await new Promise(r=>manager.wss.close(r));await new Promise(r=>http.close(r));}
});
