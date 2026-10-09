import { TravelMethod } from './config';

/**
 * Asset-free audio: everything is synthesized with the Web Audio API,
 * so there are no licensing concerns and nothing to download.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: { osc: OscillatorNode; gain: GainNode } | null = null;
  private musicTimer: number | null = null;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  async resume() {
    this.init();
    if (this.ctx!.state === 'suspended') await this.ctx!.resume();
  }

  startEngine(method: TravelMethod) {
    if (!this.ctx || !this.master || method === 'walk') return;
    this.stopEngine();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = method === 'plane' ? 'sawtooth' : 'square';
    osc.frequency.value = method === 'plane' ? 140 : method === 'motor' ? 90 : 55;
    filter.type = 'lowpass';
    filter.frequency.value = method === 'plane' ? 900 : 400;
    gain.gain.value = 0.04;
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start();
    this.engine = { osc, gain };
  }

  setEngineSpeed(ratio: number) {
    if (!this.engine || !this.ctx) return;
    const base = this.engine.osc.type === 'sawtooth' ? 140 : 55;
    this.engine.osc.frequency.setTargetAtTime(base * (0.8 + ratio * 0.6), this.ctx.currentTime, 0.1);
  }

  stopEngine() {
    if (!this.engine || !this.ctx) return;
    const { osc, gain } = this.engine;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    osc.stop(this.ctx.currentTime + 0.3);
    this.engine = null;
  }

  pop() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [660, 880, 1320].forEach((f, i) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.15, t + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.25);
      o.connect(g).connect(this.master!);
      o.start(t + i * 0.07);
      o.stop(t + i * 0.07 + 0.3);
    });
  }

  startMusic() {
    if (!this.ctx || !this.master || this.musicTimer) return;
    const notes = [261.6, 329.6, 392, 523.3, 392, 329.6, 293.7, 349.2, 440, 349.2];
    let i = 0;
    const tick = () => {
      if (!this.ctx || !this.master) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = notes[i++ % notes.length];
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.4);
    };
    tick();
    this.musicTimer = window.setInterval(tick, 250);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  stopAll() {
    this.stopEngine();
    this.stopMusic();
  }
}
