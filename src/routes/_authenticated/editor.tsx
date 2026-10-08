import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Copy, Download, Film, FolderOpen, ImagePlus, Maximize2, Minimize2, Music, Pause, Play, Plus, Scissors, Trash2, Type, Upload, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl, uploadMedia } from "@/lib/media";
import { FONTS, SOCIAL_SIZES, loadFont } from "@/lib/studio-options";
import { modelsFor } from "@/lib/ai/registry";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/editor")({
  head: () => ({ meta: [{ title: "محرر الفيديو — عبقرينو AI Studio" }, { name: "description", content: "صناعة الفيديو وتعديله ودمج الصور وتصديره بصيغ وجودات مختلفة." }] }),
  component: Editor,
});

interface Filters { brightness: number; contrast: number; saturate: number; hue: number; grayscale: number; sepia: number; blur: number }
interface Clip { id: string; kind: "video" | "image"; name: string; url: string; natural: number; trimStart: number; trimEnd: number; imageDuration: number; speed: number; fit: "cover" | "contain"; kenBurns: boolean; fadeIn: number; fadeOut: number; volume: number; filters: Filters }
interface TextItem { id: string; text: string; start: number; end: number; x: number; y: number; size: number; color: string; bg: string; font: string; bold: boolean }

const NO_FILTERS: Filters = { brightness: 100, contrast: 100, saturate: 100, hue: 0, grayscale: 0, sepia: 0, blur: 0 };
const PRESETS: { label: string; f: Partial<Filters> }[] = [
  { label: "بدون", f: {} }, { label: "سينمائي", f: { contrast: 120, saturate: 85, sepia: 15 } }, { label: "دافئ", f: { saturate: 120, sepia: 30, hue: -10 } },
  { label: "بارد", f: { hue: 15, saturate: 90, brightness: 105 } }, { label: "أبيض وأسود", f: { grayscale: 100, contrast: 115 } }, { label: "حيوي", f: { saturate: 150, contrast: 110 } }, { label: "قديم", f: { sepia: 70, contrast: 90 } },
];
const QUALITIES = [{ id: 480, label: "480p (خفيف)", br: 2.5e6 }, { id: 720, label: "720p HD", br: 5e6 }, { id: 1080, label: "1080p Full HD", br: 10e6 }, { id: 1440, label: "1440p 2K", br: 18e6 }, { id: 2160, label: "2160p 4K", br: 35e6 }];
const FORMATS = [
  { id: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", label: "MP4 (H.264) — الأكثر توافقًا", ext: "mp4" }, { id: "video/mp4", label: "MP4", ext: "mp4" },
  { id: "video/webm;codecs=vp9,opus", label: "WebM (VP9) — جودة عالية وحجم أصغر", ext: "webm" }, { id: "video/webm;codecs=vp8,opus", label: "WebM (VP8)", ext: "webm" }, { id: "video/webm", label: "WebM", ext: "webm" },
];
const uid = () => crypto.randomUUID();
const clipLen = (c: Clip) => (c.kind === "image" ? c.imageDuration : Math.max(0.1, (c.trimEnd - c.trimStart) / c.speed));
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const filterCss = (f: Filters) => `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) hue-rotate(${f.hue}deg) grayscale(${f.grayscale}%) sepia(${f.sepia}%) blur(${f.blur}px)`;

function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const els = useRef(new Map<string, HTMLVideoElement | HTMLImageElement>());
  const audio = useRef<{ ctx: AudioContext; dest: MediaStreamAudioDestinationNode; gains: Map<HTMLMediaElement, GainNode> } | null>(null);
  const musicEl = useRef<HTMLAudioElement | null>(null);
  const playing = useRef(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [selText, setSelText] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [full, setFull] = useState(false);
  const [sizeId, setSizeId] = useState("yt");
  const [bgColor, setBgColor] = useState("#000000");
  const [music, setMusic] = useState<{ name: string; url: string; volume: number } | null>(null);
  const [quality, setQuality] = useState(1080);
  const [fps, setFps] = useState(30);
  const [format, setFormat] = useState("");
  const [exporting, setExporting] = useState<number | null>(null);
  const [result, setResult] = useState<{ url: string; blob: Blob; name: string } | null>(null);
  const [showLib, setShowLib] = useState(false);
  const clipsRef = useRef(clips); clipsRef.current = clips;
  const textsRef = useRef(texts); textsRef.current = texts;
  const bgRef = useRef(bgColor); bgRef.current = bgColor;

  const size = SOCIAL_SIZES.find((s) => s.id === sizeId) ?? SOCIAL_SIZES[0]!;
  const ratio = size.w / size.h;
  const total = clips.reduce((a, c) => a + clipLen(c), 0);
  const supported = typeof MediaRecorder === "undefined" ? [] : FORMATS.filter((f) => MediaRecorder.isTypeSupported(f.id));
  useEffect(() => { if (!format && supported[0]) setFormat(supported[0].id); }, [supported, format]);

  const { data: library = [] } = useQuery({
    queryKey: ["editor-library"], enabled: showLib,
    queryFn: async () => (await supabase.from("media_assets").select("id,name,kind,storage_path").in("kind", ["video", "image", "audio"]).order("created_at", { ascending: false }).limit(60)).data ?? [],
  });

  // Canvas preview resolution (720 on the short side) unless exporting.
  const setRes = (short: number) => {
    const c = canvasRef.current; if (!c) return;
    const w = ratio >= 1 ? Math.round(short * ratio) : short, h = ratio >= 1 ? short : Math.round(short / ratio);
    c.width = w - (w % 2); c.height = h - (h % 2);
  };
  useEffect(() => { if (exporting == null) { setRes(720); void seek(time); } }, [sizeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addSource(kind: "video" | "image" | "audio", url: string, name: string) {
    if (kind === "audio") { setMusic({ name, url, volume: 0.6 }); return; }
    const id = uid();
    if (kind === "image") {
      const img = new Image(); img.crossOrigin = "anonymous"; img.src = url;
      await img.decode().catch(() => undefined);
      els.current.set(id, img);
      setClips((p) => [...p, { id, kind, name, url, natural: 0, trimStart: 0, trimEnd: 0, imageDuration: 4, speed: 1, fit: "cover", kenBurns: true, fadeIn: 0.5, fadeOut: 0, volume: 1, filters: { ...NO_FILTERS } }]);
    } else {
      const v = document.createElement("video"); v.crossOrigin = "anonymous"; v.playsInline = true; v.preload = "auto"; v.src = url;
      await new Promise<void>((r) => { v.onloadedmetadata = () => r(); v.onerror = () => r(); });
      const d = Number.isFinite(v.duration) ? v.duration : 10;
      els.current.set(id, v);
      setClips((p) => [...p, { id, kind, name, url, natural: d, trimStart: 0, trimEnd: d, imageDuration: 4, speed: 1, fit: "contain", kenBurns: false, fadeIn: 0.3, fadeOut: 0, volume: 1, filters: { ...NO_FILTERS } }]);
    }
    setSel(id);
    setTimeout(() => void seek(0), 200);
  }
  const onFiles = async (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      const k = f.type.startsWith("video/") ? "video" : f.type.startsWith("image/") ? "image" : f.type.startsWith("audio/") ? "audio" : null;
      if (!k) { toast.error(`صيغة غير مدعومة: ${f.name}`); continue; }
      await addSource(k, URL.createObjectURL(f), f.name);
    }
  };
  const fromLibrary = async (a: { kind: string; storage_path: string; name: string }) => {
    const url = await signedUrl(a.storage_path); if (!url) return void toast.error("تعذر فتح الملف");
    await addSource(a.kind as "video" | "image" | "audio", url, a.name); toast.success("أُضيف إلى الخط الزمني");
  };

  const ensureAudio = () => {
    if (!audio.current) { const ctx = new AudioContext(); audio.current = { ctx, dest: ctx.createMediaStreamDestination(), gains: new Map() }; }
    void audio.current.ctx.resume();
    return audio.current;
  };
  const gainFor = (el: HTMLMediaElement) => {
    const a = ensureAudio(); let g = a.gains.get(el);
    if (!g) { const src = a.ctx.createMediaElementSource(el); g = a.ctx.createGain(); src.connect(g); g.connect(a.ctx.destination); g.connect(a.dest); a.gains.set(el, g); }
    return g;
  };

  function draw(clip: Clip | undefined, lt: number, t: number) {
    const c = canvasRef.current; const ctx = c?.getContext("2d"); if (!c || !ctx) return;
    const W = c.width, H = c.height;
    ctx.save(); ctx.filter = "none"; ctx.globalAlpha = 1; ctx.fillStyle = bgRef.current; ctx.fillRect(0, 0, W, H);
    const el = clip && els.current.get(clip.id);
    if (clip && el) {
      const sw = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth, sh = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
      if (sw && sh) {
        const len = clipLen(clip);
        let s = clip.fit === "cover" ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
        if (clip.kenBurns) s *= 1 + 0.1 * (lt / len);
        const dw = sw * s, dh = sh * s;
        let a = 1;
        if (clip.fadeIn > 0) a = Math.min(a, lt / clip.fadeIn);
        if (clip.fadeOut > 0) a = Math.min(a, (len - lt) / clip.fadeOut);
        ctx.globalAlpha = Math.max(0, Math.min(1, a));
        ctx.filter = filterCss(clip.filters);
        ctx.drawImage(el, (W - dw) / 2, (H - dh) / 2, dw, dh);
      }
    }
    ctx.restore();
    for (const tx of textsRef.current) {
      if (t < tx.start || t >= tx.end || !tx.text) continue;
      const fs = (tx.size * Math.min(W, H)) / 1080;
      ctx.save();
      ctx.font = `${tx.bold ? 700 : 400} ${fs}px "${tx.font}", "Noto Sans Arabic", sans-serif`;
      ctx.direction = /[\u0600-\u06FF]/.test(tx.text) ? "rtl" : "ltr"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const lines = tx.text.split("\n"); const lh = fs * 1.35; const x = (tx.x / 100) * W; const y0 = (tx.y / 100) * H - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, i) => {
        const y = y0 + i * lh;
        if (tx.bg !== "transparent") { const m = ctx.measureText(ln).width; ctx.fillStyle = tx.bg; ctx.fillRect(x - m / 2 - fs * 0.3, y - lh / 2, m + fs * 0.6, lh); }
        ctx.fillStyle = tx.color; ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = fs * 0.15; ctx.fillText(ln, x, y);
      });
      ctx.restore();
    }
  }

  function locate(t: number) {
    let off = 0;
    for (const c of clipsRef.current) { const l = clipLen(c); if (t < off + l) return { clip: c, off, lt: t - off }; off += l; }
    return null;
  }
  async function seek(t: number) {
    setTime(t);
    const hit = locate(t);
    if (hit?.clip.kind === "video") {
      const v = els.current.get(hit.clip.id) as HTMLVideoElement;
      v.currentTime = hit.clip.trimStart + hit.lt * hit.clip.speed;
      await new Promise<void>((r) => { const done = () => r(); v.addEventListener("seeked", done, { once: true }); setTimeout(done, 600); });
    }
    draw(hit?.clip, hit?.lt ?? 0, t);
  }

  async function run(from: number) {
    playing.current = true; setIsPlaying(true);
    const a = ensureAudio();
    if (music && musicEl.current) { gainFor(musicEl.current).gain.value = music.volume; musicEl.current.currentTime = from % (musicEl.current.duration || 1e9); await musicEl.current.play().catch(() => undefined); }
    let off = 0;
    for (const c of clipsRef.current) {
      const len = clipLen(c);
      if (off + len <= from) { off += len; continue; }
      const start = Math.max(0, from - off);
      const el = els.current.get(c.id);
      if (c.kind === "video" && el instanceof HTMLVideoElement) {
        gainFor(el).gain.value = c.volume;
        el.currentTime = c.trimStart + start * c.speed; el.playbackRate = c.speed;
        await el.play().catch(() => undefined);
        while (playing.current) {
          const lt = (el.currentTime - c.trimStart) / c.speed;
          if (lt >= len || el.ended) break;
          draw(c, lt, off + lt); setTime(off + lt); await frame();
        }
        el.pause();
      } else {
        const t0 = performance.now() - start * 1000;
        while (playing.current) {
          const lt = (performance.now() - t0) / 1000; if (lt >= len) break;
          draw(c, lt, off + lt); setTime(off + lt); await frame();
        }
      }
      if (!playing.current) break;
      off += len;
    }
    musicEl.current?.pause();
    void a;
    const finished = playing.current; playing.current = false; setIsPlaying(false);
    return finished;
  }
  const togglePlay = () => { if (playing.current) { playing.current = false; return; } if (!clips.length) return void toast.error("أضف فيديو أو صورة أولًا"); void run(time >= total - 0.05 ? 0 : time); };

  async function exportVideo() {
    if (!clips.length) return void toast.error("أضف مقاطع أولًا");
    const fmtDef = FORMATS.find((f) => f.id === format); if (!fmtDef) return void toast.error("المتصفح لا يدعم التصدير، جرّب Chrome");
    const c = canvasRef.current!; const q = QUALITIES.find((x) => x.id === quality)!;
    playing.current = false; await frame();
    setRes(quality); setExporting(0); setResult(null);
    await Promise.all(texts.map((t) => document.fonts.load(`700 20px "${t.font}"`).catch(() => undefined)));
    const stream = c.captureStream(fps); ensureAudio().dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    const rec = new MediaRecorder(stream, { mimeType: fmtDef.id, videoBitsPerSecond: q.br });
    const chunks: Blob[] = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise<void>((r) => (rec.onstop = () => r()));
    rec.start(500);
    const iv = setInterval(() => setTime((t) => { setExporting(Math.min(99, Math.round((t / total) * 100))); return t; }), 300);
    const ok = await run(0);
    clearInterval(iv); rec.stop(); await stopped; stream.getVideoTracks().forEach((t) => t.stop());
    setRes(720); setExporting(null);
    if (!ok) return void toast("أُلغي التصدير");
    const blob = new Blob(chunks, { type: fmtDef.id.split(";")[0] ?? "video/webm" });
    setResult({ url: URL.createObjectURL(blob), blob, name: `abqarino-${quality}p.${fmtDef.ext}` });
    toast.success("الفيديو جاهز للتنزيل");
  }
  const saveToLibrary = async () => {
    if (!result) return;
    if (result.blob.size > 20 * 1024 * 1024) return void toast.error("الفيديو أكبر من 20 ميجابايت، نزّله على جهازك أو اختر جودة أقل");
    try { await uploadMedia(new File([result.blob], result.name, { type: result.blob.type }), "video"); toast.success("حُفظ في المكتبة"); } catch (e) { toast.error((e as Error).message); }
  };

  const upd = (id: string, p: Partial<Clip>) => setClips((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const move = (i: number, d: number) => setClips((cs) => { const n = [...cs]; const j = i + d; if (j < 0 || j >= n.length) return cs; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  const duplicate = (c: Clip) => { const id = uid(); const src = els.current.get(c.id)!; const copy = src instanceof HTMLVideoElement ? Object.assign(document.createElement("video"), { crossOrigin: "anonymous", playsInline: true, preload: "auto", src: c.url }) : src; els.current.set(id, copy); setClips((cs) => { const i = cs.findIndex((x) => x.id === c.id); const n = [...cs]; n.splice(i + 1, 0, { ...c, id }); return n; }); };
  const splitAtPlayhead = () => {
    const hit = locate(time); if (!hit || hit.lt < 0.2 || clipLen(hit.clip) - hit.lt < 0.2) return void toast.error("ضع المؤشر داخل مقطع لقصّه");
    const c = hit.clip; const id = uid();
    if (c.kind === "video") { const cut = c.trimStart + hit.lt * c.speed; els.current.set(id, Object.assign(document.createElement("video"), { crossOrigin: "anonymous", playsInline: true, preload: "auto", src: c.url })); setClips((cs) => cs.flatMap((x) => x.id === c.id ? [{ ...x, trimEnd: cut, fadeOut: 0 }, { ...x, id, trimStart: cut, fadeIn: 0 }] : [x])); }
    else { els.current.set(id, els.current.get(c.id)!); setClips((cs) => cs.flatMap((x) => x.id === c.id ? [{ ...x, imageDuration: hit.lt, fadeOut: 0 }, { ...x, id, imageDuration: x.imageDuration - hit.lt, fadeIn: 0 }] : [x])); }
    toast.success("قُصّ المقطع إلى جزأين");
  };
  const addText = () => { const id = uid(); setTexts((p) => [...p, { id, text: "اكتب نصك هنا", start: Math.min(time, Math.max(0, total - 0.5)), end: Math.min(time + 4, total || 4), x: 50, y: 80, size: 64, color: "#FFFFFF", bg: "rgba(0,0,0,0.45)", font: "Cairo", bold: true }]); setSelText(id); loadFont("Cairo"); };
  const updText = (id: string, p: Partial<TextItem>) => setTexts((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));
  useEffect(() => { if (!isPlaying && exporting == null) void seek(Math.min(time, total)); }, [clips, texts, bgColor]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!playing.current && exporting == null) { setRes(720); void seek(time); } }, [full]); // eslint-disable-line react-hooks/exhaustive-deps
  const clip = clips.find((c) => c.id === sel);
  const txt = texts.find((t) => t.id === selText);
  const videoModels = [...modelsFor("video"), ...modelsFor("video_edit")];

  return (
    <div className="space-y-5">
      <PageHeader title="محرر الفيديو" subtitle="اصنع فيديو من الصفر أو عدّل فيديوهاتك وصورك ثم صدّره بالجودة التي تريدها" />
      {music && <audio ref={musicEl} src={music.url} crossOrigin="anonymous" loop className="hidden" />}

      {(() => { const node = (
      <div className={full ? "fixed inset-0 z-50 flex flex-col bg-background p-2" : "glass overflow-hidden rounded-2xl"}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <select value={sizeId} onChange={(e) => setSizeId(e.target.value)} className="h-9 min-w-[160px] flex-1 rounded-md border border-input bg-background px-2 text-sm sm:max-w-xs">{SOCIAL_SIZES.filter((s) => s.id !== "custom").map((s) => <option key={s.id} value={s.id}>{s.platform} · {s.label} {s.ratio}</option>)}</select>
          <label className="flex items-center gap-1 text-xs">الخلفية<input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="size-8 rounded" /></label>
          <Button size="sm" variant="glass" onClick={() => setFull((f) => !f)}>{full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}{full ? "خروج" : "ملء الشاشة"}</Button>
        </div>
        <div className="flex flex-1 items-center justify-center bg-muted/40 p-3">
          <canvas ref={canvasRef} onClick={togglePlay} className="rounded-xl bg-black shadow-lg" style={{ aspectRatio: `${ratio}`, width: "100%", maxWidth: `calc(${full ? "80vh" : "60vh"} * ${ratio})`, maxHeight: full ? "80vh" : "60vh" }} />
        </div>
        <div className="space-y-2 border-t border-border p-3">
          <input type="range" min={0} max={Math.max(total, 0.1)} step={0.05} value={time} disabled={isPlaying} onChange={(e) => void seek(+e.target.value)} className="w-full accent-[var(--gold)]" aria-label="الخط الزمني" />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="gold" onClick={togglePlay} disabled={exporting != null}>{isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}{isPlaying ? "إيقاف" : "تشغيل"}</Button>
            <span className="font-mono text-xs" dir="ltr">{fmt(time)} / {fmt(total)}</span>
            <Button size="sm" variant="glass" onClick={splitAtPlayhead} disabled={isPlaying}><Scissors className="size-4" />قصّ عند المؤشر</Button>
            <Button size="sm" variant="glass" onClick={addText} disabled={isPlaying}><Type className="size-4" />نص</Button>
          </div>
        </div>
      </div>
      ); return full ? createPortal(node, document.body) : node; })()}

      <section className="glass space-y-3 rounded-2xl p-4">
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-bold text-primary-foreground"><Upload className="size-4" />من جهازي (فيديو، صور، موسيقى)<input type="file" multiple accept="video/*,image/*,audio/*" className="hidden" onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} /></label>
          <Button variant="glass" onClick={() => setShowLib((s) => !s)}><FolderOpen className="size-4" />من المكتبة</Button>
        </div>
        {showLib && <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4">{library.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد ملفات</p> : library.map((a) => <button key={a.id} onClick={() => void fromLibrary(a)} className="rounded-lg border border-border p-2 text-start text-xs hover:border-gold">{a.kind === "video" ? <Film className="mb-1 size-4 text-gold" /> : a.kind === "image" ? <ImagePlus className="mb-1 size-4 text-gold" /> : <Music className="mb-1 size-4 text-gold" />}<span className="line-clamp-2" dir="auto">{a.name}</span></button>)}</div>}

        <h2 className="font-bold">الخط الزمني ({clips.length} مقطع)</h2>
        {clips.length === 0 && <p className="text-sm text-muted-foreground">ابدأ بإضافة فيديوهات أو صور. الصور تتحول إلى مشاهد متحركة، ويمكنك دمجها مع الفيديوهات في فيديو واحد.</p>}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {clips.map((c, i) => (
            <button key={c.id} onClick={() => { setSel(c.id); let off = 0; for (const x of clips) { if (x.id === c.id) break; off += clipLen(x); } void seek(off); }} className={`shrink-0 rounded-lg border-2 p-2 text-start text-xs ${sel === c.id ? "border-gold" : "border-border"}`} style={{ width: Math.max(90, Math.min(220, clipLen(c) * 18)) }}>
              <div className="flex items-center gap-1">{c.kind === "video" ? <Film className="size-3 text-gold" /> : <ImagePlus className="size-3 text-gold" />}<span>{i + 1}</span></div>
              <div className="truncate" dir="auto">{c.name}</div><div className="font-mono text-muted-foreground" dir="ltr">{clipLen(c).toFixed(1)}s</div>
            </button>
          ))}
        </div>
        {music && <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-xs"><Music className="size-4 text-gold" /><span className="flex-1 truncate" dir="auto">{music.name}</span>مستوى الموسيقى<input type="range" min={0} max={1} step={0.05} value={music.volume} onChange={(e) => setMusic({ ...music, volume: +e.target.value })} /><Button size="sm" variant="ghost" onClick={() => setMusic(null)}><Trash2 className="size-4" /></Button></div>}
      </section>

      {clip && (
        <section className="glass space-y-3 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2"><h2 className="flex-1 font-bold">تعديل المقطع</h2>
            {(() => { const i = clips.indexOf(clip); return <><Button size="sm" variant="ghost" onClick={() => move(i, -1)}><ArrowUp className="size-4" />قبل</Button><Button size="sm" variant="ghost" onClick={() => move(i, 1)}><ArrowDown className="size-4" />بعد</Button></>; })()}
            <Button size="sm" variant="ghost" onClick={() => duplicate(clip)}><Copy className="size-4" />تكرار</Button>
            <Button size="sm" variant="ghost" onClick={() => { setClips((cs) => cs.filter((c) => c.id !== clip.id)); setSel(null); }}><Trash2 className="size-4" />حذف</Button>
          </div>
          <div className="grid gap-3 text-xs sm:grid-cols-2">
            {clip.kind === "video" ? <>
              <Range label={`بداية القص ${clip.trimStart.toFixed(1)}s`} min={0} max={clip.natural} step={0.1} value={clip.trimStart} onChange={(v) => upd(clip.id, { trimStart: Math.min(v, clip.trimEnd - 0.2) })} />
              <Range label={`نهاية القص ${clip.trimEnd.toFixed(1)}s`} min={0} max={clip.natural} step={0.1} value={clip.trimEnd} onChange={(v) => upd(clip.id, { trimEnd: Math.max(v, clip.trimStart + 0.2) })} />
              <Range label={`السرعة ×${clip.speed}`} min={0.25} max={3} step={0.25} value={clip.speed} onChange={(v) => upd(clip.id, { speed: v })} />
              <Range label={`مستوى الصوت ${Math.round(clip.volume * 100)}%`} min={0} max={2} step={0.05} value={clip.volume} onChange={(v) => upd(clip.id, { volume: v })} />
            </> : <>
              <Range label={`مدة الصورة ${clip.imageDuration.toFixed(1)}s`} min={0.5} max={30} step={0.5} value={clip.imageDuration} onChange={(v) => upd(clip.id, { imageDuration: v })} />
              <label className="flex items-center gap-2"><input type="checkbox" checked={clip.kenBurns} onChange={(e) => upd(clip.id, { kenBurns: e.target.checked })} />حركة تقريب سينمائية</label>
            </>}
            <Range label={`ظهور تدريجي ${clip.fadeIn}s`} min={0} max={3} step={0.1} value={clip.fadeIn} onChange={(v) => upd(clip.id, { fadeIn: v })} />
            <Range label={`اختفاء تدريجي ${clip.fadeOut}s`} min={0} max={3} step={0.1} value={clip.fadeOut} onChange={(v) => upd(clip.id, { fadeOut: v })} />
            <label>طريقة الملاءمة<select value={clip.fit} onChange={(e) => upd(clip.id, { fit: e.target.value as Clip["fit"] })} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2"><option value="cover">ملء الإطار (قص الأطراف)</option><option value="contain">إظهار كامل (أشرطة)</option></select></label>
          </div>
          <h3 className="text-sm font-bold">الفلاتر والألوان</h3>
          <div className="flex flex-wrap gap-2">{PRESETS.map((p) => <Button key={p.label} size="sm" variant="glass" onClick={() => upd(clip.id, { filters: { ...NO_FILTERS, ...p.f } })}><Wand2 className="size-3" />{p.label}</Button>)}</div>
          <div className="grid gap-3 text-xs sm:grid-cols-3">
            {([["brightness", "السطوع", 0, 200], ["contrast", "التباين", 0, 200], ["saturate", "التشبع", 0, 250], ["hue", "درجة اللون", -180, 180], ["grayscale", "رمادي", 0, 100], ["sepia", "دافئ قديم", 0, 100], ["blur", "تمويه", 0, 10]] as const).map(([k, l, mn, mx]) => (
              <Range key={k} label={`${l} ${clip.filters[k]}`} min={mn} max={mx} step={1} value={clip.filters[k]} onChange={(v) => upd(clip.id, { filters: { ...clip.filters, [k]: v } })} />
            ))}
          </div>
        </section>
      )}

      <section className="glass space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between"><h2 className="font-bold">النصوص والعناوين ({texts.length})</h2><Button size="sm" variant="glass" onClick={addText}><Plus className="size-4" />إضافة نص</Button></div>
        <div className="flex flex-wrap gap-2">{texts.map((t) => <button key={t.id} onClick={() => setSelText(t.id)} className={`max-w-[180px] truncate rounded-md border px-2 py-1 text-xs ${selText === t.id ? "border-gold" : "border-border"}`} dir="auto">{t.text}</button>)}</div>
        {txt && <div className="grid gap-3 text-xs sm:grid-cols-2">
          <textarea dir="auto" value={txt.text} onChange={(e) => updText(txt.id, { text: e.target.value })} className="min-h-16 rounded-md border border-input bg-background p-2 text-sm sm:col-span-2" />
          <Range label={`يبدأ ${txt.start.toFixed(1)}s`} min={0} max={Math.max(total, 0.1)} step={0.1} value={txt.start} onChange={(v) => updText(txt.id, { start: v })} />
          <Range label={`ينتهي ${txt.end.toFixed(1)}s`} min={0} max={Math.max(total, 0.1)} step={0.1} value={txt.end} onChange={(v) => updText(txt.id, { end: v })} />
          <Range label={`أفقيًا ${txt.x}%`} min={0} max={100} step={1} value={txt.x} onChange={(v) => updText(txt.id, { x: v })} />
          <Range label={`عموديًا ${txt.y}%`} min={0} max={100} step={1} value={txt.y} onChange={(v) => updText(txt.id, { y: v })} />
          <Range label={`الحجم ${txt.size}`} min={16} max={200} step={2} value={txt.size} onChange={(v) => updText(txt.id, { size: v })} />
          <label>الخط<select value={txt.font} onChange={(e) => { loadFont(e.target.value); updText(txt.id, { font: e.target.value }); }} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2">{FONTS.map((f) => <option key={f}>{f}</option>)}</select></label>
          <label className="flex items-center gap-2">لون النص<input type="color" value={txt.color} onChange={(e) => updText(txt.id, { color: e.target.value })} /></label>
          <label className="flex items-center gap-2">الخلفية<select value={txt.bg} onChange={(e) => updText(txt.id, { bg: e.target.value })} className="h-8 rounded-md border border-input bg-background px-2"><option value="transparent">بدون</option><option value="rgba(0,0,0,0.45)">داكنة شفافة</option><option value="#000000">سوداء</option><option value="#E6B422">ذهبية</option><option value="#FFFFFF">بيضاء</option><option value="#DC143C">حمراء</option></select></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={txt.bold} onChange={(e) => updText(txt.id, { bold: e.target.checked })} />عريض</label>
          <Button size="sm" variant="ghost" onClick={() => { setTexts((ts) => ts.filter((t) => t.id !== txt.id)); setSelText(null); }}><Trash2 className="size-4" />حذف النص</Button>
        </div>}
      </section>

      <section className="glass space-y-3 rounded-2xl p-4">
        <h2 className="font-bold">التصدير</h2>
        <div className="grid gap-3 text-xs sm:grid-cols-3">
          <label>الصيغة<select value={format} onChange={(e) => setFormat(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2">{supported.length === 0 ? <option>غير مدعوم في هذا المتصفح</option> : supported.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
          <label>الجودة<select value={quality} onChange={(e) => setQuality(+e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2">{QUALITIES.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}</select></label>
          <label>الإطارات في الثانية<select value={fps} onChange={(e) => setFps(+e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2">{[24, 25, 30, 60].map((f) => <option key={f} value={f}>{f} fps</option>)}</select></label>
        </div>
        <p className="text-[11px] text-muted-foreground">التصدير يتم على جهازك بسرعة التشغيل العادية، فأبقِ الصفحة مفتوحة حتى ينتهي. الجودات العالية جدًا (4K) تحتاج جهازًا قويًا.</p>
        {exporting != null ? <div className="space-y-2"><div className="h-2 overflow-hidden rounded bg-secondary"><div className="h-full bg-gold transition-all" style={{ width: `${exporting}%` }} /></div><Button variant="glass" onClick={() => (playing.current = false)}>إلغاء التصدير ({exporting}%)</Button></div>
          : <Button variant="gold" size="lg" className="w-full" onClick={() => void exportVideo()}><Download className="size-4" />تصدير الفيديو</Button>}
        {result && <div className="space-y-2 rounded-xl border border-gold/40 p-3"><video src={result.url} controls className="max-h-72 w-full rounded-lg bg-black" /><div className="flex flex-wrap gap-2"><a href={result.url} download={result.name} className="inline-flex items-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-bold text-primary-foreground"><Download className="size-4" />تنزيل ({(result.blob.size / 1048576).toFixed(1)} م.ب)</a><Button variant="glass" onClick={() => void saveToLibrary()}><FolderOpen className="size-4" />حفظ في المكتبة</Button></div></div>}
      </section>

      <section className="glass space-y-2 rounded-2xl p-4">
        <h2 className="font-bold">أدوات الذكاء الاصطناعي للفيديو</h2>
        <p className="text-xs text-muted-foreground">تعمل هذه الأدوات بعد ربط نماذجها المفتوحة بسيرفرك من صفحة النماذج.</p>
        <div className="grid gap-2 sm:grid-cols-2">{videoModels.map((m) => <div key={m.id} className="rounded-lg border border-border p-2 text-xs"><b dir="auto">{m.name}</b><p className="text-muted-foreground">{m.description}</p></div>)}</div>
      </section>
    </div>
  );
}

function Range({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return <label className="block">{label}<Input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="h-6 px-0" /></label>;
}
