import test from 'node:test';
import assert from 'node:assert/strict';
import { autoTrack, GenshinAudioManager } from '../../src/audio/GenshinAudioManager.js';
import { LocalMp3Source } from '../../src/audio/LocalMp3Source.js';
import { SCORES, TRACKS } from '../../src/audio/scores.js';
import { Settings } from '../../src/model/Settings.js';

test('单曲循环默认开启，仍允许账号明确关闭',()=>{
  assert.equal(Settings.defaults().singleLoop,true);
  const a=new GenshinAudioManager();assert.equal(a.settings.singleLoop,true);
  a.applySettings({singleLoop:false});assert.equal(a.settings.singleLoop,false);a.dispose();
});

test('本地曲目信息按挂载槽保存，切曲不串名，坏文件回退不残留文件名',async()=>{
  const a=new GenshinAudioManager(), ctx={decodeAudioData:async bytes=>bytes};
  const name='陈致逸 - 自选曲目.mp3';
  assert.equal(await a.mp3.mount(ctx,2,{name,arrayBuffer:async()=>new ArrayBuffer(8)}),true);
  assert.equal(a.getTrackInfo(2).name,'陈致逸 - 自选曲目');
  assert.equal(a.getTrackInfo(2).fileName,name);
  assert.equal(a.getTrackInfo(0).name,TRACKS[0].name);
  a.currentTrack=2;assert.equal(a.getTrackInfo().fileName,name);
  await a.mp3.mount({decodeAudioData:async()=>{throw Error('bad');}},2,{name:'坏文件.mp3',arrayBuffer:async()=>new ArrayBuffer(0)});
  assert.equal(a.getTrackInfo().fileName,null);assert.equal(a.getTrackInfo().name,TRACKS[2].name);a.dispose();
});

test('连续挂载的解码结果乱序返回时，较早文件不能覆盖最新文件信息',async()=>{
  const m=new LocalMp3Source();let finish;
  const first=m.mount({decodeAudioData:()=>new Promise(resolve=>finish=resolve)},0,{name:'旧.mp3',arrayBuffer:async()=>new ArrayBuffer(1)});
  await Promise.resolve();
  const buffer=new ArrayBuffer(2);
  await m.mount({decodeAudioData:async()=>buffer},0,{name:'新.mp3',arrayBuffer:async()=>buffer});
  finish(new ArrayBuffer(1));await first;
  assert.equal(m.fileNames.get(0),'新.mp3');assert.equal(m.buffers.get(0),buffer);
});

test('六曲区间及角色优先级，终局覆盖高区间',()=>{
  const scene={phase:'CARD_LOCK',roundNo:1};
  for(const [step,id] of [[0,1],[15,1],[16,2],[30,2],[31,3],[39,3]]) assert.equal(autoTrack(scene,step),id);
  assert.equal(autoTrack(scene,35,{P1:'CH-03'}),4);
  for(const id of ['CH-08','CH-09','CH-10','CH-11','CH-13']) assert.equal(autoTrack(scene,35,{P1:'CH-03',P2:id}),5);
  assert.equal(autoTrack({...scene,phase:'ROUND_REVIEW',candidate:{}},39),0);
  assert.equal(autoTrack({phase:'PREPARATION'},39),1);
});
test('达到高阶后跌落及回溯保留区间；手动期间继续记高度，新局清锁',()=>{
  const a=new GenshinAudioManager();
  const snapshot=(id,positions)=>({setup:{matchId:id,phase:'CARD_LOCK',roundNo:1,positions}});
  a.handleScene(snapshot('a',{P1:15})); a.manualLock=true; a.recordReachedStep(35);
  a.handleScene(snapshot('a',{P1:5})); assert.equal(a.highest,35);assert.equal(a.currentTrack,1);
  a.restoreAuto();assert.equal(a.currentTrack,3);
  a.handleScene(snapshot('b',{P1:0}));assert.equal(a.highest,0);assert.equal(a.manualLock,false);assert.equal(a.currentTrack,1);
  a.dispose();
});
test('坏文件静默标记合成回退，不抛错或继续请求默认MP3',async()=>{
  const m=new LocalMp3Source(); const ctx={decodeAudioData:async()=>{throw Error('bad')}};
  assert.equal(await m.mount(ctx,0,{arrayBuffer:async()=>new ArrayBuffer(0)}),false);
  assert.equal(await m.prepare(ctx,0,'unreachable'),null);
});
test('六份乐谱拥有独立旋律、速度及多声部基础数据，六份录音均为真实文件',async()=>{
  const fs=await import('node:fs/promises');
  assert.equal(new Set(SCORES.map(s=>s.melody.join(','))).size,6);
  for(const t of TRACKS) assert.ok((await fs.stat(`public${t.url}`)).size>1000000);
});
test('播放意图与静音分离，手动六曲遍历后恢复自动',()=>{
  const a=new GenshinAudioManager(); a.pause(); a.nextTrack(); a.applySettings({bgmMuted:true});
  assert.equal(a.pauseIntent,true); assert.equal(a.currentTrack,1); assert.equal(a.manualLock,true);
  a.previousTrack();assert.equal(a.currentTrack,0);a.restoreAuto();assert.equal(a.manualLock,false);assert.equal(a.pauseIntent,true);a.dispose();
});

test('公网音频下载超过7秒仍可完成，不在旧5秒阈值中止',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const oldFetch=globalThis.fetch;let finish,signal;
  const bytes=new ArrayBuffer(8);
  globalThis.fetch=async(_url,options)=>{signal=options.signal;return {ok:true,arrayBuffer:()=>new Promise(resolve=>{finish=resolve;})};};
  try {
    const m=new LocalMp3Source();const pending=m.prepare({decodeAudioData:async b=>b},0,'/audio/M-01.mp3');
    await Promise.resolve();await Promise.resolve();
    t.mock.timers.tick(7000);assert.equal(signal.aborted,false);
    finish(bytes);assert.equal(await pending,bytes);
  } finally {globalThis.fetch=oldFetch;t.mock.timers.reset();}
});
