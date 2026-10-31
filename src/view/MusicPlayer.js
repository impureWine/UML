import { TRACKS } from '../audio/scores.js';

const paths = {
  music: '<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="5.5" cy="18.5" rx="3.5" ry="2.5"/><ellipse cx="16.5" cy="16.5" rx="3.5" ry="2.5"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  next: '<path d="m5 5 10 7L5 19ZM19 5v14"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;

export class MusicPlayer {
  constructor(root,audio,game) {
    this.root=root; this.audio=audio; this.game=game; this.events=new AbortController();
    root.setAttribute('aria-label','旋曜玉帛音乐播放器');
    root.innerHTML=`
      <button type="button" class="music-launcher" aria-expanded="false" aria-controls="gramophone-panel" aria-label="展开旋曜玉帛音乐设置" data-music="toggle">
        <span class="record-disc">${icon('music')}</span>
        <span class="music-description"><strong>旋曜玉帛</strong><small data-track></small></span>
      </button>
      <button type="button" class="music-transport" data-music="play" aria-label="播放">${icon('play')}</button>
      <button type="button" class="music-transport" data-music="next" aria-label="下一首">${icon('next')}</button>
      <section id="gramophone-panel" class="gramophone-controls" aria-label="旋曜玉帛音乐设置" hidden>
        <header class="gramophone-heading"><h2>旋曜玉帛</h2><button type="button" data-music="close" aria-label="收起音乐设置">收起</button></header>
        <p class="gramophone-track" data-panel-track></p>
        <p data-music-state role="status"></p>
        <nav aria-label="曲目控制"><button type="button" data-music="previous">上一首</button><button type="button" data-music="play">播放</button><button type="button" data-music="next">下一首</button><button type="button" data-music="auto">恢复自动</button></nav>
        <label class="music-check"><input type="checkbox" data-setting="singleLoop"><span>单曲循环</span></label>
        <div class="music-volume-row"><label for="music-bgm-volume">音乐音量</label><input id="music-bgm-volume" type="range" min="0" max="100" data-setting="bgmVolume"><output data-volume="bgmVolume"></output></div>
        <label class="music-check"><input type="checkbox" data-setting="bgmMuted"><span>音乐静音</span></label>
        <div class="music-volume-row"><label for="music-sfx-volume">音效音量</label><input id="music-sfx-volume" type="range" min="0" max="100" data-setting="sfxVolume"><output data-volume="sfxVolume"></output></div>
        <label class="music-check"><input type="checkbox" data-setting="sfxMuted"><span>音效静音</span></label>
        <label class="music-file-field"><span>挂载目标曲目</span><select data-mount-track>${TRACKS.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></label>
        <p data-mount-info></p>
        <label class="music-file-field"><span>选择本地 MP3</span><input type="file" accept="audio/mpeg,.mp3" data-mp3></label>
        <output data-music-error role="alert"></output>
      </section>`;
    this.setExpanded = expanded => {
      root.querySelector('.gramophone-controls').hidden = !expanded;
      const launcher = root.querySelector('.music-launcher');
      launcher.setAttribute('aria-expanded', String(expanded));
      launcher.setAttribute('aria-label', `${expanded ? '收起' : '展开'}旋曜玉帛音乐设置`);
    };
    root.addEventListener('click',e=>{ const action=e.target.closest('[data-music]')?.dataset.music;
      if(action==='toggle') this.setExpanded(root.querySelector('.gramophone-controls').hidden);
      if(action==='close') { this.setExpanded(false); root.querySelector('.music-launcher').focus(); }
      if(action==='play') audio.pauseIntent||audio.ctx?.state!=='running'?audio.play():audio.pause();
      if(action==='previous')audio.previousTrack(); if(action==='next')audio.nextTrack();
      if(action==='auto'){audio.restoreAuto();this.save({autoMusic:true});}
    },{signal:this.events.signal});
    document.addEventListener('click',e=>{if(!root.contains(e.target))this.setExpanded(false);},{signal:this.events.signal});
    root.addEventListener('keydown',e=>{if(e.key==='Escape'){this.setExpanded(false);root.querySelector('.music-launcher').focus();}},{signal:this.events.signal});
    root.addEventListener('input',e=>{if(e.target.type==='range')root.querySelector(`[data-volume="${e.target.dataset.setting}"]`).textContent=`${e.target.value}%`;},{signal:this.events.signal});
    root.addEventListener('change',e=>{const key=e.target.dataset.setting;if(key)this.save({[key]:e.target.type==='range'?Number(e.target.value):e.target.checked});
      if(e.target.matches('[data-mount-track]')) { root.querySelector('[data-mp3]').value=''; this.updateMountInfo(); }
      if(e.target.matches('[data-mp3]')&&e.target.files[0]) {
        const id=Number(root.querySelector('[data-mount-track]').value), file=e.target.files[0];
        audio.mountLocalMp3(id,file).then(()=>this.updateMountInfo());
      }
    },{signal:this.events.signal});
    this.update();
  }
  async save(patch) {
    try { const profile=await this.game.accountManager.saveSettings(patch); this.game.state.profile=profile; this.audio.applySettings(profile.settings); this.game.emit(); this.root.querySelector('[data-music-error]').textContent=''; }
    catch(e){this.root.querySelector('[data-music-error]').textContent=e.message;}
  }
  update() {
    const a=this.audio, info=a.getTrackInfo();
    this.root.querySelector('[data-track]').textContent=info.name;
    this.root.querySelector('[data-track]').title=info.detail;
    this.root.querySelector('[data-panel-track]').textContent=info.detail;
    if(this.lastTrack!==a.currentTrack) {
      this.lastTrack=a.currentTrack;
      this.root.querySelector('[data-mount-track]').value=String(a.currentTrack);
      this.root.querySelector('[data-mp3]').value='';
    }
    this.updateMountInfo();
    this.root.querySelector('[data-music-state]').textContent=`${a.status} · ${a.sourceKind||'待启用'} · ${a.manualLock?'手动锁曲':a.settings.autoMusic?'自动切歌':'自动关闭'}`;
    const playing=!a.pauseIntent&&a.ctx?.state==='running';
    for(const button of this.root.querySelectorAll('[data-music="play"]')) {
      button.setAttribute('aria-label',playing?'暂停':'播放');
      if(button.classList.contains('music-transport'))button.innerHTML=icon(playing?'pause':'play');
      else button.textContent=playing?'暂停':'播放';
    }
    for(const el of this.root.querySelectorAll('[data-setting]')) { const value=a.settings[el.dataset.setting]; if(el.type==='range')el.value=value;else el.checked=value; }
    for(const output of this.root.querySelectorAll('[data-volume]'))output.textContent=`${a.settings[output.dataset.volume]}%`;
  }
  updateMountInfo() {
    const id=Number(this.root.querySelector('[data-mount-track]').value), info=this.audio.getTrackInfo(id);
    this.root.querySelector('[data-mount-info]').textContent=info.fileName?`已挂载：${info.fileName}`:'未挂载本地文件，使用默认音源';
  }
  dispose(){this.events.abort();}
}
