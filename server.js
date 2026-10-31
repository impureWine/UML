import express from 'express';
import {createServer} from 'node:http';
import {WebSocketServer} from 'ws';
import {Game} from './src/controller/Game.js';
import {NetworkManager,COMMANDS} from './src/utils/NetworkManager.js';
const app=express();app.get('/health',(_,r)=>r.json({ok:true,protocol:1}));app.use(express.static('dist'));
const http=createServer(app),wss=new WebSocketServer({server:http,path:'/ws',maxPayload:16384});
const rooms=new Map();
const send=(ws,m)=>{if(ws?.readyState===1)ws.send(JSON.stringify(m));};
function create(code){
 const profile={accountId:'server',unlockedCharacterIds:Array.from({length:12},(_,i)=>'CH-'+String(i+1).padStart(2,'0')),settings:{}};
 const accounts={observeChanges:()=>()=>{},getCurrentProfile:()=>profile,commitCompletedMatch:async()=>profile};
 const game=new Game(accounts);game.state={...game.state,phase:'HOME',page:'online',profile};
 const room={code,clients:{},state:{host:'authority',guests:['guest'],ready:{},at:Date.now(),guestPool:profile.unlockedCharacterIds},game};
 const n=Object.create(NetworkManager.prototype);Object.assign(n,{game,code,seat:'P1',id:'authority',original:{},transport:{pulse(){}},roomState:room.state});game.network=n;
 for(const name of COMMANDS)n.original[name]=game[name].bind(game);
 n.publish=()=>{for(const seat of ['P1','P2'])send(room.clients[seat],{type:'view',code,from:'authority',id:crypto.randomUUID(),data:n.project(game.getSnapshot(true,seat).setup,seat)});};
 n.result=async(c,m)=>({winner:c.winner,endReason:c.reason,matchId:m.matchId});
 game.subscribe(()=>{if(game.match)n.publish();});
 room.n=n;rooms.set(code,room);return room;
}
function broadcast(room){for(const seat of ['P1','P2'])send(room.clients[seat],{type:'room',data:room.state});}
function drop(ws){const room=ws.room;if(!room||room.ended)return;room.ended=true;
 if(room.game.match){room.game.match.candidate={winner:ws.seat==='P1'?'P2':'P1',reason:'opponent_left'};room.game.match.phase='FINAL';room.n.publish();}
 rooms.delete(room.code);
 for(const c of Object.values(room.clients))if(c!==ws)setTimeout(()=>c.close(),500);
}
 wss.on('connection',ws=>{ws.last=Date.now();ws.on('close',()=>drop(ws));ws.on('error',()=>{});ws.on('message',async bytes=>{try{
 const m=JSON.parse(bytes.toString());ws.last=Date.now();
 ws.count=(ws.count||0)+1;if(ws.count>100)throw Error('请求过快');
 if(m.type==='ping'){send(ws,{type:'pong',data:m.data});return;}
 if(!ws.room){if(!['create','join'].includes(m.type)||!/^\d{4,6}$/.test(m.code))throw Error('房间请求无效');
 if(m.type==='create'&&rooms.has(m.code))throw Error('房间码冲突，请重建');if(rooms.size>=200)throw Error('服务器繁忙');
 const room=m.type==='create'?create(m.code):rooms.get(m.code);if(!room||room.ended)throw Error('房间不存在');const seat=m.type==='create'?'P1':'P2';if(room.clients[seat])throw Error('房间已满');
 ws.room=room;ws.seat=seat;room.clients[seat]=ws;
 // Local-account unlock claims are not trusted by the server: only base characters.
 send(ws,{type:'welcome',code:room.code,seat,data:room.state});broadcast(room);return;
 }
 const {room,seat}=ws;if(room.ended)return;
 if(m.type==='leave'){drop(ws);ws.close();return;}
 if(m.type==='ready'){room.state.ready[seat]=true;broadcast(room);if(room.state.ready.P1&&room.state.ready.P2&&!room.game.match)room.game.startSetup();return;}
 if(m.type==='command'){
 if(!Array.isArray(m.data?.args)||m.data.args.length>8)throw Error('参数无效');
 if(m.data.token!==room.game.actionToken(seat))throw Error('操作已过期');
 await room.n.execute(seat,m.data.name,m.data.args);
 }
 }catch(e){send(ws,{type:'error',data:e.message});}});});
setInterval(()=>{for(const ws of wss.clients){ws.count=0;if(Date.now()-ws.last>2500){drop(ws);ws.terminate();}}for(const room of rooms.values()){try{room.n.pulse();}catch(e){console.error(e.message);}}},250).unref();
http.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Climb40 listening'));
