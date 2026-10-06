// Studio voice enhancement chain (browser preview). Keeps the speaker's identity:
// only EQ, dynamics, denoise-style filtering and light room ambience are applied.
export interface VoiceFx {
  noise: number; // 0-100 low-rumble / hiss cleanup
  bass: number; // -10..10 dB body/depth
  warmth: number; // -10..10 dB low-mid warmth
  clarity: number; // -10..10 dB presence
  air: number; // -10..10 dB brilliance
  compression: number; // 0-100 broadcast loudness
  reverb: number; // 0-100 room ambience
  gain: number; // -6..12 dB output level
  hum: number; // 0-100 mains hum removal
  deEss: number; // 0-100 sibilance reduction
  speechFocus: number; // 0-100 vocal intelligibility
  limiter: number; // 0-100 peak control
}

export const DEFAULT_FX: VoiceFx = { noise: 40, bass: 2, warmth: 1, clarity: 3, air: 2, compression: 50, reverb: 0, gain: 2, hum: 30, deEss: 25, speechFocus: 50, limiter: 70 };

export const FX_PRESETS: { id: string; label: string; desc: string; fx: VoiceFx }[] = [
  { id: "rescue", label: "إنقاذ تسجيل ضعيف", desc: "تنظيف قوي مع إبراز الكلام وضبط القمم", fx: { noise: 90, bass: 1, warmth: 1, clarity: 6, air: 1, compression: 85, reverb: 0, gain: 4, hum: 90, deEss: 65, speechFocus: 90, limiter: 95 } },
  { id: "broadcast", label: "استوديو إذاعي", desc: "صوت قوي ممتلئ كالمذيعين", fx: { noise: 60, bass: 5, warmth: 2, clarity: 5, air: 3, compression: 80, reverb: 0, gain: 4, hum: 60, deEss: 45, speechFocus: 75, limiter: 90 } },
  { id: "podcast", label: "بودكاست عالمي", desc: "واضح وقريب ومتوازن للمحتوى", fx: { noise: 70, bass: 3, warmth: 4, clarity: 4, air: 2, compression: 75, reverb: 2, gain: 3, hum: 70, deEss: 55, speechFocus: 85, limiter: 90 } },
  { id: "cinema", label: "تعليق سينمائي", desc: "عميق وفخم مع فخامة المكان", fx: { noise: 60, bass: 8, warmth: 3, clarity: 3, air: 2, compression: 75, reverb: 20, gain: 4, hum: 50, deEss: 40, speechFocus: 65, limiter: 90 } },
  { id: "clear", label: "وضوح فائق", desc: "كل حرف مسموع بوضوح", fx: { noise: 70, bass: 0, warmth: -1, clarity: 7, air: 5, compression: 55, reverb: 0, gain: 3, hum: 70, deEss: 60, speechFocus: 95, limiter: 80 } },
  { id: "denoise", label: "إزالة الضجيج", desc: "تنظيف التسجيل مع أقل تغيير", fx: { noise: 100, bass: 0, warmth: 0, clarity: 2, air: 0, compression: 30, reverb: 0, gain: 1, hum: 100, deEss: 35, speechFocus: 60, limiter: 70 } },
  { id: "natural", label: "طبيعي محسّن", desc: "تحسين خفيف يحافظ على صوتك", fx: DEFAULT_FX },
];

function impulse(ctx: BaseAudioContext, seconds = 1.6) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

export async function decodeAudio(src: Blob | string) {
  const data = typeof src === "string" ? await (await fetch(src)).arrayBuffer() : await src.arrayBuffer();
  const ctx = new AudioContext();
  try { return await ctx.decodeAudioData(data); } finally { void ctx.close(); }
}

export async function renderFx(input: AudioBuffer, fx: VoiceFx) {
  const ctx = new OfflineAudioContext(input.numberOfChannels, input.length, input.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = input;
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 40 + fx.noise * 1.2;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 18000 - fx.noise * 60;
  const bass = ctx.createBiquadFilter(); bass.type = "lowshelf"; bass.frequency.value = 140; bass.gain.value = fx.bass;
  const warm = ctx.createBiquadFilter(); warm.type = "peaking"; warm.frequency.value = 350; warm.Q.value = 0.9; warm.gain.value = fx.warmth;
  const pres = ctx.createBiquadFilter(); pres.type = "peaking"; pres.frequency.value = 3200; pres.Q.value = 1; pres.gain.value = fx.clarity;
  const air = ctx.createBiquadFilter(); air.type = "highshelf"; air.frequency.value = 9000; air.gain.value = fx.air;
  const hum = ctx.createBiquadFilter(); hum.type = "notch"; hum.frequency.value = 50; hum.Q.value = 5 + fx.hum / 3;
  const speech = ctx.createBiquadFilter(); speech.type = "peaking"; speech.frequency.value = 1800; speech.Q.value = 0.8; speech.gain.value = fx.speechFocus / 20;
  const deEss = ctx.createBiquadFilter(); deEss.type = "peaking"; deEss.frequency.value = 6500; deEss.Q.value = 2.5; deEss.gain.value = -fx.deEss / 12;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10 - fx.compression * 0.3; comp.ratio.value = 1 + fx.compression / 14; comp.attack.value = 0.004; comp.release.value = 0.2; comp.knee.value = 8;
  const out = ctx.createGain(); out.gain.value = Math.pow(10, (fx.gain + fx.compression / 25) / 20);
  src.connect(hp).connect(hum).connect(lp).connect(bass).connect(warm).connect(speech).connect(pres).connect(deEss).connect(air).connect(comp);
  const dry = ctx.createGain(); dry.gain.value = 1;
  comp.connect(dry).connect(out);
  if (fx.reverb > 0) {
    const conv = ctx.createConvolver(); conv.buffer = impulse(ctx);
    const wet = ctx.createGain(); wet.gain.value = fx.reverb / 250;
    comp.connect(conv).connect(wet).connect(out);
  }
  const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -1 - fx.limiter / 20; limiter.ratio.value = 8 + fx.limiter / 5; limiter.attack.value = 0.001; limiter.release.value = 0.08;
  out.connect(limiter).connect(ctx.destination);
  src.start();
  return ctx.startRendering();
}

export function toWav(buf: AudioBuffer) {
  const ch = buf.numberOfChannels, len = buf.length * ch * 2 + 44;
  const view = new DataView(new ArrayBuffer(len));
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); view.setUint32(4, len - 8, true); w(8, "WAVE"); w(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, ch, true);
  view.setUint32(24, buf.sampleRate, true); view.setUint32(28, buf.sampleRate * ch * 2, true);
  view.setUint16(32, ch * 2, true); view.setUint16(34, 16, true); w(36, "data"); view.setUint32(40, len - 44, true);
  const chans = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < buf.length; i++) for (let c = 0; c < ch; c++) {
    const s = Math.max(-1, Math.min(1, chans[c]![i]!));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
  }
  return new Blob([view], { type: "audio/wav" });
}
