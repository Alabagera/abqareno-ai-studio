import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlabageraPortrait } from "@/components/AlabageraPortrait";
import { supabase } from "@/integrations/supabase/client";

type Phase = "idle" | "listening" | "thinking" | "speaking";
type SR = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; abort: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

const LABEL: Record<Phase, string> = { idle: "اضغط المايك وابدأ الكلام", listening: "أستمع إليك…", thinking: "عبقرينو يفكر…", speaking: "عبقرينو يتحدث…" };

function cleanForSpeech(md: string) {
  return md.replace(/<!--[\s\S]*?-->/g, "").replace(/```[\s\S]*?```/g, " (تجد الكود مكتوبًا في المحادثة) ").replace(/[#*_`>|]/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/-{3,}/g, " ").replace(/\s+/g, " ").trim();
}

// Hands-free voice conversation: browser speech recognition -> assistant -> spoken reply.
export function VoiceChat({ onAsk, onClose }: { onAsk: (text: string) => Promise<string>; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lang, setLang] = useState<"ar-SA" | "en-US">("ar-SA");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [auto, setAuto] = useState(true);
  const recRef = useRef<SR | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakCtrl = useRef<AbortController | null>(null);
  const [voice, setVoice] = useState<"Charon" | "Kore" | "Orus" | "Aoede">("Charon");
  const activeRef = useRef(true);
  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => () => { activeRef.current = false; recRef.current?.abort(); speakCtrl.current?.abort(); audioRef.current?.pause(); window.speechSynthesis?.cancel(); }, []);

  async function tts(text: string, signal: AbortSignal) {
    const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
    const r = await fetch("/api/tts", { method: "POST", signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text, voice }) });
    if (!r.ok) throw new Error((await r.text()) || "تعذر توليد الصوت");
    return URL.createObjectURL(await r.blob());
  }
  function playUrl(url: string) {
    return new Promise<void>((resolve) => {
      const a = audioRef.current ?? new Audio(); audioRef.current = a;
      a.src = url; a.onended = () => { URL.revokeObjectURL(url); resolve(); }; a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
  }
  function browserSpeak(text: string) {
    return new Promise<void>((resolve) => {
      const synth = window.speechSynthesis; if (!synth) return resolve();
      const u = new SpeechSynthesisUtterance(text); u.lang = /[\u0600-\u06FF]/.test(text) ? "ar-SA" : "en-US";
      u.onend = () => resolve(); u.onerror = () => resolve(); synth.speak(u);
    });
  }
  async function speak(text: string) {
    stopAudio();
    const ctrl = new AbortController(); speakCtrl.current = ctrl;
    const parts = (cleanForSpeech(text).match(/[^.!?؟。\n]{1,400}[.!?؟。]?/g) ?? []).map((p) => p.trim()).filter(Boolean).slice(0, 12);
    // Merge short sentences so each clip sounds natural; prefetch the next clip while one plays.
    const chunks: string[] = [];
    for (const p of parts) { const last = chunks[chunks.length - 1]; if (last && last.length + p.length < 300) chunks[chunks.length - 1] = `${last} ${p}`; else chunks.push(p); }
    let next: Promise<string> | null = chunks[0] ? tts(chunks[0], ctrl.signal) : null;
    for (let i = 0; i < chunks.length && !ctrl.signal.aborted; i++) {
      let url: string;
      try { url = await next!; } catch (e) { if (ctrl.signal.aborted) return; console.error(e); await browserSpeak(chunks.slice(i).join(" ")); return; }
      next = chunks[i + 1] ? tts(chunks[i + 1]!, ctrl.signal) : null;
      next?.catch(() => undefined);
      if (ctrl.signal.aborted) return;
      await playUrl(url);
    }
  }
  function stopAudio() { speakCtrl.current?.abort(); audioRef.current?.pause(); window.speechSynthesis?.cancel(); }

  function listen() {
    if (!supported) return;
    stopAudio();
    // Unlock audio playback on phones during the user's tap.
    if (!audioRef.current) { const a = new Audio(); a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="; a.play().catch(() => undefined); audioRef.current = a; }
    const Ctor = ((window as unknown as Record<string, unknown>)["SpeechRecognition"] ?? (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"]) as new () => SR;
    const rec = new Ctor();
    rec.lang = lang; rec.interimResults = true; rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) { const r = e.results[i]!; t += r[0]!.transcript; if (r.isFinal) finalText = t; }
      setHeard(t);
    };
    rec.onerror = (e) => { if (e.error !== "no-speech" && e.error !== "aborted") setReply(`تعذر استخدام المايك (${e.error}). تأكد من السماح للموقع بالوصول للمايك.`); };
    rec.onend = async () => {
      recRef.current = null;
      const text = finalText.trim() || "";
      if (!text || !activeRef.current) { setPhase("idle"); return; }
      setPhase("thinking"); setReply("");
      try {
        const answer = await onAsk(text);
        if (!activeRef.current) return;
        setReply(answer); setPhase("speaking");
        await speak(answer);
        if (activeRef.current && auto) listen(); else setPhase("idle");
      } catch (err) { setReply((err as Error).message); setPhase("idle"); }
    };
    recRef.current = rec; setHeard(""); setPhase("listening"); rec.start();
  }

  function toggleMic() {
    if (phase === "listening") { recRef.current?.stop(); return; }
    if (phase === "speaking") { stopAudio(); listen(); return; }
    if (phase === "idle") listen();
  }

  const ring = phase === "listening" ? "animate-ping bg-gold/30" : phase === "speaking" ? "animate-pulse bg-gold/25" : phase === "thinking" ? "animate-spin border-4 border-dashed border-gold/60" : "";
  return <div className="fixed inset-0 z-[90] flex flex-col items-center justify-between overflow-hidden bg-background p-5" style={{ background: "radial-gradient(circle at 50% 35%, color-mix(in oklch, var(--gold) 18%, transparent), transparent 55%), var(--background)" }}>
    <div className="flex w-full max-w-xl items-center justify-between">
      <div className="flex gap-1 rounded-full bg-secondary p-1 text-xs">
        {(["ar-SA", "en-US"] as const).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={`rounded-full px-3 py-1 ${lang === l ? "bg-gold text-primary-foreground" : ""}`}>{l === "ar-SA" ? "العربية" : "English"}</button>)}
      </div>
      <select value={voice} onChange={(e) => setVoice(e.target.value as typeof voice)} aria-label="صوت عبقرينو" className="rounded-full bg-secondary px-2 py-1 text-xs"><option value="Charon">صوت رجالي عميق</option><option value="Orus">صوت رجالي حازم</option><option value="Kore">صوت نسائي واضح</option><option value="Aoede">صوت نسائي دافئ</option></select>
      <label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-[var(--gold)]" />محادثة مستمرة</label>
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق الدردشة الصوتية"><X /></Button>
    </div>

    <div className="flex flex-col items-center text-center">
      <div className="relative grid size-52 place-items-center sm:size-64">
        {ring && <span className={`absolute inset-0 rounded-full ${ring}`} />}
        <span className="absolute inset-3 rounded-full border border-gold/40" />
        <AlabageraPortrait className="relative size-40 rounded-full border-4 border-gold shadow-gold sm:size-48" eager />
        {phase === "speaking" && <Volume2 className="absolute bottom-2 end-4 size-7 rounded-full bg-gold p-1 text-primary-foreground" />}
      </div>
      <h2 className="mt-6 text-xl font-bold text-gold-gradient">{LABEL[phase]}</h2>
      {heard && <p dir="auto" className="bilingual-text mt-3 max-w-xl text-base">«{heard}»</p>}
      {reply && <p dir="auto" className="bilingual-text mt-3 line-clamp-6 max-w-xl text-sm text-muted-foreground">{cleanForSpeech(reply)}</p>}
      {!supported && <p className="mt-4 max-w-sm text-sm text-destructive">متصفحك لا يدعم التعرف على الصوت. استخدم Google Chrome أو Safari أو Edge.</p>}
    </div>

    <div className="flex flex-col items-center gap-2 pb-4">
      <button type="button" onClick={toggleMic} disabled={!supported || phase === "thinking"} aria-label="المايك" className={`grid size-20 place-items-center rounded-full shadow-gold transition active:scale-95 disabled:opacity-50 ${phase === "listening" ? "bg-destructive text-destructive-foreground" : "bg-gold-gradient text-primary-foreground"}`}>
        {phase === "listening" ? <MicOff className="size-9" /> : <Mic className="size-9" />}
      </button>
      <span className="text-xs text-muted-foreground">{phase === "listening" ? "اضغط للإنهاء والإرسال" : phase === "speaking" ? "اضغط لمقاطعته والتحدث" : "المحادثة تُحفظ في هذه الدردشة"}</span>
    </div>
  </div>;
}
