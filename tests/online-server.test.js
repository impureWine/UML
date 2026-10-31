import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
test('真实WS双席：就绪、越权拒绝、视图隔离、断线判胜',async()=>{
 const proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3049'},stdio:['ignore','pipe','pipe']});
 const clients=[];
 try{
 await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('exit',()=>reject(Error('server exited')));});
 async function client(){const ws=new WebSocket('ws://127.0.0.1:3049/ws');clients.push(ws);ws.messages=[];ws.on('message',b=>ws.messages.push(JSON.parse(b)));await new Promise(r=>ws.once('open',r));ws.write=m=>ws.send(JSON.stringify(m));return ws;}
 async function wait(ws,type,p=()=>true){for(let i=0;i<100;i++){const m=ws.messages.find(m=>m.type===type&&p(m));if(m)return m;await new Promise(r=>setTimeout(r,20));}throw Error('timeout '+type);}
 const a=await client(),b=await client();a.write({type:'create',code:'234567'});await wait(a,'welcome');b.write({type:'join',code:'234567'});await wait(b,'welcome');
 a.write({type:'ready'});b.write({type:'ready'});let v=(await wait(b,'view')).data;
 b.write({type:'command',data:{name:'selectCharacter',args:['P1','CH-01'],token:v.token}});assert.match((await wait(b,'error')).data,/本人/);
 a.write({type:'command',data:{name:'selectCharacter',args:['P1','CH-01'],token:v.token}});b.write({type:'command',data:{name:'selectCharacter',args:['P2','CH-02'],token:v.token}});
 await wait(a,'view',m=>m.data.characters.P2==='CH-02');
 a.write({type:'command',data:{name:'confirmCharacters',args:[],token:v.token}});
 v=(await wait(b,'view',m=>m.data.phase==='COIN')).data;
 assert.equal(v.ownHand,null);assert.equal(v.ownBombs,null);assert.equal(v.ledger,undefined);
 a.close();const end=(await wait(b,'view',m=>m.data.phase==='FINAL')).data;assert.equal(end.candidate.winner,'P2');
 }finally{for(const ws of clients)ws.terminate();proc.kill();}
});

