import { MICS, type AudioFx } from "./types";

// Professional mixing graph: every media element passes through
// clean-up → mic EQ → compressor → gain (up to 1000%) → limiter → fade → master.
// The limiters keep heavy amplification loud without digital clipping.
interface Chain { hp: BiquadFilterNode; low: BiquadFilterNode; pres: BiquadFilterNode; air: BiquadFilterNode; comp: DynamicsCompressorNode; gain: GainNode; lim: DynamicsCompressorNode; fade: GainNode }

export class Mixer {
  ctx: AudioContext;
  dest: MediaStreamAudioDestinationNode;
  master: GainNode;
  private chains = new Map<HTMLMediaElement, Chain>();
  constructor() {
    this.ctx = new AudioContext({ latencyHint: "interactive", sampleRate: 48000 });
    this.master = this.ctx.createGain();
    const lim = this.ctx.createDynamicsCompressor();
    lim.threshold.value = -1; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.08;
    this.master.connect(lim); lim.connect(this.ctx.destination);
    this.dest = this.ctx.createMediaStreamDestination(); lim.connect(this.dest);
  }
  resume() { return this.ctx.resume(); }
  private chain(el: HTMLMediaElement) {
    let c = this.chains.get(el);
    if (c) return c;
    const x = this.ctx;
    const src = x.createMediaElementSource(el);
    c = { hp: x.createBiquadFilter(), low: x.createBiquadFilter(), pres: x.createBiquadFilter(), air: x.createBiquadFilter(), comp: x.createDynamicsCompressor(), gain: x.createGain(), lim: x.createDynamicsCompressor(), fade: x.createGain() };
    c.hp.type = "highpass"; c.low.type = "lowshelf"; c.low.frequency.value = 140; c.pres.type = "peaking"; c.pres.frequency.value = 4200; c.pres.Q.value = 0.9; c.air.type = "highshelf"; c.air.frequency.value = 11000;
    c.lim.threshold.value = -2; c.lim.knee.value = 2; c.lim.ratio.value = 20; c.lim.attack.value = 0.002; c.lim.release.value = 0.06;
    src.connect(c.hp); c.hp.connect(c.low); c.low.connect(c.pres); c.pres.connect(c.air); c.air.connect(c.comp); c.comp.connect(c.gain); c.gain.connect(c.lim); c.lim.connect(c.fade); c.fade.connect(this.master);
    this.chains.set(el, c);
    return c;
  }
  apply(el: HTMLMediaElement, fx: AudioFx, fade = 1, muted = false) {
    const c = this.chain(el); const m = MICS.find((x) => x.id === fx.mic) ?? MICS[0]!;
    const now = this.ctx.currentTime;
    c.hp.frequency.setTargetAtTime(20 + (fx.clean + m.clean) * 1.6, now, 0.02);
    c.low.gain.setTargetAtTime(fx.bass + m.bass, now, 0.02);
    c.pres.gain.setTargetAtTime(fx.presence + m.presence, now, 0.02);
    c.air.gain.setTargetAtTime(fx.air + m.air, now, 0.02);
    const comp = Math.min(100, fx.comp + m.comp * 0.5);
    c.comp.threshold.setTargetAtTime(-6 - comp * 0.34, now, 0.02); c.comp.ratio.setTargetAtTime(1 + comp * 0.07, now, 0.02); c.comp.knee.value = 8; c.comp.attack.value = 0.006; c.comp.release.value = 0.18;
    // Compressor makeup gain + requested amplification (0–1000%).
    c.gain.gain.setTargetAtTime((fx.gain / 100) * (1 + comp / 160), now, 0.02);
    c.fade.gain.setTargetAtTime(muted ? 0 : Math.max(0, Math.min(1, fade)), now, 0.015);
  }
  setMaster(pct: number) { this.master.gain.setTargetAtTime(pct / 100, this.ctx.currentTime, 0.02); }
}
