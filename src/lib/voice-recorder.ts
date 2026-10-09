import { supabase } from "@/integrations/supabase/client";

// Microphone capture with voice-activity detection. Each spoken phrase is
// delivered as a separate audio clip after a short silence.
export interface RecorderEvents {
  onUtterance: (clip: Blob, silenceBeforeMs: number) => void;
  onLevel?: (level: number) => void;
  onSpeaking?: (speaking: boolean) => void;
}

export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private raf = 0;
  private speaking = false;
  private lastVoice = 0;
  private lastEnd = performance.now();
  private speechStart = 0;
  constructor(private ev: RecorderEvents, private silenceMs = 1300, private threshold = 0.018) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaStreamSource(this.stream);
    const an = this.ctx.createAnalyser(); an.fftSize = 1024; src.connect(an);
    const buf = new Float32Array(an.fftSize);
    this.lastEnd = performance.now();
    const tick = () => {
      an.getFloatTimeDomainData(buf);
      let sum = 0; for (const v of buf) sum += v * v;
      const rms = Math.sqrt(sum / buf.length);
      this.ev.onLevel?.(Math.min(1, rms * 12));
      const now = performance.now();
      if (rms > this.threshold) {
        this.lastVoice = now;
        if (!this.speaking) { this.speaking = true; this.speechStart = now; this.ev.onSpeaking?.(true); this.begin(); }
      } else if (this.speaking && now - this.lastVoice > this.silenceMs) {
        this.speaking = false; this.ev.onSpeaking?.(false); this.finish(now - this.speechStart > 350);
      }
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  private begin() {
    if (!this.stream) return;
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.start(250);
  }

  private finish(keep: boolean) {
    const rec = this.rec; if (!rec) return;
    const gap = this.speechStart - this.lastEnd;
    this.lastEnd = performance.now();
    rec.onstop = () => { if (keep && this.chunks.length) this.ev.onUtterance(new Blob(this.chunks, { type: (rec.mimeType || "audio/webm").split(";")[0] ?? "audio/webm" }), gap); };
    rec.stop(); this.rec = null;
  }

  /** Ends the current phrase now (e.g. user pressed stop). */
  flush() { if (this.speaking) { this.speaking = false; this.ev.onSpeaking?.(false); this.finish(true); } }

  stop() {
    cancelAnimationFrame(this.raf);
    this.flush();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.stream = null; this.ctx = null;
  }
}

export async function transcribeClip(clip: Blob, language = "", context = ""): Promise<string> {
  const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
  const f = new FormData();
  const ext = clip.type.includes("wav") ? "wav" : clip.type.includes("mp4") ? "m4a" : clip.type.includes("ogg") ? "ogg" : "webm";
  f.append("file", new File([clip], `speech.${ext}`, { type: clip.type.startsWith("audio/") ? clip.type : "audio/webm" }));
  if (language) f.append("language", language);
  if (context) f.append("context", context);
  const r = await fetch("/api/stt", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: f });
  if (!r.ok) throw new Error((await r.text()) || "تعذر تحويل الصوت إلى نص");
  return ((await r.json()) as { text: string }).text;
}
