// Transports carry commands and seat-filtered views only, never model snapshots.
export async function openTransport(n,host,code){
 if(!host&&!/^\d{4,6}$/.test(code))throw Error('请输入4～6位房间码');
 n.transport?.close();n.transport=null;n.remote=null;
 n.code=host?String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000):code;
 n.seat=host?'P1':'P2';n.roomState={host:host?n.id:null,guests:[],ready:{},at:Date.now()};
 let connection,peer,closed=false,last=Date.now(),sent=0;
 if(n.mode==='auto'){try{const r=await fetch('/health',{signal:AbortSignal.timeout(1200)});if(r.ok&&(await r.json()).protocol===1)n.mode='ws';}catch{}}
 const server=n.mode==='ws';
 const raw=m=>{if(connection?.send)connection.send(server?JSON.stringify(m):m);};
 const transport={server,close(){closed=true;connection?.close();peer?.destroy();},send(type,data,to){raw({type,data,to,code:n.code,from:n.id,id:crypto.randomUUID()});},pulse(){
 if(closed)return;
 if(Date.now()-sent>500){sent=Date.now();raw({type:'ping',data:sent});}
 if(n.connected&&Date.now()-last>2500){closed=true;n.connected=false;n.disconnected().catch(()=>{});}
 }};
 const receive=async m=>{
 last=Date.now();
 if(m.type==='ping'){raw({type:'pong',data:m.data});return;}
 if(m.type==='pong'){n.ping=Date.now()-m.data;return;}
 if(m.type==='error'){n.game.state.storageError=m.data;n.game.emit();return;}
 if(m.type==='welcome'){n.code=m.code;n.seat=m.seat;n.roomState=m.data;n.connected=true;n.game.emit();return;}
 if(m.type==='room'&&(!host||server)){n.roomState=m.data;n.connected=true;n.game.emit();return;}
 if(server)m.from=n.roomState.host;
 await n.receive(m);
 };
 n.transport=transport;
 try{
 if(server){
 const url=n.serverUrl||new URL('/ws',location.href).href.replace(/^http/,'ws');
 if(!/^wss?:\/\//.test(url)||location.protocol==='https:'&&!url.startsWith('wss:'))throw Error('请输入安全的 wss:// 服务器地址');
 connection=new WebSocket(url);
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('服务器连接超时')),8000);connection.onopen=()=>{clearTimeout(t);resolve();};connection.onerror=()=>{clearTimeout(t);reject(Error('服务器不可达'));};});
 connection.onmessage=e=>{try{receive(JSON.parse(e.data));}catch{}};
 raw({type:host?'create':'join',code:n.code,pool:n.game.state.profile.unlockedCharacterIds});
 }else{
 const {Peer}=await import('peerjs');
 peer=new Peer(host?'genshin-climb-room-'+n.code:undefined,{debug:0});
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('公网信令连接超时')),8000);peer.on('open',()=>{clearTimeout(t);resolve();});peer.on('error',e=>{clearTimeout(t);reject(e);});});
 const bind=c=>{
 if(connection){c.close();return;}
 connection=c;
 c.on('data',m=>{if(!m||typeof m!=='object')return;if(host&&m.type==='hello'){
 n.roomState.guests=[m.from];n.roomState.guestPool=Array.isArray(m.data)?m.data.filter(x=>/^CH-\d{2}$/.test(x)):[];n.connected=true;raw({type:'room',data:n.roomState});n.game.emit();return;
 }if(host)m.from=n.roomState.guests[0];else m.from=n.roomState.host;
 receive(m);});
 c.on('open',()=>{last=Date.now();if(!host)transport.send('hello',n.game.state.profile.unlockedCharacterIds);});
 c.on('close',()=>{if(n.connected)n.disconnected().catch(()=>{});});
 };
 if(host)peer.on('connection',bind);else {bind(peer.connect('genshin-climb-room-'+n.code,{reliable:true}));await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('P2P穿透失败，请改用服务器模式')),10000);connection.on('open',()=>{clearTimeout(t);resolve();});connection.on('error',reject);});}
 }
 n.game.emit();
 }catch(e){transport.close();n.transport=null;n.code=null;n.connected=false;if(n.mode==='auto'){n.mode='local';n.game.state.storageError='公网不可用，已回退同机模式；跨设备请选WebSocket。';return host?n.create():n.join(code);}throw e;}
}
