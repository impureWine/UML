import { Settings } from '../model/Settings.js';
import { TRACKS } from './scores.js';
import { ScoreSynthesizer, voice } from './ScoreSynthesizer.js';
import { LocalMp3Source } from './LocalMp3Source.js';

export function autoTrack(scene, highest, characters = {}) {
  if (!scene || scene.phase === 'CHARACTER_SELECT' || scene.phase === 'FINAL' || (scene.phase === 'ROUND_REVIEW' && scene.candidate)) return 0;
  if (!scene.roundNo || highest <= 15) return 1;
  if (highest <= 30) return 2;
  const ids = Object.values(characters);
  if(ids.some(id => ['CH-08','CH-09','CH-10','CH-11','CH-13'].includes(id))) return 5;
  return ids.includes('CH-03') ? 4 : 3;
}

export class GenshinAudioManager {
  constructor(onchange = () => {}) {
    this.settings=Settings.defaults(); this.currentTrack=0; this.highest=0; this.slots=[];
    this.mp3=new LocalMp3Source(); this.onchange=onchange; this.pauseIntent=false;
    this.status='等待点击启用音频'; this.generation=0;
  }
  initializeAudio() {
    if(this.ctx) return;
    const Audio=globalThis.AudioContext || globalThis.webkitAudioContext;
    if(!Audio) { this.status='浏览器不支持音频'; this.onchange(); return; }
    this.ctx=new Audio(); this.bgm=this.ctx.createGain(); this.sfx=this.ctx.createGain();
    this.bgm.connect(this.ctx.destination); this.sfx.connect(this.ctx.destination);
    this.ctx.onstatechange=()=>{ this.status=this.pauseIntent?'已暂停':this.ctx.state==='running'?'播放中':'等待点击启用音频'; this.onchange(); };
    this.applySettings(this.settings);
    this.cleanup=setInterval(()=>this.releaseFinished(),100);
  }
  async resumeFromGesture() {
    try { this.initializeAudio(); if(!this.ctx || this.pauseIntent) return; await this.ctx.resume(); if(!this.slots.length) await this.crossfade(this.currentTrack,true); }
    catch { this.status='等待点击启用音频'; this.onchange(); }
  }
  applySettings(settings) {
    this.settings={...this.settings,...settings};
    if(this.ctx) for(const [bus,volume,mute] of [[this.bgm,'bgmVolume','bgmMuted'],[this.sfx,'sfxVolume','sfxMuted']]) bus.gain.setTargetAtTime(this.settings[mute]?0:this.settings[volume]/100*.7,this.ctx.currentTime,.025);
    this.slots.forEach(s=>s.source.loop=this.settings.singleLoop);
    this.onchange();
  }
  handleScene(snapshot) {
    const scene=snapshot.setup;
    if(scene?.matchId !== this.matchId) { this.matchId=scene?.matchId; this.highest=0; this.manualLock=false; }
    if(!scene) this.heardSkills=new Set();
    this.heardSkills??=new Set();
    for(const [index,event] of (scene?.logs||[]).entries()) {
      if(event.type!=='SKILL_TRIGGERED')continue;
      const key=`${scene.matchId}:${event.roundNo}:${index}:${event.message}`;
      if(!this.heardSkills.has(key)) { this.heardSkills.add(key); this.playSfx('skill',scene.characters?.[event.seat]); }
    }
    this.scene=scene;
    // Only public, actually committed landing positions are consumed here. Animated steps call recordReachedStep.
    this.highest=Math.max(this.highest,...Object.values(scene?.positions||{zero:0}));
    this.selectAutoTrack();
  }
  recordReachedStep(step) { this.highest=Math.max(this.highest,step); this.selectAutoTrack(); }
  selectAutoTrack() { if(!this.manualLock && this.settings.autoMusic) this.crossfade(autoTrack(this.scene,this.highest,this.scene?.characters)); }
  releaseFinished() {
    if(!this.ctx) return;
    this.slots=this.slots.filter(s=>{ if(s.end!=null && this.ctx.currentTime>=s.end) { s.source.stop(); s.gain.disconnect(); return false; } return true; });
  }
  async crossfade(id,force=false) {
    if(this.disposed || (!force && id===this.currentTrack)) return;
    this.currentTrack=id; const generation=++this.generation; this.onchange();
    if(!this.ctx) return;
    const buffer=await this.mp3.prepare(this.ctx,id,TRACKS[id].url);
    if(this.disposed || generation!==this.generation) return;
    const ctx=this.ctx, now=ctx.currentTime, gain=ctx.createGain(); gain.gain.setValueAtTime(0,now); gain.gain.linearRampToValueAtTime(1,now+1.5); gain.connect(this.bgm);
    const ended=()=>{ if(this.slots.at(-1)?.gain===gain) this.crossfade((id+1)%6,true); };
    let source;
    try { source=buffer ? this.mp3.play(ctx,gain,buffer,this.settings.singleLoop,ended) : new ScoreSynthesizer(ctx,gain,id,{loop:this.settings.singleLoop,onended:ended}); }
    catch { source=new ScoreSynthesizer(ctx,gain,id,{loop:this.settings.singleLoop,onended:ended}); }
    // Rapid switches release older outgoing slots; at most two sessions remain.
    while(this.slots.length>1) { const old=this.slots.shift(); old.source.stop(); old.gain.disconnect(); }
    for(const slot of this.slots) { slot.gain.gain.cancelAndHoldAtTime(now); slot.gain.gain.linearRampToValueAtTime(0,now+1.5); slot.end=now+1.5; }
    this.slots.push({gain,source}); this.sourceKind=buffer?'MP3':'内置合成'; this.onchange();
  }
  pause() { this.pauseIntent=true; this.ctx?.suspend(); this.status='已暂停'; this.onchange(); }
  play() { this.pauseIntent=false; return this.resumeFromGesture(); }
  previousTrack() { this.manualLock=true; return this.crossfade((this.currentTrack+5)%6,true); }
  nextTrack() { this.manualLock=true; return this.crossfade((this.currentTrack+1)%6,true); }
  restoreAuto() { this.manualLock=false; this.settings.autoMusic=true; this.selectAutoTrack(); this.onchange(); }
  getTrackInfo(id=this.currentTrack) {
    const track=TRACKS[id], fileName=this.mp3.fileNames.get(id);
    return fileName
      ? { name:fileName.replace(/\.mp3$/i,''), detail:`本地 MP3 · ${fileName}`, fileName }
      : { name:track.name, detail:`${track.name} · ${track.title}`, fileName:null };
  }
  async mountLocalMp3(id,file) {
    this.initializeAudio(); if(!this.ctx)return;
    await this.mp3.mount(this.ctx,id,file);
    this.onchange();
    if(id===this.currentTrack) await this.crossfade(id,true);
  }
  playSfx(kind, characterId) {
    if(!this.ctx || this.ctx.state!=='running' || this.settings.sfxMuted) return;
    if((this.activeSfx||0)>=12)return;
    this.activeSfx=(this.activeSfx||0)+1; setTimeout(()=>this.activeSfx--,900);
    const patterns={button:[76],coin:[88,93,88,100],draft:[74,79],bomb:[45,38],reveal:[60,67,72],jump:[72,79],explosion:[35,29,24],victory:[60,64,67,72,79],skill:[72,76,79]};
    const notes=kind==='skill'?[48+Number(characterId?.slice(-2)||1),60+Number(characterId?.slice(-2)||1),72+Number(characterId?.slice(-2)||1)]:patterns[kind]||patterns.button;
    notes.forEach((n,i)=>voice(this.ctx,this.sfx,n,this.ctx.currentTime+i*.075,kind==='victory'?.65:.22,kind==='explosion'?'strings':'harp',.12));
  }
  dispose() { this.disposed=true; this.generation++; clearInterval(this.cleanup); this.slots.forEach(s=>s.source.stop()); this.slots=[]; this.ctx?.close(); this.mp3.buffers.clear(); }
}
