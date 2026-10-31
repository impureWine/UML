import { SCORES } from './scores.js';

export function voice(ctx, output, midi, time, duration, instrument = 'piano', level = .12, onfinished = () => {}) {
  if (!midi) return;
  const nodes = [];
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(.0001, time);
  envelope.gain.exponentialRampToValueAtTime(level, time + .018);
  envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
  envelope.connect(output);
  const harmonics = instrument === 'strings' ? [1, .22, .12] : instrument === 'guzheng' ? [1, .4, .2, .08] : [1, .2, .06];
  harmonics.forEach((gain, i) => {
    const osc = ctx.createOscillator(), amp = ctx.createGain();
    osc.type = instrument === 'strings' ? 'triangle' : 'sine';
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12) * (i + 1);
    amp.gain.value = gain; osc.connect(amp); amp.connect(envelope);
    osc.start(time); osc.stop(time + duration);
    osc.onended = () => { osc.disconnect(); amp.disconnect(); };
    nodes.push(osc);
  });
  let left = nodes.length;
  for (const osc of nodes) { const end = osc.onended; osc.onended = () => { end(); if (!--left) { envelope.disconnect(); onfinished(); } }; }
  return { stop() { nodes.forEach(n => { try { n.stop(); } catch {} }); } };
}

export class ScoreSynthesizer {
  constructor(ctx, output, id, { loop = false, onended = () => {} } = {}) {
    this.ctx = ctx; this.output = output; this.score = SCORES[id]; this.loop = loop; this.onended = onended;
    this.cursor = 0; this.next = ctx.currentTime + .04; this.voices = new Set();
    this.timer = setInterval(() => this.scheduleAhead(), 30); this.scheduleAhead();
  }
  scheduleAhead() {
    const {ctx, score:s} = this, beat = 60 / s.bpm;
    while (this.next < ctx.currentTime + .18 && !this.done) {
      const i = this.cursor % 64, chord = [0,5,7,0][Math.floor(i / 16)];
      const add = (note, duration, type, volume) => {
        let v; v = voice(ctx, this.output, note, this.next, duration, type, volume, () => this.voices.delete(v));
        if(v) this.voices.add(v);
      };
      add(s.melody[i % 16], beat * .95, s.instrument, .09);
      add(s.root + chord + [12,19,24,19][i % 4], beat * .85, 'harp', .045);
      if (i % 4 === 0) { add(s.root + chord, beat * 3.8, 'strings', .045); add(s.root + chord + 7, beat * 3.8, 'strings', .025); }
      this.next += beat / 2; this.cursor++;
      if(this.cursor === 64) { if(this.loop) this.cursor = 0; else { this.done = true; this.endTime = this.next + beat * 4; } }
    }
    if(this.done && ctx.currentTime > this.endTime) { this.stop(); this.onended(); }
  }
  stop() { clearInterval(this.timer); this.voices.forEach(v => v.stop()); this.voices.clear(); }
}
