import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeftRight, Camera, Captions, Copy, Download, Film, FolderOpen, Image as ImageIcon, Languages, Layers, LibraryBig, Maximize2, Mic, Minimize2, Music,
  Palette, Pause, Play, Plus, Redo2, Scissors, Sparkles, Trash2, Type, Undo2, Upload, Volume2, Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl, uploadMedia } from "@/lib/media";
import { FONTS, SOCIAL_SIZES, loadFont } from "@/lib/studio-options";
import { modelsFor } from "@/lib/ai/registry";
import { decodeAudio, toWav, DEFAULT_FX, type VoiceFx } from "@/lib/voice-fx";
import { transcribeClip } from "@/lib/voice-recorder";
import { Mixer } from "@/lib/editor/audio";
import { keyed } from "@/lib/editor/keying";
import { backupLocal, loadProject, saveProject } from "@/lib/editor/projects";
import {
  ANIMS, FLAT_AUDIO, LANGS, NO_FILTERS, NO_KEY, TRANSITIONS, VOICES, audLen, clipLen, filterCss, mainLen, newProject, ovLen, totalLen,
  type Anim, type Asset, type AudioLayer, type Caption, type Clip, type Keying, type Overlay, type Project, type TextItem,
} from "@/lib/editor/types";
import { AudioRecorder, CameraCapture } from "@/components/MediaCapture";
import { VoiceEnhancer } from "@/components/VoiceEnhancer";
import { Button } from "@/components/ui/button";
import { LongPressStrip } from "./LongPressStrip";
import { EditorAI } from "./EditorAI";
import { TransitionPicker } from "./TransitionPicker";
import { TX_DURATION, txFx, type TxFx } from "@/lib/editor/transitions";
import { AudioFxEditor, BG_OPTIONS, Check, ColorIn, FiltersEditor, KeyEditor, Range, Section, Sel } from "./controls";

type SelType = "clip" | "overlay" | "audio" | "text" | "caption" | "logo";
interface Selection { type: SelType; id: string }
interface HitRect { type: SelType; id: string; x: number; y: number; w: number; h: number }
type Target = "main" | "overlay" | "audio" | "bg" | "logo";
type MediaEl = HTMLVideoElement | HTMLImageElement | HTMLAudioElement;

const QUALITIES = [{ id: 480, label: "480p (خفيف)", br: 2.5e6 }, { id: 720, label: "720p HD", br: 6e6 }, { id: 1080, label: "1080p Full HD", br: 12e6 }, { id: 1440, label: "1440p 2K", br: 20e6 }, { id: 2160, label: "2160p 4K", br: 40e6 }, { id: 4320, label: "4320p 8K (جهاز قوي)", br: 80e6 }];
const BITRATES = [{ id: "standard", label: "قياسي (حجم أصغر)", k: 1 }, { id: "high", label: "عالٍ — يوتيوب/احترافي", k: 1.6 }, { id: "max", label: "أقصى جودة (ملف كبير)", k: 2.5 }];
const FORMATS = [
  { id: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", label: "MP4 (H.264) — الأكثر توافقًا", ext: "mp4" }, { id: "video/mp4", label: "MP4", ext: "mp4" },
  { id: "video/webm;codecs=vp9,opus", label: "WebM (VP9) — جودة عالية وحجم أصغر", ext: "webm" }, { id: "video/webm;codecs=vp8,opus", label: "WebM (VP8)", ext: "webm" }, { id: "video/webm", label: "WebM", ext: "webm" },
];
const uid = () => crypto.randomUUID();
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (p: number) => 1 - Math.pow(1 - p, 3);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const isAr = (s: string) => /[\u0600-\u06FF]/.test(s);

function animOf(anim: Anim, since: number, until: number, len: number) {
  const p = clamp(since / 0.5), q = clamp(until / 0.3);
  const r = { alpha: q, dx: 0, dy: 0, scale: 1, frac: 1 };
  if (anim === "fade") r.alpha *= p;
  if (anim === "pop") { r.scale = p < 1 ? 0.5 + 0.5 * (1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2)) : 1; r.alpha *= clamp(p * 2); }
  if (anim === "slideUp") { r.dy = (1 - ease(p)) * 0.08; r.alpha *= p; }
  if (anim === "slideSide") { r.dx = (1 - ease(p)) * 0.3; r.alpha *= p; }
  if (anim === "typewriter") r.frac = clamp((since * 18) / Math.max(1, len));
  return r;
}

async function probe(kind: "video" | "audio" | "image", url: string) {
  if (kind === "image") return 0;
  const el = document.createElement(kind);
  el.preload = "metadata"; el.src = url;
  await new Promise<void>((r) => { el.onloadedmetadata = () => r(); el.onerror = () => r(); setTimeout(r, 8000); });
  if (!Number.isFinite(el.duration)) {
    el.currentTime = 1e9;
    await new Promise<void>((r) => { el.ondurationchange = () => Number.isFinite(el.duration) && r(); setTimeout(r, 2000); });
  }
  return Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 10;
}

function chunkText(text: string, maxWords = 6) {
  const out: string[] = [];
  for (const sentence of text.replace(/\s+/g, " ").split(/(?<=[.!?؟،,؛\n])\s*/)) {
    const words = sentence.trim().split(" ").filter(Boolean);
    for (let i = 0; i < words.length; i += maxWords) out.push(words.slice(i, i + maxWords).join(" "));
  }
  return out.filter(Boolean);
}
function distribute(chunks: string[], start: number, dur: number): Caption[] {
  const total = chunks.reduce((s, c) => s + c.length, 0) || 1; let t = start;
  return chunks.map((c) => { const d = (c.length / total) * dur; const cap = { id: uid(), start: t, end: t + d, text: c, translation: "" }; t += d; return cap; });
}

let grainCanvas: HTMLCanvasElement | null = null;
function grain() {
  if (grainCanvas) return grainCanvas;
  const c = document.createElement("canvas"); c.width = c.height = 160; const x = c.getContext("2d")!; const d = x.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 60; }
  x.putImageData(d, 0, 0); grainCanvas = c; return c;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const w of para.split(" ")) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    lines.push(cur);
  }
  return lines;
}

const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export function VideoEditor({ projectId }: { projectId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const els = useRef(new Map<string, MediaEl>());
  const mixer = useRef<Mixer | null>(null);
  const playing = useRef(false);
  const rects = useRef<HitRect[]>([]);
  const [proj, setProj] = useState<Project>(newProject);
  const [title, setTitle] = useState("");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [sel, setSel] = useState<Selection | null>(null);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [full, setFull] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set(["media"]));
  const [quality, setQuality] = useState(1080);
  const [bitrate, setBitrate] = useState("high");
  const [fps, setFps] = useState(30);
  const [format, setFormat] = useState("phone-mp4");
  const [exporting, setExporting] = useState<number | null>(null);
  const [result, setResult] = useState<{ url: string; blob: Blob; name: string } | null>(null);
  const [libTarget, setLibTarget] = useState<Target | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [enhFx, setEnhFx] = useState<VoiceFx>(DEFAULT_FX);
  const projRef = useRef(proj); projRef.current = proj;
  const timeRef = useRef(time); timeRef.current = time;
  const titleRef = useRef(title); titleRef.current = title;
  const history = useRef<{ past: string[]; future: string[]; skip: boolean; last: string }>({ past: [], future: [], skip: false, last: "" });

  const size = SOCIAL_SIZES.find((s) => s.id === proj.sizeId) ?? SOCIAL_SIZES[0]!;
  const ratio = size.w / size.h;
  const total = totalLen(proj);
  const supported = typeof MediaRecorder === "undefined" ? [] : FORMATS.filter((f) => MediaRecorder.isTypeSupported(f.id));
  useEffect(() => { if (!format && supported[0]) setFormat(supported[0].id); }, [supported, format]);

  const update = useCallback((fn: (p: Project) => Project) => setProj((p) => fn(p)), []);
  const toggle = (k: string, force?: boolean) => setOpen((s) => { const on = force ?? !s.has(k); const n = new Set(full ? [] : s); if (on) n.add(k); else n.delete(k); return n; });
  const [theater, setTheater] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [txPick, setTxPick] = useState<string | null>(null);
  const [vstt, setVstt] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  useEffect(() => { if (full && sel?.type === "clip") toggle("clip", true); }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- load & resolve private media links ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadProject(projectId).catch((e: Error) => { toast.error(e.message); return null; });
      if (!loaded || cancelled) return;
      const p = loaded.project; let dropped = 0;
      const resolve = async (a: Asset | null) => { if (!a) return null; if (a.path) { const url = await signedUrl(a.path); return url ? { ...a, url } : null; } return a.url.startsWith("blob:") ? null : a.url ? a : null; };
      const keep = async <T extends { asset: Asset }>(list: T[]) => (await Promise.all(list.map(async (x) => { const asset = await resolve(x.asset); if (!asset) { dropped++; return null; } return { ...x, asset }; }))).filter((x): x is Awaited<T> => !!x);
      p.clips = await keep(p.clips); p.overlays = await keep(p.overlays); p.audios = await keep(p.audios);
      p.brand = { ...p.brand, bgImage: await resolve(p.brand.bgImage), logo: await resolve(p.brand.logo) };
      if (cancelled) return;
      if (dropped) toast.warning(`${dropped} ملف لم يُحفظ في المكتبة (أكبر من 20 ميجابايت) فلم يُسترجع`);
      setTitle(loaded.title); setProj(p); setReady(true);
      [p.captionStyle.font, p.captionStyle.tFont, ...p.texts.map((t) => t.font)].forEach(loadFont);
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // ---------- media elements ----------
  const ensureEl = useCallback((id: string, kind: "video" | "image" | "audio", url: string) => {
    const cur = els.current.get(id);
    if (cur && cur.src === url) return cur;
    let el: MediaEl;
    if (kind === "image") { el = new Image(); el.crossOrigin = "anonymous"; el.src = url; el.onload = () => !playing.current && void seek(timeRef.current); }
    else { el = document.createElement(kind); el.crossOrigin = "anonymous"; el.preload = "auto"; if (el instanceof HTMLVideoElement) el.playsInline = true; el.src = url; if (el instanceof HTMLVideoElement) el.onloadeddata = () => !playing.current && void seek(timeRef.current); }
    els.current.set(id, el);
    return el;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const live = new Set<string>();
    proj.clips.forEach((c) => { ensureEl(c.id, c.kind, c.asset.url); live.add(c.id); });
    proj.overlays.forEach((o) => { ensureEl(o.id, o.kind, o.asset.url); live.add(o.id); });
    proj.audios.forEach((a) => { ensureEl(a.id, "audio", a.asset.url); live.add(a.id); });
    if (proj.brand.bgImage) { ensureEl("bg", "image", proj.brand.bgImage.url); live.add("bg"); }
    if (proj.brand.logo) { ensureEl("logo", "image", proj.brand.logo.url); live.add("logo"); }
    for (const [k, el] of els.current) if (!live.has(k)) { if (!(el instanceof HTMLImageElement)) el.pause(); els.current.delete(k); }
  }, [proj, ensureEl]);

  // ---------- autosave (local backup instantly, cloud after a pause) ----------
  useEffect(() => {
    if (!ready) return;
    backupLocal(projectId, title, proj);
    setSaveState("saving");
    const t = setTimeout(() => { saveProject(projectId, title, proj, totalLen(proj)).then(() => setSaveState("saved")).catch(() => setSaveState("error")); }, 1500);
    return () => clearTimeout(t);
  }, [proj, title, ready, projectId]);
  useEffect(() => {
    const flush = () => { if (!ready) return; backupLocal(projectId, titleRef.current, projRef.current); void saveProject(projectId, titleRef.current, projRef.current, totalLen(projRef.current)).catch(() => undefined); };
    const vis = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", vis);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", vis); flush(); };
  }, [ready, projectId]);

  // ---------- undo / redo ----------
  useEffect(() => {
    if (!ready) return;
    const h = history.current; const snap = JSON.stringify(proj);
    if (h.skip) { h.skip = false; h.last = snap; return; }
    const t = setTimeout(() => { if (h.last && h.last !== snap) { h.past.push(h.last); if (h.past.length > 80) h.past.shift(); h.future = []; } h.last = snap; }, 400);
    return () => clearTimeout(t);
  }, [proj, ready]);
  const undo = () => { const h = history.current; const prev = h.past.pop(); if (!prev) return; h.future.push(JSON.stringify(projRef.current)); h.skip = true; setProj(JSON.parse(prev) as Project); };
  const redo = () => { const h = history.current; const next = h.future.pop(); if (!next) return; h.past.push(JSON.stringify(projRef.current)); h.skip = true; setProj(JSON.parse(next) as Project); };

  // ---------- rendering ----------
  const setRes = useCallback((short: number) => {
    const c = canvasRef.current; if (!c) return;
    const w = ratio >= 1 ? Math.round(short * ratio) : short, h = ratio >= 1 ? short : Math.round(short / ratio);
    if (c.width !== w - (w % 2)) c.width = w - (w % 2);
    if (c.height !== h - (h % 2)) c.height = h - (h % 2);
  }, [ratio]);

  function locate(t: number) {
    let off = 0;
    for (const c of projRef.current.clips) { const l = clipLen(c); if (t < off + l) return { clip: c, off, lt: t - off }; off += l; }
    return null;
  }

  function drawMedia(ctx: CanvasRenderingContext2D, id: string, el: HTMLVideoElement | HTMLImageElement, key: Keying, filter: string, x: number, y: number, w: number, h: number) {
    if (key.mode !== "none") { const k = keyed(id, el, key, filter); if (k) { ctx.drawImage(k, x, y, w, h); return; } }
    ctx.filter = filter; ctx.drawImage(el, x, y, w, h); ctx.filter = "none";
  }
  const dims = (el: MediaEl | undefined) => !el || el instanceof HTMLAudioElement ? [0, 0] : el instanceof HTMLVideoElement ? [el.videoWidth, el.videoHeight] : [el.naturalWidth, el.naturalHeight];

  function drawClip(ctx: CanvasRenderingContext2D, p: Project, clip: Clip, lt: number, W: number, H: number, fx: TxFx | null) {
    const el = els.current.get(clip.id); const [sw, sh] = dims(el);
    if (!el || el instanceof HTMLAudioElement || !sw || !sh) return;
    const len = clipLen(clip);
    let alpha = fx?.alpha ?? 1;
    if (clip.fadeIn > 0) alpha = Math.min(alpha, lt / clip.fadeIn);
    if (clip.fadeOut > 0) alpha = Math.min(alpha, (len - lt) / clip.fadeOut);
    ctx.save();
    if (fx?.clip) { ctx.beginPath(); fx.clip(ctx, W, H); ctx.clip(); }
    ctx.globalAlpha = clamp(alpha);
    if (p.brand.bgBlur && clip.fit === "contain" && clip.key.mode === "none" && !p.brand.bgImage) {
      const b = Math.max(W / sw, H / sh) * 1.1; ctx.filter = "blur(28px) brightness(0.6)"; ctx.drawImage(el, (W - sw * b) / 2, (H - sh * b) / 2, sw * b, sh * b); ctx.filter = "none";
    }
    let s = (clip.fit === "cover" ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh)) * (clip.zoom / 100);
    if (clip.kenBurns) s *= 1 + 0.1 * (lt / len);
    s *= fx?.scale ?? 1;
    ctx.translate(W / 2 + (fx?.tx ?? 0), H / 2 + (fx?.ty ?? 0)); ctx.rotate(fx?.rot ?? 0); ctx.scale(fx?.sx ?? 1, fx?.sy ?? 1);
    ctx.rotate((clip.rotate * Math.PI) / 180); if (clip.flipX) ctx.scale(-1, 1);
    const dw = sw * s, dh = sh * s;
    drawMedia(ctx, clip.id, el, clip.key, filterCss({ ...clip.filters, blur: clip.filters.blur + (fx?.blur ?? 0) }), -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  function draw(t: number) {
    const c = canvasRef.current; const ctx = c?.getContext("2d"); if (!c || !ctx) return;
    const p = projRef.current; const W = c.width, H = c.height, S = Math.min(W, H) / 1080;
    const hits: HitRect[] = [];
    ctx.save(); ctx.globalAlpha = 1; ctx.filter = "none"; ctx.fillStyle = p.brand.bgColor; ctx.fillRect(0, 0, W, H);
    const bg = els.current.get("bg");
    const [bw, bh] = dims(bg);
    if (bg instanceof HTMLImageElement && bw && bh) { const s = Math.max(W / bw, H / bh); ctx.drawImage(bg, (W - bw * s) / 2, (H - bh * s) / 2, bw * s, bh * s); }

    // Main track (previous clip stays underneath during a transition)
    const hit = locate(t);
    if (hit) {
      const fx = hit.clip.transition !== "none" && hit.lt < TX_DURATION ? txFx(hit.clip.transition, ease(clamp(hit.lt / TX_DURATION)), W, H) : null;
      const idx = p.clips.indexOf(hit.clip); const prev = idx > 0 ? p.clips[idx - 1] : undefined;
      if (fx && prev) drawClip(ctx, p, prev, clipLen(prev) - 0.01, W, H, { alpha: fx.prevAlpha ?? 1, blur: 0, scale: fx.prevScale ?? 1, sx: 1, sy: 1, tx: fx.prevTx ?? 0, ty: fx.prevTy ?? 0, rot: 0 });
      drawClip(ctx, p, hit.clip, hit.lt, W, H, fx);
      ctx.globalAlpha = 1; ctx.filter = "none"; fx?.overlay?.(ctx, W, H);
    }
    ctx.restore();

    // Picture-in-picture layers
    for (const o of p.overlays) {
      const since = t - o.start, len = ovLen(o); if (since < 0 || since >= len) continue;
      const el = els.current.get(o.id); const [sw, sh] = dims(el); if (!el || el instanceof HTMLAudioElement || !sw || !sh) continue;
      const a = animOf(o.anim, since, len - since, 1);
      let dw = (o.w / 100) * W, dh = (dw * sh) / sw; if (o.shape === "circle") dh = dw;
      const cx = (o.x / 100 + a.dx) * W, cy = (o.y / 100 + a.dy) * H;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((o.rotate * Math.PI) / 180); ctx.scale(a.scale, a.scale); ctx.globalAlpha = (o.opacity / 100) * a.alpha;
      const path = new Path2D();
      if (o.shape === "circle") path.ellipse(0, 0, dw / 2, dh / 2, 0, 0, Math.PI * 2);
      else if (o.shape === "round") path.roundRect(-dw / 2, -dh / 2, dw, dh, Math.min(dw, dh) * 0.12);
      else path.rect(-dw / 2, -dh / 2, dw, dh);
      if (o.shadow && o.key.mode === "none") { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 30 * S; ctx.shadowOffsetY = 10 * S; ctx.fillStyle = "#000"; ctx.fill(path); ctx.restore(); }
      ctx.save(); if (o.key.mode === "none") ctx.clip(path);
      const cs = Math.max(dw / sw, dh / sh), mw = sw * cs, mh = sh * cs;
      drawMedia(ctx, o.id, el, o.key, filterCss(o.filters), -mw / 2, -mh / 2, mw, mh);
      ctx.restore();
      if (o.borderWidth > 0 && o.key.mode === "none") { ctx.lineWidth = o.borderWidth * S; ctx.strokeStyle = o.border; ctx.stroke(path); }
      ctx.restore();
      hits.push({ type: "overlay", id: o.id, x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh });
    }

    if (p.brand.letterbox) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H * 0.1); ctx.fillRect(0, H * 0.9, W, H * 0.1); }

    // Titles
    for (const tx of p.texts) {
      if (t < tx.start || t >= tx.end || !tx.text) continue;
      const a = animOf(tx.anim, t - tx.start, tx.end - t, tx.text.length);
      const fs = tx.size * S; const text = tx.text.slice(0, Math.ceil(tx.text.length * a.frac));
      ctx.save(); ctx.globalAlpha = a.alpha;
      ctx.font = `${tx.bold ? 700 : 400} ${fs}px "${tx.font}", "Noto Sans Arabic", sans-serif`;
      ctx.direction = isAr(tx.text) ? "rtl" : "ltr"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const lines = wrap(ctx, text, W * 0.9); const lh = fs * 1.35;
      const x = (tx.x / 100 + a.dx) * W, y0 = (tx.y / 100 + a.dy) * H - ((lines.length - 1) * lh) / 2;
      ctx.translate(x, y0); ctx.scale(a.scale, a.scale);
      let maxW = 0;
      lines.forEach((ln, i) => {
        const m = ctx.measureText(ln).width; maxW = Math.max(maxW, m); const y = i * lh;
        if (tx.bg !== "transparent") { ctx.fillStyle = tx.bg; ctx.beginPath(); ctx.roundRect(-m / 2 - fs * 0.35, y - lh / 2, m + fs * 0.7, lh, fs * 0.2); ctx.fill(); }
        ctx.fillStyle = tx.color; ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = fs * 0.15; ctx.fillText(ln, 0, y); ctx.shadowBlur = 0;
      });
      ctx.restore();
      hits.push({ type: "text", id: tx.id, x: x - maxW / 2 - fs * 0.35, y: y0 - lh / 2, w: maxW + fs * 0.7, h: lines.length * lh });
    }

    // Spoken captions + translation
    const cs = p.captionStyle; const cap = cs.show ? p.captions.find((c) => t >= c.start && t < c.end) : undefined;
    if (cap) {
      const fs = cs.size * S; ctx.save();
      ctx.font = `700 ${fs}px "${cs.font}", "Noto Sans Arabic", sans-serif`; ctx.textBaseline = "middle";
      const rtl = isAr(cap.text); const maxW = (cs.maxWidth / 100) * W; const lines = wrap(ctx, cap.text, maxW); const lh = fs * 1.4;
      const words = cap.text.split(/\s+/).filter(Boolean); const activeIdx = Math.min(words.length - 1, Math.floor(((t - cap.start) / (cap.end - cap.start)) * words.length));
      const cx = (cs.x / 100) * W; const y0 = (cs.y / 100) * H - ((lines.length - 1) * lh) / 2; const space = ctx.measureText(" ").width;
      let wi = 0; let boxW = 0;
      lines.forEach((ln, li) => {
        const lw = ctx.measureText(ln).width; boxW = Math.max(boxW, lw); const y = y0 + li * lh;
        if (cs.bg !== "transparent") { ctx.fillStyle = cs.bg; ctx.beginPath(); ctx.roundRect(cx - lw / 2 - fs * 0.4, y - lh / 2, lw + fs * 0.8, lh, fs * 0.25); ctx.fill(); }
        let x = rtl ? cx + lw / 2 : cx - lw / 2;
        ctx.textAlign = rtl ? "right" : "left"; ctx.direction = rtl ? "rtl" : "ltr";
        for (const w of ln.split(" ").filter(Boolean)) {
          const ww = ctx.measureText(w).width; const active = cs.highlight && wi === activeIdx;
          const left = rtl ? x - ww : x;
          if (active) { ctx.fillStyle = cs.activeBg; ctx.beginPath(); ctx.roundRect(left - fs * 0.12, y - lh * 0.42, ww + fs * 0.24, lh * 0.84, fs * 0.15); ctx.fill(); }
          ctx.fillStyle = active ? cs.activeColor : cs.color; ctx.fillText(w, x, y);
          x = rtl ? x - ww - space : x + ww + space; wi++;
        }
      });
      hits.push({ type: "caption", id: cap.id, x: cx - boxW / 2 - fs * 0.4, y: y0 - lh / 2, w: boxW + fs * 0.8, h: lines.length * lh });
      if (cs.showTranslation && cap.translation) {
        const tf = cs.tSize * S; ctx.font = `600 ${tf}px "${cs.tFont}", "Noto Sans Arabic", sans-serif`; ctx.textAlign = "center"; ctx.direction = isAr(cap.translation) ? "rtl" : "ltr";
        const tl = wrap(ctx, cap.translation, maxW); const tlh = tf * 1.35; const ty0 = (cs.tY / 100) * H - ((tl.length - 1) * tlh) / 2;
        tl.forEach((ln, i) => { const m = ctx.measureText(ln).width; const y = ty0 + i * tlh; if (cs.tBg !== "transparent") { ctx.fillStyle = cs.tBg; ctx.beginPath(); ctx.roundRect(cx - m / 2 - tf * 0.35, y - tlh / 2, m + tf * 0.7, tlh, tf * 0.2); ctx.fill(); } ctx.fillStyle = cs.tColor; ctx.fillText(ln, cx, y); });
      }
      ctx.restore();
    }

    // Logo
    const logo = els.current.get("logo"); const [lw0, lh0] = dims(logo);
    if (logo instanceof HTMLImageElement && lw0 && lh0) {
      const w = (p.brand.logoSize / 100) * W, h = (w * lh0) / lw0; const x = (p.brand.logoX / 100) * W - w / 2, y = (p.brand.logoY / 100) * H - h / 2;
      ctx.save(); ctx.globalAlpha = p.brand.logoOpacity / 100; ctx.drawImage(logo, x, y, w, h); ctx.restore();
      hits.push({ type: "logo", id: "logo", x, y, w, h });
    }

    if (p.brand.vignette > 0) { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) / 2); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${p.brand.vignette / 100})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (p.brand.grain > 0) { ctx.save(); ctx.globalAlpha = p.brand.grain / 100; ctx.globalCompositeOperation = "overlay"; const pat = ctx.createPattern(grain(), "repeat"); if (pat) { ctx.translate(Math.random() * 160, Math.random() * 160); ctx.fillStyle = pat; ctx.fillRect(-160, -160, W + 320, H + 320); } ctx.restore(); }
    // Pro grade: glow, colour tint, camera shake and global fades.
    const b = p.brand;
    if ((b.bloom ?? 0) > 0) { ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = (b.bloom ?? 0) / 160; ctx.filter = `blur(${Math.round(Math.min(W, H) / 60)}px) brightness(1.2)`; ctx.drawImage(ctx.canvas, 0, 0); ctx.restore(); }
    if ((b.tintStrength ?? 0) > 0 && b.tint) { ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = (b.tintStrength ?? 0) / 100; ctx.fillStyle = b.tint; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if ((b.shake ?? 0) > 0) { const k = ((b.shake ?? 0) / 100) * Math.min(W, H) * 0.012; ctx.save(); ctx.globalCompositeOperation = "copy"; ctx.drawImage(ctx.canvas, Math.sin(t * 23) * k, Math.cos(t * 17) * k); ctx.restore(); }
    const fs = b.fadeStart ?? 0, fe = b.fadeEnd ?? 0; const end = totalLen(p);
    const black = Math.max(fs > 0 ? 1 - t / fs : 0, fe > 0 ? 1 - (end - t) / fe : 0);
    if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(black)})`; ctx.fillRect(0, 0, W, H); }
    rects.current = hits;
  }

  // ---------- timing ----------
  function targets(t: number) {
    const p = projRef.current; const out: { el: HTMLMediaElement; active: boolean; at: number; rate: number; hold?: boolean }[] = [];
    let off = 0;
    p.clips.forEach((c, i) => {
      const len = clipLen(c); const el = els.current.get(c.id); const next = p.clips[i + 1];
      if (el instanceof HTMLVideoElement) {
        const active = t >= off && t < off + len;
        const hold = !active && !!next && next.transition !== "none" && t >= off + len && t < off + len + TX_DURATION;
        out.push({ el, active: active || hold, hold, at: hold ? Math.max(c.trimStart, c.trimEnd - 0.05) : c.trimStart + clamp(t - off, 0, len) * c.speed, rate: c.speed });
      }
      off += len;
    });
    for (const o of p.overlays) { const el = els.current.get(o.id); if (el instanceof HTMLVideoElement) out.push({ el, active: t >= o.start && t < o.start + ovLen(o), at: o.trimStart + clamp(t - o.start, 0, ovLen(o)), rate: 1 }); }
    return out;
  }
  async function seek(t: number) {
    setTime(t); timeRef.current = t;
    await Promise.all(targets(t).filter((x) => x.active && Math.abs(x.el.currentTime - x.at) > 0.02).map((x) => new Promise<void>((r) => { x.el.addEventListener("seeked", () => r(), { once: true }); setTimeout(r, 700); x.el.currentTime = x.at; })));
    draw(t);
  }
  useEffect(() => { if (!ready || playing.current || exporting != null) return; const id = setTimeout(() => void seek(timeRef.current), 40); return () => clearTimeout(id); }, [proj, ready, full, theater]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (exporting == null) setRes(720); }, [setRes, exporting, full, theater]);

  function sync(t: number, total: number) {
    const p = projRef.current; const mx = mixer.current;
    const syncEl = (el: HTMLMediaElement, active: boolean, at: number, rate: number, hold = false) => {
      if (!active) { if (!el.paused) el.pause(); return; }
      if (hold) { if (!el.paused) el.pause(); if (Math.abs(el.currentTime - at) > 0.15) el.currentTime = at; return; }
      if (el.playbackRate !== rate) el.playbackRate = rate;
      if (el.paused) { el.currentTime = at; void el.play().catch(() => undefined); }
      else if (Math.abs(el.currentTime - at) > 0.3) el.currentTime = at;
    };
    for (const x of targets(t)) syncEl(x.el, x.active, x.at, x.rate, x.hold);
    if (mx) {
      for (const c of p.clips) { const el = els.current.get(c.id); if (el instanceof HTMLVideoElement) mx.apply(el, c.audio, 1, c.muted); }
      for (const o of p.overlays) { const el = els.current.get(o.id); if (el instanceof HTMLVideoElement) mx.apply(el, o.audio, 1, o.muted); }
    }
    for (const a of p.audios) {
      const el = els.current.get(a.id); if (!(el instanceof HTMLAudioElement)) continue;
      const len = audLen(a); const rel = t - a.start; const active = rel >= 0 && (a.loop || rel < len);
      syncEl(el, active, a.trimStart + (a.loop ? rel % len : rel), 1);
      let fade = 1;
      if (a.fadeIn > 0) fade = Math.min(fade, rel / a.fadeIn);
      if (a.fadeOut > 0) fade = Math.min(fade, (a.loop ? total - t : len - rel) / a.fadeOut);
      // Auto-ducking: lower music and effects while any voice layer speaks.
      if (a.kind !== "voice" && (p.duck ?? 100) < 100 && p.audios.some((v) => v.kind === "voice" && !v.muted && t >= v.start && t < v.start + audLen(v))) fade *= (p.duck ?? 100) / 100;
      if ((p.audioFadeIn ?? 0) > 0) fade *= clamp(t / (p.audioFadeIn ?? 1));
      if ((p.audioFadeOut ?? 0) > 0) fade *= clamp((total - t) / (p.audioFadeOut ?? 1));
      mx?.apply(el, a.audio, fade, a.muted);
    }
    mx?.setMaster(p.masterGain);
  }
  const pauseAll = () => { for (const el of els.current.values()) if (!(el instanceof HTMLImageElement)) el.pause(); };

  const jumpRef = useRef<number | null>(null);
  async function run(from: number, onProgress?: (t: number) => void) {
    if (!mixer.current) mixer.current = new Mixer();
    await mixer.current.resume();
    playing.current = true; setIsPlaying(true);
    const total = totalLen(projRef.current);
    const t0 = performance.now() - from * 1000; let lastUi = 0; let t = from;
    let base = t0;
    while (playing.current) {
      if (jumpRef.current != null) { const j = jumpRef.current; jumpRef.current = null; base = performance.now() - j * 1000; for (const x of targets(j)) if (x.active) x.el.currentTime = x.at; }
      t = (performance.now() - base) / 1000; if (t >= total) break;
      sync(t, total); draw(t);
      const now = performance.now(); if (now - lastUi > 120) { setTime(t); timeRef.current = t; onProgress?.(t); lastUi = now; }
      await frame();
    }
    pauseAll();
    const finished = playing.current; playing.current = false; setIsPlaying(false); setTime(Math.min(t, total)); timeRef.current = Math.min(t, total);
    return finished;
  }
  // Scrubbing works while playing: the play loop jumps to the new time.
  const scrub = (t: number) => { const v = Math.max(0, Math.min(total, t)); if (playing.current) { jumpRef.current = v; setTime(v); timeRef.current = v; } else void seek(v); };
  const togglePlay = () => {
    if (playing.current) { playing.current = false; return; }
    if (total <= 0) { toast.error("أضف فيديو أو صورة أولًا"); return; }
    void run(time >= total - 0.05 ? 0 : time);
  };

  // ---------- adding media ----------
  const uploadInBackground = (file: File, apply: (path: string) => void) => {
    if (file.size > 20 * 1024 * 1024) { toast.warning(`«${file.name}» أكبر من 20 ميجابايت: يعمل الآن لكنه لن يُسترجع بعد الخروج`); return; }
    uploadMedia(file).then((row) => apply(row.storage_path)).catch((e: Error) => toast.error(e.message));
  };
  const setAssetPath = (id: string, path: string) => update((p) => ({
    ...p,
    clips: p.clips.map((c) => (c.id === id ? { ...c, asset: { ...c.asset, path } } : c)),
    overlays: p.overlays.map((o) => (o.id === id ? { ...o, asset: { ...o.asset, path } } : o)),
    audios: p.audios.map((a) => (a.id === id ? { ...a, asset: { ...a.asset, path } } : a)),
    brand: { ...p.brand, bgImage: id === "bg" && p.brand.bgImage ? { ...p.brand.bgImage, path } : p.brand.bgImage, logo: id === "logo" && p.brand.logo ? { ...p.brand.logo, path } : p.brand.logo },
  }));

  async function addAsset(target: Target, kind: "video" | "image" | "audio", asset: Asset): Promise<string | null> {
    const id = target === "bg" ? "bg" : target === "logo" ? "logo" : uid();
    if (target === "bg" || target === "logo") {
      if (kind !== "image") { toast.error("اختر صورة"); return null; }
      update((p) => ({ ...p, brand: { ...p.brand, [target === "bg" ? "bgImage" : "logo"]: asset } }));
      return id;
    }
    const natural = await probe(kind, asset.url);
    if (kind === "audio" || target === "audio") {
      if (kind === "image") { toast.error("اختر ملفًا صوتيًا"); return null; }
      const layer: AudioLayer = { id, name: asset.name, asset, kind: /music|موسيق/i.test(asset.name) ? "music" : "voice", start: target === "audio" ? timeRef.current : 0, natural, trimStart: 0, trimEnd: natural, fadeIn: 0, fadeOut: 0, loop: false, muted: false, audio: { ...FLAT_AUDIO } };
      update((p) => ({ ...p, audios: [...p.audios, layer] })); setSel({ type: "audio", id }); toggle("voice", true);
      return id;
    }
    if (target === "overlay") {
      const o: Overlay = { id, kind, asset, start: timeRef.current, natural, trimStart: 0, trimEnd: natural, imageDuration: 4, x: 75, y: 30, w: 35, opacity: 100, shape: "round", border: "#FFD700", borderWidth: 0, shadow: true, rotate: 0, anim: "pop", muted: false, key: { ...NO_KEY }, audio: { ...FLAT_AUDIO }, filters: { ...NO_FILTERS } };
      update((p) => ({ ...p, overlays: [...p.overlays, o] })); setSel({ type: "overlay", id }); toggle("pip", true);
      return id;
    }
    const c: Clip = { id, kind, asset, natural, trimStart: 0, trimEnd: natural, imageDuration: 4, speed: 1, fit: kind === "image" ? "cover" : "contain", kenBurns: kind === "image", transition: projRef.current.clips.length ? "fade" : "none", fadeIn: 0, fadeOut: 0, muted: false, flipX: false, rotate: 0, zoom: 100, filters: { ...NO_FILTERS }, key: { ...NO_KEY }, audio: { ...FLAT_AUDIO } };
    update((p) => ({ ...p, clips: [...p.clips, c] })); setSel({ type: "clip", id });
    return id;
  }
  async function addFiles(files: FileList | File[] | null, target: Target) {
    for (const f of Array.from(files ?? [])) {
      const kind = f.type.startsWith("video/") ? "video" : f.type.startsWith("image/") ? "image" : f.type.startsWith("audio/") ? "audio" : null;
      if (!kind) { toast.error(`صيغة غير مدعومة: ${f.name}`); continue; }
      const id = await addAsset(target, kind, { path: null, url: URL.createObjectURL(f), name: f.name });
      if (id) uploadInBackground(f, (path) => setAssetPath(id, path));
    }
  }
  const { data: library = [] } = useQuery({
    queryKey: ["editor-library-assets"], enabled: libTarget != null,
    queryFn: async () => (await supabase.from("media_assets").select("id,name,kind,storage_path").in("kind", ["video", "image", "audio"]).order("created_at", { ascending: false }).limit(80)).data ?? [],
  });
  async function fromLibrary(a: { kind: string; storage_path: string; name: string }) {
    if (!libTarget) return;
    const url = await signedUrl(a.storage_path); if (!url) { toast.error("تعذر فتح الملف"); return; }
    await addAsset(libTarget, a.kind as "video" | "image" | "audio", { path: a.storage_path, url, name: a.name });
    toast.success("أُضيف"); setLibTarget(null);
  }

  // ---------- editing helpers ----------
  const updClip = (id: string, patch: Partial<Clip>) => update((p) => ({ ...p, clips: p.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const updOv = (id: string, patch: Partial<Overlay>) => update((p) => ({ ...p, overlays: p.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  const updAud = (id: string, patch: Partial<AudioLayer>) => update((p) => ({ ...p, audios: p.audios.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const updText = (id: string, patch: Partial<TextItem>) => update((p) => ({ ...p, texts: p.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const updCap = (id: string, patch: Partial<Caption>) => update((p) => ({ ...p, captions: p.captions.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const reorder = (from: number, to: number) => update((p) => { const n = [...p.clips]; const [m] = n.splice(from, 1); if (m) n.splice(to, 0, m); return { ...p, clips: n }; });
  const startOf = (id: string) => { let off = 0; for (const c of projRef.current.clips) { if (c.id === id) return off; off += clipLen(c); } return 0; };

  function removeSelected() {
    if (!sel) return;
    update((p) => ({ ...p, clips: p.clips.filter((x) => x.id !== sel.id), overlays: p.overlays.filter((x) => x.id !== sel.id), audios: p.audios.filter((x) => x.id !== sel.id), texts: p.texts.filter((x) => x.id !== sel.id), captions: p.captions.filter((x) => x.id !== sel.id), brand: sel.type === "logo" ? { ...p.brand, logo: null } : p.brand }));
    setSel(null);
  }
  function duplicateSelected() {
    if (!sel) return; const id = uid();
    update((p) => {
      const dup = <T extends { id: string }>(list: T[]) => { const i = list.findIndex((x) => x.id === sel.id); if (i < 0) return list; const n = [...list]; n.splice(i + 1, 0, { ...list[i]!, id }); return n; };
      return { ...p, clips: dup(p.clips), overlays: dup(p.overlays), audios: dup(p.audios), texts: dup(p.texts) };
    });
    setSel({ ...sel, id });
  }
  function splitAtPlayhead() {
    const hit = locate(time);
    if (!hit || hit.lt < 0.2 || clipLen(hit.clip) - hit.lt < 0.2) { toast.error("ضع المؤشر داخل مقطع لقصّه"); return; }
    const c = hit.clip; const id = uid();
    if (c.kind === "video") { const cut = c.trimStart + hit.lt * c.speed; update((p) => ({ ...p, clips: p.clips.flatMap((x) => (x.id === c.id ? [{ ...x, trimEnd: cut, fadeOut: 0 }, { ...x, id, trimStart: cut, fadeIn: 0, transition: "none" as const }] : [x])) })); }
    else update((p) => ({ ...p, clips: p.clips.flatMap((x) => (x.id === c.id ? [{ ...x, imageDuration: hit.lt, fadeOut: 0 }, { ...x, id, imageDuration: x.imageDuration - hit.lt, fadeIn: 0, transition: "none" as const }] : [x])) }));
    toast.success("قُصّ المقطع إلى جزأين");
  }
  const addText = () => {
    const id = uid(); loadFont("Cairo");
    update((p) => ({ ...p, texts: [...p.texts, { id, text: "عنوان الفيديو", start: time, end: Math.max(time + 4, Math.min(total, time + 4)), x: 50, y: 15, size: 84, color: "#FFFFFF", bg: "transparent", font: "Cairo", bold: true, anim: "pop" }] }));
    setSel({ type: "text", id }); toggle("brand", true);
  };
  const snapshot = () => { const c = canvasRef.current; if (!c) return; c.toBlob((b) => { if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `لقطة-${Date.now()}.png`; a.click(); }, "image/png"); };

  // ---------- voice & captions ----------
  const authHeader = async () => ({ Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}` });
  async function generateVoice() {
    const text = proj.script.trim(); if (!text) { toast.error("اكتب النص أولًا"); return; }
    setBusy("tts");
    try {
      const parts: string[] = []; let cur = "";
      for (const s of text.split(/(?<=[.!?؟\n])\s*/)) { if ((cur + " " + s).length > 1400 && cur) { parts.push(cur); cur = s; } else cur = cur ? `${cur} ${s}` : s; }
      if (cur) parts.push(cur);
      const bufs: AudioBuffer[] = [];
      for (const part of parts) {
        const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeader()) }, body: JSON.stringify({ text: part, voice: proj.voice }) });
        if (!r.ok) throw new Error((await r.text()) || "تعذر توليد الصوت");
        bufs.push(await decodeAudio(await r.blob()));
      }
      const first = bufs[0]!; const out = new AudioBuffer({ length: bufs.reduce((s, b) => s + b.length, 0), numberOfChannels: 1, sampleRate: first.sampleRate });
      let off = 0; for (const b of bufs) { out.copyToChannel(b.getChannelData(0), 0, off); off += b.length; }
      const file = new File([toWav(out)], `تعليق-صوتي-${Date.now()}.wav`, { type: "audio/wav" });
      const id = await addAsset("audio", "audio", { path: null, url: URL.createObjectURL(file), name: "تعليق صوتي من النص" });
      if (id) { updAud(id, { start: 0, kind: "voice", audio: { mic: "sm7b", gain: 150, bass: 1, presence: 1, air: 1, comp: 55, clean: 20 } }); uploadInBackground(file, (path) => setAssetPath(id, path)); }
      toast.success("تم توليد الصوت وإضافته كطبقة");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  const voiceLayer = () => proj.audios.find((a) => sel?.type === "audio" && a.id === sel.id) ?? proj.audios.find((a) => a.kind === "voice") ?? proj.audios[0];
  function captionsFromScript() {
    const chunks = chunkText(proj.script); if (!chunks.length) { toast.error("اكتب النص أولًا"); return; }
    const v = voiceLayer(); const start = v?.start ?? 0; const dur = v ? audLen(v) : Math.max(total, chunks.length * 2);
    update((p) => ({ ...p, captions: distribute(chunks, start, dur) })); toast.success(`تم إنشاء ${chunks.length} سطر ترجمة نصية`);
  }
  async function captionsFromAudio() {
    const v = voiceLayer(); if (!v) { toast.error("أضف أو سجّل صوتًا أولًا"); return; }
    setBusy("stt");
    try {
      const blob = await (await fetch(v.asset.url)).blob();
      if (blob.size > 24 * 1024 * 1024) throw new Error("الملف الصوتي كبير جدًا للتفريغ (الحد 24 ميجابايت)");
      const text = await transcribeClip(blob);
      if (!text.trim()) throw new Error("لم يُتعرف على كلام في هذا الصوت");
      update((p) => ({ ...p, script: p.script || text, captions: distribute(chunkText(text), v.start, audLen(v)) }));
      toast.success("تم تفريغ الكلام إلى ترجمة نصية متزامنة");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  async function captionsFromVideo() {
    const p = projRef.current;
    if (!p.clips.some((c) => c.kind === "video" && !c.muted)) { toast.error("أضف فيديو فيه كلام أولًا"); return; }
    setBusy("vstt"); setVstt("جارٍ استخراج صوت الفيديو…");
    try {
      const rate = 16000; const totalS = mainLen(p); const pcm = new Float32Array(Math.ceil(totalS * rate) + 1);
      let off = 0;
      for (const c of p.clips) {
        const len = clipLen(c);
        if (c.kind === "video" && !c.muted) {
          try {
            const buf = await decodeAudio(await (await fetch(c.asset.url)).blob()); const ch = buf.getChannelData(0); const ch2 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch;
            const start = Math.round(off * rate); const n = Math.floor(len * rate);
            for (let i = 0; i < n; i++) { const j = Math.floor((c.trimStart + (i / rate) * c.speed) * buf.sampleRate); pcm[start + i] = ((ch[j] ?? 0) + (ch2[j] ?? 0)) / 2; }
          } catch { toast.warning(`تعذر قراءة صوت «${c.asset.name}»`); }
        }
        off += len;
      }
      // Loudness per 50ms window, then cut segments at natural pauses.
      const win = rate / 20; const rms: number[] = [];
      for (let i = 0; i < pcm.length; i += win) { let s2 = 0; const e = Math.min(pcm.length, i + win); for (let k = i; k < e; k++) s2 += pcm[k]! * pcm[k]!; rms.push(Math.sqrt(s2 / Math.max(1, e - i))); }
      const peak = Math.max(...rms, 0); const thr = Math.max(0.006, peak * 0.07);
      const segs: [number, number][] = []; let segStart = -1, quiet = 0;
      rms.forEach((v, i) => {
        const loud = v > thr;
        if (loud) { if (segStart < 0) segStart = Math.max(0, i - 4); quiet = 0; } else if (segStart >= 0) quiet++;
        const dur = segStart >= 0 ? (i - segStart) / 20 : 0;
        if (segStart >= 0 && ((quiet >= 8 && dur > 1) || (quiet >= 3 && dur > 14) || dur > 28 || i === rms.length - 1)) { segs.push([segStart / 20, (i - quiet + 3) / 20]); segStart = -1; quiet = 0; }
      });
      if (!segs.length) throw new Error("لم يُعثر على كلام في صوت الفيديو");
      const caps: Caption[] = []; const allText: string[] = [];
      for (const [i, [a, b]] of segs.entries()) {
        setVstt(`جارٍ تحويل الكلام إلى نص… ${i + 1}/${segs.length}`);
        const s0 = Math.floor(a * rate), s1 = Math.min(pcm.length, Math.ceil(b * rate)); if (s1 - s0 < rate * 0.3) continue;
        const ab = new AudioBuffer({ length: s1 - s0, numberOfChannels: 1, sampleRate: rate }); ab.copyToChannel(pcm.slice(s0, s1), 0);
        const text = (await transcribeClip(new Blob([toWav(ab)], { type: "audio/wav" }))).trim();
        if (!text) continue; allText.push(text);
        caps.push(...distribute(chunkText(text), a, b - a));
        update((pp) => ({ ...pp, captions: [...caps] }));
      }
      if (!caps.length) throw new Error("لم يُتعرف على كلام واضح");
      update((pp) => ({ ...pp, captions: caps, script: pp.script || allText.join("\n"), captionStyle: { ...pp.captionStyle, show: true } }));
      toast.success(`تم: ${caps.length} سطر متزامن مع كلام الفيديو`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); setVstt(null); }
  }
  const pinch = useRef<{ pts: Map<number, { x: number; y: number }>; d0: number; z0: number }>({ pts: new Map(), d0: 0, z0: 1 });
  const [zoomV, setZoomV] = useState(1);
  async function enterTheater() {
    setZoomV(1); setTheater(true);
    await new Promise((r) => setTimeout(r, 30));
    try { await stageRef.current?.requestFullscreen?.({ navigationUI: "hide" }); } catch { /* iOS */ }
    if (ratio > 1) {
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      try { await o.lock?.("landscape"); setRotated(false); } catch { setRotated(window.innerHeight > window.innerWidth); }
    }
  }
  function exitTheater() {
    setTheater(false); setRotated(false);
    try { (screen.orientation as ScreenOrientation & { unlock?: () => void }).unlock?.(); } catch { /* ignore */ }
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }
  useEffect(() => { const h = () => { if (!document.fullscreenElement) { setTheater(false); setRotated(false); } }; document.addEventListener("fullscreenchange", h); return () => document.removeEventListener("fullscreenchange", h); }, []);
  async function translateAll() {
    if (!proj.captions.length) { toast.error("أنشئ الترجمة النصية أولًا"); return; }
    setBusy("tr");
    try {
      const r = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeader()) }, body: JSON.stringify({ texts: proj.captions.map((c) => c.text), target: proj.captionStyle.targetLang }) });
      if (!r.ok) throw new Error((await r.text()) || "تعذرت الترجمة");
      const { translations } = (await r.json()) as { translations: string[] };
      update((p) => ({ ...p, captions: p.captions.map((c, i) => ({ ...c, translation: translations[i] ?? c.translation })), captionStyle: { ...p.captionStyle, showTranslation: true } }));
      toast.success("تمت الترجمة");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  const exportSrt = (useTranslation: boolean) => {
    const ts = (s: number) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
    const body = proj.captions.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${useTranslation ? c.translation : c.text}\n`).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/plain" })); a.download = `ترجمة-${useTranslation ? proj.captionStyle.targetLang : "original"}.srt`; a.click();
  };

  // ---------- export ----------
  async function exportVideo() {
    if (total <= 0) { toast.error("أضف مقاطع أولًا"); return; }
    const phone = format === "phone-mp4";
    const fmtDef = phone ? supported[0] : FORMATS.find((f) => f.id === format); if (!fmtDef) { toast.error("المتصفح لا يدعم التصدير، جرّب Chrome"); return; }
    const c = canvasRef.current; const q = QUALITIES.find((x) => x.id === quality);
    if (!c || !q) return;
    let stream: MediaStream | undefined; let rec: MediaRecorder | undefined;
    try {
    playing.current = false; await frame();
    setExporting(0); setResult(null); setRes(quality);
    if (!mixer.current) mixer.current = new Mixer();
    await Promise.all([...proj.texts.map((t) => t.font), proj.captionStyle.font, proj.captionStyle.tFont].map((f) => document.fonts.load(`700 20px "${f}"`).catch(() => undefined)));
    await seek(0);
    await mixer.current.resume();
    const capture = c.captureStream(fps); stream = capture; mixer.current.dest.stream.getAudioTracks().forEach((tr) => capture.addTrack(tr));
    rec = new MediaRecorder(stream, { mimeType: fmtDef.id, videoBitsPerSecond: Math.round(q.br * (BITRATES.find((x) => x.id === bitrate)?.k ?? 1)), audioBitsPerSecond: 320000 });
    const chunks: Blob[] = []; rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const recorder = rec;
    const stopped = new Promise<void>((resolve, reject) => { recorder.onstop = () => resolve(); recorder.onerror = () => reject(new Error("تعذر تسجيل هذه الجودة؛ جرّب 720p أو جهازًا أقوى")); });
    rec.start(500);
    const ok = await run(0, (t) => setExporting(Math.min(99, Math.round((t / total) * 100))));
    rec.stop(); await stopped; stream.getVideoTracks().forEach((t) => t.stop());
    // Thumbnail from the first second.
    await seek(Math.min(1, total / 2));
    const thumb = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.8));
    setRes(720); void seek(0);
    if (!ok) { toast("أُلغي التصدير"); return; }
    let blob = new Blob(chunks, { type: recorder.mimeType.split(";")[0] ?? "video/webm" });
    if (phone) {
      const { phoneMp4 } = await import("@/lib/editor/phone-export");
      blob = await phoneMp4(blob, (v) => setExporting(Math.round(v * 100)));
    }
    const name = `${title || "abqarino"}-${quality}p.${phone ? "mp4" : fmtDef.ext}`;
    setResult({ url: URL.createObjectURL(blob), blob, name });
    toast.success("الفيديو جاهز");
    try {
      const extra: { export_path?: string; thumb_path?: string } = {};
      if (thumb) extra.thumb_path = (await uploadMedia(new File([thumb], `غلاف-${title}.jpg`, { type: "image/jpeg" }), "image")).storage_path;
      if (blob.size <= 20 * 1024 * 1024) extra.export_path = (await uploadMedia(new File([blob], name, { type: blob.type }), "video")).storage_path;
      else toast.warning("الفيديو أكبر من 20 ميجابايت: نزّله على جهازك (لم يُحفظ في المكتبة)");
      await saveProject(projectId, title, projRef.current, total, extra);
      if (extra.export_path) toast.success("حُفظ الفيديو في مكتبة المحرر");
    } catch (e) { toast.error((e as Error).message); }
    } catch (e) { toast.error((e as Error).message || "تعذر التصدير؛ جرّب جودة أقل"); }
    finally { if (rec?.state === "recording") rec.stop(); stream?.getVideoTracks().forEach((track) => track.stop()); playing.current = false; pauseAll(); setIsPlaying(false); setExporting(null); setRes(720); }
  }

  // ---------- canvas direct manipulation ----------
  const dragRef = useRef<{ type: SelType; id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => { const c = e.currentTarget; const r = c.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height, W: c.width, H: c.height }; };
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onCanvasDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const now = performance.now();
    // Second finger of a pinch must never count as a double-tap (that exited full screen).
    if (theater && (!e.isPrimary || pinch.current.pts.size > 0)) { lastTap.current = 0; return; }
    if (now - lastTap.current < 320) { lastTap.current = 0; if (tapTimer.current) clearTimeout(tapTimer.current); tapTimer.current = null; dragRef.current = null; if (theater) exitTheater(); else void enterTheater(); return; }
    lastTap.current = now;
    // One tap = play/pause (delayed slightly so a double-tap can still open full screen).
    const queueToggle = () => { if (tapTimer.current) clearTimeout(tapTimer.current); tapTimer.current = setTimeout(() => { tapTimer.current = null; if (pinch.current.pts.size < 2) togglePlay(); }, 330); };
    if (theater) { queueToggle(); return; }
    const { x, y } = toCanvas(e);
    const hit = [...rects.current].reverse().find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!hit) { const m = locate(time); if (m) setSel({ type: "clip", id: m.clip.id }); queueToggle(); return; }
    setSel({ type: hit.type, id: hit.id });
    const p = projRef.current;
    const pos = hit.type === "overlay" ? p.overlays.find((o) => o.id === hit.id) : hit.type === "text" ? p.texts.find((t) => t.id === hit.id) : null;
    const [ox, oy] = pos ? [pos.x, pos.y] : hit.type === "caption" ? [p.captionStyle.x, p.captionStyle.y] : [p.brand.logoX, p.brand.logoY];
    dragRef.current = { type: hit.type, id: hit.id, sx: x, sy: y, ox, oy };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onCanvasMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = dragRef.current; if (!d) return;
    const { x, y, W, H } = toCanvas(e);
    let nx = clamp(d.ox + ((x - d.sx) / W) * 100, 0, 100), ny = clamp(d.oy + ((y - d.sy) / H) * 100, 0, 100);
    if (Math.abs(nx - 50) < 1.5) nx = 50; if (Math.abs(ny - 50) < 1.5) ny = 50;
    if (d.type === "overlay") updOv(d.id, { x: nx, y: ny });
    else if (d.type === "text") updText(d.id, { x: nx, y: ny });
    else if (d.type === "caption") update((p) => ({ ...p, captionStyle: { ...p.captionStyle, x: nx, y: ny } }));
    else if (d.type === "logo") update((p) => ({ ...p, brand: { ...p.brand, logoX: nx, logoY: ny } }));
  }

  // ---------- keyboard ----------
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (e.key === "Delete" || e.key === "Backspace") removeSelected();
      else if (e.key === "Escape") { if (theater) exitTheater(); else setFull(false); }
      else if (e.key.toLowerCase() === "s" && !e.ctrlKey) splitAtPlayhead();
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  // ---------- UI ----------
  const selClip = sel?.type === "clip" ? proj.clips.find((c) => c.id === sel.id) : undefined;
  const selOv = sel?.type === "overlay" ? proj.overlays.find((o) => o.id === sel.id) : undefined;
  const selAud = sel?.type === "audio" ? proj.audios.find((a) => a.id === sel.id) : undefined;
  const selText = sel?.type === "text" ? proj.texts.find((t) => t.id === sel.id) : undefined;
  const cs = proj.captionStyle;
  const setCs = (patch: Partial<typeof cs>) => update((p) => ({ ...p, captionStyle: { ...p.captionStyle, ...patch } }));
  const setBrand = (patch: Partial<Project["brand"]>) => update((p) => ({ ...p, brand: { ...p.brand, ...patch } }));
  const fileBtn = (label: string, accept: string, target: Target, icon = <Upload className="size-4" />) => (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-bold hover:border-gold">{icon}{label}
      <input type="file" multiple={target !== "bg" && target !== "logo"} accept={accept} className="hidden" onChange={(e) => { void addFiles(e.target.files, target); e.target.value = ""; }} />
    </label>
  );
  const libBtn = (target: Target) => <Button size="sm" variant="glass" onClick={() => setLibTarget(target)}><FolderOpen className="size-4" />من المكتبة</Button>;

  if (!ready) return <p className="p-6 text-sm text-muted-foreground">جارٍ فتح المشروع…</p>;

  const panel = (
    <div dir="rtl" className="space-y-2">
      <Section title="إضافة وسائط للفيديو الرئيسي" icon={<Film className="size-4" />} open={open.has("media")} onToggle={() => toggle("media")}>
        <div className="flex flex-wrap gap-2">
          {fileBtn("فيديو أو صور من جهازي", "video/*,image/*", "main")}
          {libBtn("main")}
          <CameraCapture label="تصوير الآن" onSave={(f) => void addFiles([f], "main")} />
        </div>
        <p className="text-muted-foreground">الصور تتحول إلى مشاهد متحركة وتندمج مع الفيديوهات. الملفات تُحفظ تلقائيًا في مكتبتك.</p>
      </Section>

      {selClip && (
        <Section title="تعديل المقطع المحدد" icon={<Scissors className="size-4" />} open={!full || open.has("clip")} onToggle={() => (full ? toggle("clip") : setSel(null))} badge={<span className="truncate text-[10px] text-muted-foreground" dir="auto">{selClip.asset.name}</span>}>
          {selClip.kind === "video" ? <div className="grid grid-cols-2 gap-2">
            <Range label="بداية القص" min={0} max={selClip.natural} step={0.1} value={selClip.trimStart} suffix="s" onChange={(v) => updClip(selClip.id, { trimStart: Math.min(v, selClip.trimEnd - 0.2) })} />
            <Range label="نهاية القص" min={0} max={selClip.natural} step={0.1} value={selClip.trimEnd} suffix="s" onChange={(v) => updClip(selClip.id, { trimEnd: Math.max(v, selClip.trimStart + 0.2) })} />
            <Range label="السرعة" min={0.25} max={4} step={0.25} value={selClip.speed} suffix="×" onChange={(v) => updClip(selClip.id, { speed: v })} />
          </div> : <div className="grid grid-cols-2 gap-2">
            <Range label="مدة الصورة" min={0.5} max={60} step={0.5} value={selClip.imageDuration} suffix="s" onChange={(v) => updClip(selClip.id, { imageDuration: v })} />
            <Check label="حركة تقريب سينمائية" checked={selClip.kenBurns} onChange={(v) => updClip(selClip.id, { kenBurns: v })} />
          </div>}
          <div className="grid grid-cols-2 gap-2">
            <Sel label="الانتقال عند البداية" value={selClip.transition} onChange={(v) => updClip(selClip.id, { transition: v })} options={TRANSITIONS.map((t) => ({ id: t.id, label: `${t.group} · ${t.label}` }))} />
            <Sel label="الملاءمة" value={selClip.fit} onChange={(v) => updClip(selClip.id, { fit: v })} options={[{ id: "cover", label: "ملء الإطار" }, { id: "contain", label: "إظهار كامل" }]} />
            <Range label="ظهور تدريجي" min={0} max={3} step={0.1} value={selClip.fadeIn} suffix="s" onChange={(v) => updClip(selClip.id, { fadeIn: v })} />
            <Range label="اختفاء تدريجي" min={0} max={3} step={0.1} value={selClip.fadeOut} suffix="s" onChange={(v) => updClip(selClip.id, { fadeOut: v })} />
            <Range label="تكبير" min={50} max={300} value={selClip.zoom} suffix="%" onChange={(v) => updClip(selClip.id, { zoom: v })} />
            <Range label="تدوير" min={-180} max={180} value={selClip.rotate} suffix="°" onChange={(v) => updClip(selClip.id, { rotate: v })} />
            <Check label="قلب أفقي (مرآة)" checked={selClip.flipX} onChange={(v) => updClip(selClip.id, { flipX: v })} />
          </div>
          <b>الألوان والفلاتر</b><FiltersEditor value={selClip.filters} onChange={(filters) => updClip(selClip.id, { filters })} />
          <b>حذف الخلفية</b><KeyEditor value={selClip.key} onChange={(key) => updClip(selClip.id, { key })} />
          {selClip.kind === "video" && <><b>صوت المقطع</b><Check label="كتم صوت المقطع" checked={selClip.muted} onChange={(v) => updClip(selClip.id, { muted: v })} /><AudioFxEditor value={selClip.audio} onChange={(audio) => updClip(selClip.id, { audio })} /></>}
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="glass" onClick={splitAtPlayhead}><Scissors className="size-3" />قص عند المؤشر</Button><Button size="sm" variant="glass" onClick={duplicateSelected}><Copy className="size-3" />تكرار</Button><Button size="sm" variant="ghost" onClick={removeSelected}><Trash2 className="size-3" />حذف</Button></div>
        </Section>
      )}

      <Section title="فيديو داخل فيديو (طبقات)" icon={<Layers className="size-4" />} open={open.has("pip")} onToggle={() => toggle("pip")} badge={<span className="text-[10px] text-muted-foreground">{proj.overlays.length}</span>}>
        <div className="flex flex-wrap gap-2">{fileBtn("طبقة فيديو أو صورة", "video/*,image/*", "overlay", <Plus className="size-4" />)}{libBtn("overlay")}<CameraCapture label="تصوير طبقة" onSave={(f) => void addFiles([f], "overlay")} /></div>
        <p className="text-muted-foreground">تظهر الطبقة فوق الفيديو الرئيسي من موضع المؤشر. اسحبها مباشرة على الشاشة لتحريكها.</p>
        <div className="flex flex-wrap gap-1">{proj.overlays.map((o, i) => <button type="button" key={o.id} onClick={() => setSel({ type: "overlay", id: o.id })} className={`rounded-md border px-2 py-1 ${sel?.id === o.id ? "border-gold" : "border-border"}`}>طبقة {i + 1}</button>)}</div>
        {selOv && <div className="space-y-2 rounded-lg border border-gold/40 p-2">
          <div className="grid grid-cols-2 gap-2">
            <Range label="يبدأ عند" min={0} max={Math.max(total, 1)} step={0.1} value={selOv.start} suffix="s" onChange={(v) => updOv(selOv.id, { start: v })} />
            {selOv.kind === "image" ? <Range label="المدة" min={0.5} max={120} step={0.5} value={selOv.imageDuration} suffix="s" onChange={(v) => updOv(selOv.id, { imageDuration: v })} /> : <>
              <Range label="بداية القص" min={0} max={selOv.natural} step={0.1} value={selOv.trimStart} suffix="s" onChange={(v) => updOv(selOv.id, { trimStart: Math.min(v, selOv.trimEnd - 0.2) })} />
              <Range label="نهاية القص" min={0} max={selOv.natural} step={0.1} value={selOv.trimEnd} suffix="s" onChange={(v) => updOv(selOv.id, { trimEnd: Math.max(v, selOv.trimStart + 0.2) })} /></>}
            <Range label="الحجم" min={5} max={100} value={selOv.w} suffix="%" onChange={(v) => updOv(selOv.id, { w: v })} />
            <Range label="أفقيًا" min={0} max={100} value={selOv.x} suffix="%" onChange={(v) => updOv(selOv.id, { x: v })} />
            <Range label="عموديًا" min={0} max={100} value={selOv.y} suffix="%" onChange={(v) => updOv(selOv.id, { y: v })} />
            <Range label="الشفافية" min={0} max={100} value={selOv.opacity} suffix="%" onChange={(v) => updOv(selOv.id, { opacity: v })} />
            <Range label="تدوير" min={-180} max={180} value={selOv.rotate} suffix="°" onChange={(v) => updOv(selOv.id, { rotate: v })} />
            <Sel label="الشكل" value={selOv.shape} onChange={(v) => updOv(selOv.id, { shape: v })} options={[{ id: "rect", label: "مستطيل" }, { id: "round", label: "حواف دائرية" }, { id: "circle", label: "دائرة" }]} />
            <Sel label="حركة الظهور" value={selOv.anim} onChange={(v) => updOv(selOv.id, { anim: v })} options={ANIMS.filter((a) => a.id !== "typewriter").map((a) => ({ id: a.id, label: a.label }))} />
            <Range label="سماكة الإطار" min={0} max={30} value={selOv.borderWidth} onChange={(v) => updOv(selOv.id, { borderWidth: v })} />
            <ColorIn label="لون الإطار" value={selOv.border} onChange={(v) => updOv(selOv.id, { border: v })} />
            <Check label="ظل" checked={selOv.shadow} onChange={(v) => updOv(selOv.id, { shadow: v })} />
          </div>
          <div className="flex flex-wrap gap-1">{[["زاوية علوية", 78, 22], ["زاوية سفلية", 78, 75], ["المنتصف", 50, 50], ["يسار علوي", 22, 22]].map(([l, x, y]) => <button type="button" key={l as string} onClick={() => updOv(selOv.id, { x: x as number, y: y as number })} className="rounded-md border border-border px-2 py-1">{l}</button>)}</div>
          <b>حذف الخلفية</b><KeyEditor value={selOv.key} onChange={(key) => updOv(selOv.id, { key })} />
          <b>الألوان</b><FiltersEditor value={selOv.filters} onChange={(filters) => updOv(selOv.id, { filters })} />
          {selOv.kind === "video" && <><Check label="كتم صوت الطبقة" checked={selOv.muted} onChange={(v) => updOv(selOv.id, { muted: v })} /><AudioFxEditor value={selOv.audio} onChange={(audio) => updOv(selOv.id, { audio })} /></>}
          <div className="flex gap-2"><Button size="sm" variant="glass" onClick={duplicateSelected}><Copy className="size-3" />تكرار</Button><Button size="sm" variant="ghost" onClick={removeSelected}><Trash2 className="size-3" />حذف</Button></div>
        </div>}
      </Section>

      <Section title="النص والصوت" icon={<Mic className="size-4" />} open={open.has("voice")} onToggle={() => toggle("voice")} badge={<span className="text-[10px] text-muted-foreground">{proj.audios.length} طبقة</span>}>
        <label className="block">النص (السكربت)<textarea dir="auto" value={proj.script} onChange={(e) => update((p) => ({ ...p, script: e.target.value }))} placeholder="اكتب ما سيُقال في الفيديو… / Write your script…" className="bilingual-text mt-1 min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm" /></label>
        <div className="grid grid-cols-2 gap-2"><Sel label="الصوت" value={proj.voice} onChange={(voice) => update((p) => ({ ...p, voice }))} options={VOICES.map((v) => ({ id: v.id, label: v.l }))} />
          <div className="flex items-end"><Button size="sm" variant="gold" className="w-full" disabled={busy === "tts"} onClick={() => void generateVoice()}><Sparkles className="size-3" />{busy === "tts" ? "جارٍ التوليد…" : "حوّل النص إلى صوت"}</Button></div></div>
        <div className="flex flex-wrap gap-2">
          <AudioRecorder label="سجّل صوتك" onSave={(f) => void addFiles([f], "audio")} />
          {fileBtn("ارفع صوت / موسيقى", "audio/*", "audio", <Music className="size-4" />)}
          {libBtn("audio")}
        </div>
        <p className="text-muted-foreground">كل صوت يُضاف كطبقة مستقلة فوق الأخرى (تعليق، موسيقى، مؤثرات)، ويبدأ من موضع المؤشر.</p>
        <div className="space-y-1">{proj.audios.map((a) => <button type="button" key={a.id} onClick={() => setSel({ type: "audio", id: a.id })} className={`flex w-full items-center gap-2 rounded-md border px-2 py-1 text-start ${sel?.id === a.id ? "border-gold" : "border-border"}`}>{a.kind === "music" ? <Music className="size-3 text-gold" /> : <Volume2 className="size-3 text-gold" />}<span className="flex-1 truncate" dir="auto">{a.name}</span><span className="font-mono" dir="ltr">{a.start.toFixed(1)}s · {a.audio.gain}%</span></button>)}</div>
        {selAud && <div className="space-y-2 rounded-lg border border-gold/40 p-2">
          <input dir="auto" value={selAud.name} onChange={(e) => updAud(selAud.id, { name: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2" />
          <div className="grid grid-cols-2 gap-2">
            <Sel label="النوع" value={selAud.kind} onChange={(kind) => updAud(selAud.id, { kind })} options={[{ id: "voice", label: "تعليق / كلام" }, { id: "music", label: "موسيقى" }, { id: "sfx", label: "مؤثر صوتي" }]} />
            <Range label="يبدأ عند" min={0} max={Math.max(total, audLen(selAud), 1)} step={0.1} value={selAud.start} suffix="s" onChange={(v) => updAud(selAud.id, { start: v })} />
            <Range label="بداية القص" min={0} max={selAud.natural} step={0.1} value={selAud.trimStart} suffix="s" onChange={(v) => updAud(selAud.id, { trimStart: Math.min(v, selAud.trimEnd - 0.2) })} />
            <Range label="نهاية القص" min={0} max={selAud.natural} step={0.1} value={selAud.trimEnd} suffix="s" onChange={(v) => updAud(selAud.id, { trimEnd: Math.max(v, selAud.trimStart + 0.2) })} />
            <Range label="ظهور تدريجي" min={0} max={10} step={0.1} value={selAud.fadeIn} suffix="s" onChange={(v) => updAud(selAud.id, { fadeIn: v })} />
            <Range label="اختفاء تدريجي" min={0} max={10} step={0.1} value={selAud.fadeOut} suffix="s" onChange={(v) => updAud(selAud.id, { fadeOut: v })} />
            <Check label="تكرار حتى نهاية الفيديو" checked={selAud.loop} onChange={(v) => updAud(selAud.id, { loop: v })} />
            <Check label="كتم" checked={selAud.muted} onChange={(v) => updAud(selAud.id, { muted: v })} />
          </div>
          <AudioFxEditor value={selAud.audio} onChange={(audio) => updAud(selAud.id, { audio })} />
          <details className="rounded-lg bg-muted/40 p-2"><summary className="cursor-pointer font-bold"><Wand2 className="me-1 inline size-3" />تحسين استوديو متقدم (إزالة ضجيج وصدى)</summary>
            <div className="mt-2"><VoiceEnhancer sourceUrl={selAud.asset.url} value={enhFx} onChange={setEnhFx} onSaveFile={async (f) => { const url = URL.createObjectURL(f); updAud(selAud.id, { asset: { path: null, url, name: f.name } }); uploadInBackground(f, (path) => setAssetPath(selAud.id, path)); toast.success("استُبدل الصوت بالنسخة المحسّنة"); }} /></div>
          </details>
          <div className="flex gap-2"><Button size="sm" variant="glass" onClick={duplicateSelected}><Copy className="size-3" />تكرار</Button><Button size="sm" variant="ghost" onClick={removeSelected}><Trash2 className="size-3" />حذف</Button></div>
        </div>}
        <Range label="مستوى الصوت العام للفيديو" min={0} max={1000} value={proj.masterGain} suffix="%" onChange={(v) => update((p) => ({ ...p, masterGain: v }))} />
        <Range label="خفض الموسيقى تلقائيًا عند الكلام (Ducking)" min={0} max={100} value={proj.duck ?? 100} suffix="%" onChange={(v) => update((p) => ({ ...p, duck: v }))} />
        <div className="grid grid-cols-2 gap-2"><Range label="ظهور الصوت كله" min={0} max={10} step={0.1} suffix="s" value={proj.audioFadeIn ?? 0} onChange={(v) => update((p) => ({ ...p, audioFadeIn: v }))} /><Range label="اختفاء الصوت كله" min={0} max={10} step={0.1} suffix="s" value={proj.audioFadeOut ?? 0} onChange={(v) => update((p) => ({ ...p, audioFadeOut: v }))} /></div>
      </Section>

      <Section title="النص المنطوق على الشاشة والترجمة" icon={<Captions className="size-4" />} open={open.has("captions")} onToggle={() => toggle("captions")} badge={<span className="text-[10px] text-muted-foreground">{proj.captions.length}</span>}>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="gold" disabled={busy === "vstt"} onClick={() => void captionsFromVideo()}><Film className="size-3" />{busy === "vstt" ? vstt ?? "جارٍ…" : "من كلام الفيديو تلقائيًا"}</Button>
          <Button size="sm" variant="glass" disabled={busy === "stt"} onClick={() => void captionsFromAudio()}><Mic className="size-3" />{busy === "stt" ? "جارٍ التفريغ…" : "من طبقة الصوت"}</Button>
          <Button size="sm" variant="glass" onClick={captionsFromScript}><Type className="size-3" />من النص المكتوب</Button>
          <Button size="sm" variant="glass" onClick={() => update((p) => ({ ...p, captions: [...p.captions, { id: uid(), start: time, end: time + 3, text: "نص جديد", translation: "" }].sort((a, b) => a.start - b.start) }))}><Plus className="size-3" />سطر يدوي</Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Check label="إظهار النص المنطوق" checked={cs.show} onChange={(show) => setCs({ show })} />
          <Check label="تمييز الكلمة المنطوقة" checked={cs.highlight} onChange={(highlight) => setCs({ highlight })} />
          <Sel label="الخط" value={cs.font} onChange={(font) => { loadFont(font); setCs({ font }); }} options={FONTS.map((f) => ({ id: f, label: f }))} />
          <Range label="الحجم" min={20} max={140} value={cs.size} onChange={(size) => setCs({ size })} />
          <ColorIn label="لون النص" value={cs.color} onChange={(color) => setCs({ color })} />
          <Sel label="الخلفية" value={cs.bg} onChange={(bg) => setCs({ bg })} options={BG_OPTIONS} />
          <ColorIn label="لون الكلمة المنطوقة" value={cs.activeColor} onChange={(activeColor) => setCs({ activeColor })} />
          <ColorIn label="خلفية الكلمة المنطوقة" value={cs.activeBg} onChange={(activeBg) => setCs({ activeBg })} />
          <Range label="المكان أفقيًا" min={0} max={100} value={cs.x} suffix="%" onChange={(x) => setCs({ x })} />
          <Range label="المكان عموديًا" min={0} max={100} value={cs.y} suffix="%" onChange={(y) => setCs({ y })} />
          <Range label="أقصى عرض" min={30} max={100} value={cs.maxWidth} suffix="%" onChange={(maxWidth) => setCs({ maxWidth })} />
        </div>
        <div className="space-y-2 rounded-lg bg-muted/40 p-2">
          <b><Languages className="me-1 inline size-3" />الترجمة</b>
          <div className="grid grid-cols-2 gap-2">
            <Sel label="ترجم إلى" value={cs.targetLang} onChange={(targetLang) => setCs({ targetLang })} options={LANGS.map((l) => ({ id: l.id, label: l.l }))} />
            <div className="flex items-end"><Button size="sm" variant="gold" className="w-full" disabled={busy === "tr"} onClick={() => void translateAll()}>{busy === "tr" ? "جارٍ الترجمة…" : "ترجم كل الأسطر"}</Button></div>
            <Check label="إظهار الترجمة" checked={cs.showTranslation} onChange={(showTranslation) => setCs({ showTranslation })} />
            <Sel label="خط الترجمة" value={cs.tFont} onChange={(tFont) => { loadFont(tFont); setCs({ tFont }); }} options={FONTS.map((f) => ({ id: f, label: f }))} />
            <Range label="حجم الترجمة" min={16} max={120} value={cs.tSize} onChange={(tSize) => setCs({ tSize })} />
            <Range label="مكان الترجمة عموديًا" min={0} max={100} value={cs.tY} suffix="%" onChange={(tY) => setCs({ tY })} />
            <ColorIn label="لون الترجمة" value={cs.tColor} onChange={(tColor) => setCs({ tColor })} />
            <Sel label="خلفية الترجمة" value={cs.tBg} onChange={(tBg) => setCs({ tBg })} options={BG_OPTIONS} />
          </div>
          {proj.captions.length > 0 && <div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => exportSrt(false)}><Download className="size-3" />ملف SRT الأصلي</Button><Button size="sm" variant="ghost" onClick={() => exportSrt(true)}><Download className="size-3" />ملف SRT المترجم</Button></div>}
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {proj.captions.map((c) => (
            <div key={c.id} className={`space-y-1 rounded-md border p-2 ${time >= c.start && time < c.end ? "border-gold" : "border-border"}`}>
              <div className="flex items-center gap-1" dir="ltr">
                <input type="number" step={0.1} value={c.start.toFixed(1)} onChange={(e) => updCap(c.id, { start: +e.target.value })} className="h-7 w-16 rounded border border-input bg-background px-1" />
                <span>→</span>
                <input type="number" step={0.1} value={c.end.toFixed(1)} onChange={(e) => updCap(c.id, { end: +e.target.value })} className="h-7 w-16 rounded border border-input bg-background px-1" />
                <button type="button" className="ms-auto text-muted-foreground" onClick={() => void seek(c.start + 0.01)}><Play className="size-3" /></button>
                <button type="button" className="text-muted-foreground" onClick={() => update((p) => ({ ...p, captions: p.captions.filter((x) => x.id !== c.id) }))}><Trash2 className="size-3" /></button>
              </div>
              <input dir="auto" value={c.text} onChange={(e) => updCap(c.id, { text: e.target.value })} className="bilingual-text h-8 w-full rounded border border-input bg-background px-2" />
              <input dir="auto" value={c.translation} placeholder="الترجمة" onChange={(e) => updCap(c.id, { translation: e.target.value })} className="bilingual-text h-8 w-full rounded border border-input bg-background px-2 text-gold-soft" />
            </div>
          ))}
        </div>
      </Section>

      <Section title="الخلفية والشعار والعناوين" icon={<Palette className="size-4" />} open={open.has("brand")} onToggle={() => toggle("brand")}>
        <b>الخلفية</b>
        <div className="grid grid-cols-2 gap-2">
          <ColorIn label="لون الخلفية" value={proj.brand.bgColor} onChange={(bgColor) => setBrand({ bgColor })} />
          <Check label="خلفية ضبابية من الفيديو" checked={proj.brand.bgBlur} onChange={(bgBlur) => setBrand({ bgBlur })} />
        </div>
        <div className="flex flex-wrap gap-2">{fileBtn("صورة خلفية", "image/*", "bg", <ImageIcon className="size-4" />)}{libBtn("bg")}{proj.brand.bgImage && <Button size="sm" variant="ghost" onClick={() => setBrand({ bgImage: null })}><Trash2 className="size-3" />إزالة الصورة</Button>}</div>
        <p className="text-muted-foreground">تظهر صورة الخلفية خلف الفيديو أو خلف الشخص بعد حذف خلفيته.</p>
        <b>الشعار</b>
        <div className="flex flex-wrap gap-2">{fileBtn("رفع الشعار", "image/*", "logo", <ImageIcon className="size-4" />)}{libBtn("logo")}{proj.brand.logo && <Button size="sm" variant="ghost" onClick={() => setBrand({ logo: null })}><Trash2 className="size-3" />إزالة</Button>}</div>
        {proj.brand.logo && <div className="grid grid-cols-2 gap-2">
          <Range label="الحجم" min={3} max={50} value={proj.brand.logoSize} suffix="%" onChange={(logoSize) => setBrand({ logoSize })} />
          <Range label="الشفافية" min={10} max={100} value={proj.brand.logoOpacity} suffix="%" onChange={(logoOpacity) => setBrand({ logoOpacity })} />
          <Range label="أفقيًا" min={0} max={100} value={proj.brand.logoX} suffix="%" onChange={(logoX) => setBrand({ logoX })} />
          <Range label="عموديًا" min={0} max={100} value={proj.brand.logoY} suffix="%" onChange={(logoY) => setBrand({ logoY })} />
        </div>}
        <b>لمسات سينمائية</b>
        <div className="grid grid-cols-2 gap-2">
          <Range label="إطار معتم (Vignette)" min={0} max={100} value={proj.brand.vignette} onChange={(vignette) => setBrand({ vignette })} />
          <Range label="حبيبات الفيلم" min={0} max={100} value={proj.brand.grain} onChange={(grain) => setBrand({ grain })} />
          <Check label="أشرطة سينمائية" checked={proj.brand.letterbox} onChange={(letterbox) => setBrand({ letterbox })} />
          <Range label="توهج سينمائي (Glow)" min={0} max={100} value={proj.brand.bloom ?? 0} onChange={(bloom) => setBrand({ bloom })} />
          <Range label="اهتزاز الكاميرا" min={0} max={100} value={proj.brand.shake ?? 0} onChange={(shake) => setBrand({ shake })} />
          <Range label="ظهور من الأسود" min={0} max={5} step={0.1} suffix="s" value={proj.brand.fadeStart ?? 0} onChange={(fadeStart) => setBrand({ fadeStart })} />
          <Range label="اختفاء للأسود" min={0} max={5} step={0.1} suffix="s" value={proj.brand.fadeEnd ?? 0} onChange={(fadeEnd) => setBrand({ fadeEnd })} />
        </div>
        <b>تدرج لوني للفيديو كاملًا</b>
        <div className="flex flex-wrap gap-1">{([["#FF8A3D", "برتقالي دافئ"], ["#1FA2B8", "تيل سينمائي"], ["#FFD27A", "ذهبي"], ["#4A6CFF", "أزرق ليلي"], ["#FF4FA3", "وردي"], ["#3DDC84", "أخضر ماتريكس"]] as const).map(([c, l]) => <button type="button" key={c} onClick={() => setBrand({ tint: c, tintStrength: proj.brand.tintStrength || 35 })} className={`flex items-center gap-1 rounded-md border px-2 py-1 ${proj.brand.tint === c ? "border-gold" : "border-border"}`}><span className="size-3 rounded-full" style={{ background: c }} />{l}</button>)}</div>
        <Range label="قوة التدرج" min={0} max={100} value={proj.brand.tintStrength ?? 0} suffix="%" onChange={(tintStrength) => setBrand({ tintStrength })} />
        <div className="flex items-center justify-between"><b>العناوين والنصوص</b><Button size="sm" variant="glass" onClick={addText}><Plus className="size-3" />عنوان</Button></div>
        <div className="flex flex-wrap gap-1">{proj.texts.map((t) => <button type="button" key={t.id} onClick={() => setSel({ type: "text", id: t.id })} className={`max-w-[160px] truncate rounded-md border px-2 py-1 ${sel?.id === t.id ? "border-gold" : "border-border"}`} dir="auto">{t.text}</button>)}</div>
        {selText && <div className="space-y-2 rounded-lg border border-gold/40 p-2">
          <textarea dir="auto" value={selText.text} onChange={(e) => updText(selText.id, { text: e.target.value })} className="bilingual-text min-h-16 w-full rounded-md border border-input bg-background p-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <Range label="يبدأ" min={0} max={Math.max(total, 1)} step={0.1} value={selText.start} suffix="s" onChange={(v) => updText(selText.id, { start: v })} />
            <Range label="ينتهي" min={0} max={Math.max(total, 1)} step={0.1} value={selText.end} suffix="s" onChange={(v) => updText(selText.id, { end: v })} />
            <Range label="أفقيًا" min={0} max={100} value={selText.x} suffix="%" onChange={(v) => updText(selText.id, { x: v })} />
            <Range label="عموديًا" min={0} max={100} value={selText.y} suffix="%" onChange={(v) => updText(selText.id, { y: v })} />
            <Range label="الحجم" min={16} max={240} value={selText.size} onChange={(v) => updText(selText.id, { size: v })} />
            <Sel label="الحركة" value={selText.anim} onChange={(anim) => updText(selText.id, { anim })} options={ANIMS.map((a) => ({ id: a.id, label: a.label }))} />
            <Sel label="الخط" value={selText.font} onChange={(font) => { loadFont(font); updText(selText.id, { font }); }} options={FONTS.map((f) => ({ id: f, label: f }))} />
            <Sel label="الخلفية" value={selText.bg} onChange={(bg) => updText(selText.id, { bg })} options={BG_OPTIONS} />
            <ColorIn label="اللون" value={selText.color} onChange={(color) => updText(selText.id, { color })} />
            <Check label="عريض" checked={selText.bold} onChange={(bold) => updText(selText.id, { bold })} />
          </div>
          <div className="flex gap-2"><Button size="sm" variant="glass" onClick={duplicateSelected}><Copy className="size-3" />تكرار</Button><Button size="sm" variant="ghost" onClick={removeSelected}><Trash2 className="size-3" />حذف</Button></div>
        </div>}
      </Section>

      <Section title="التصدير والحفظ" icon={<Download className="size-4" />} open={open.has("export")} onToggle={() => toggle("export")}>
        <div className="grid grid-cols-2 gap-2">
          <Sel label="الصيغة" value={format} onChange={setFormat} options={supported.length ? [{ id: "phone-mp4", label: "MP4 للهاتف — H.264 + AAC" }, ...supported.map((f) => ({ id: f.id, label: f.label }))] : [{ id: "", label: "غير مدعوم في هذا المتصفح" }]} />
          <Sel label="الجودة" value={String(quality)} onChange={(v) => setQuality(+v)} options={QUALITIES.map((q) => ({ id: String(q.id), label: q.label }))} />
          <Sel label="الإطارات في الثانية" value={String(fps)} onChange={(v) => setFps(+v)} options={[24, 25, 30, 50, 60].map((f) => ({ id: String(f), label: f === 24 ? "24 fps سينمائي" : f === 60 ? "60 fps سلس جدًا" : `${f} fps` }))} />
          <Sel label="معدل البت" value={bitrate} onChange={setBitrate} options={BITRATES.map((b) => ({ id: b.id, label: b.label }))} />
        </div>
        <p className="text-muted-foreground">MP4 للهاتف يستخدم H.264 وAAC. جودات 4K و8K تحتاج جهازًا قويًا ومتصفحًا يدعم ترميزها؛ زيادة الدقة لا تضيف تفاصيل للمصدر. حد الحفظ 20 ميجابايت.</p>
        {exporting != null ? <div className="space-y-2"><div className="h-2 overflow-hidden rounded bg-secondary"><div className="h-full bg-gold transition-all" style={{ width: `${exporting}%` }} /></div><Button size="sm" variant="glass" onClick={() => (playing.current = false)}>إلغاء ({exporting}%)</Button></div>
          : <Button variant="gold" className="w-full" onClick={() => void exportVideo()}><Download className="size-4" />تصدير الفيديو</Button>}
        {result && <div className="space-y-2 rounded-xl border border-gold/40 p-2"><video src={result.url} playsInline controls className="max-h-56 w-full rounded-lg bg-black" /><a href={result.url} download={result.name} className="inline-flex items-center gap-2 rounded-md bg-gold px-3 py-2 font-bold text-primary-foreground"><Download className="size-4" />تنزيل ({(result.blob.size / 1048576).toFixed(1)} م.ب)</a></div>}
        <Button size="sm" variant="ghost" onClick={snapshot}><ImageIcon className="size-3" />حفظ لقطة من الإطار الحالي (PNG)</Button>
      </Section>

      <Section title="الذكاء الاصطناعي للفيديو" icon={<Sparkles className="size-4" />} open={open.has("ai")} onToggle={() => toggle("ai")}>
        <EditorAI selected={selClip && selClip.kind === "video" ? { url: selClip.asset.url, name: selClip.asset.name } : null} size={{ w: size.w, h: size.h }}
          onAdd={(a) => void addAsset("main", "video", { path: a.path, url: a.url, name: a.name })} />
        <details className="text-muted-foreground"><summary className="cursor-pointer">النماذج المدعومة</summary>{[...modelsFor("video"), ...modelsFor("video_edit")].map((m) => <p key={m.id} dir="auto"><b>{m.name}</b> — {m.description}</p>)}</details>
      </Section>
    </div>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border p-2" dir="rtl">
      <Link to="/editor" search={{ p: undefined }} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:border-gold"><LibraryBig className="size-4" />مكتبة المحرر</Link>
      <input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 min-w-[120px] flex-1 rounded-md border border-input bg-background px-2 text-sm font-bold" aria-label="اسم المشروع" />
      <span className={`text-[11px] ${saveState === "error" ? "text-destructive" : "text-muted-foreground"}`}>{saveState === "saved" ? "✓ محفوظ" : saveState === "saving" ? "جارٍ الحفظ…" : "تعذر الحفظ (نسخة محلية محفوظة)"}</span>
      <select value={proj.sizeId} onChange={(e) => update((p) => ({ ...p, sizeId: e.target.value }))} className="h-8 max-w-[170px] rounded-md border border-input bg-background px-1 text-xs">{SOCIAL_SIZES.filter((s) => s.id !== "custom").map((s) => <option key={s.id} value={s.id}>{s.platform} · {s.label} {s.ratio}</option>)}</select>
      <Button size="sm" variant="ghost" onClick={undo} aria-label="تراجع"><Undo2 className="size-4" /></Button>
      <Button size="sm" variant="ghost" onClick={redo} aria-label="إعادة"><Redo2 className="size-4" /></Button>
      <Button size="sm" variant="glass" onClick={() => { setOpen(new Set()); setFull((f) => !f); }}>{full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}{full ? "خروج" : "ملء الشاشة"}</Button>
    </div>
  );

  const viewerMax = full ? "calc(100dvh - 250px)" : "58vh";
  const viewer = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {(() => { const stage = (
      <div ref={stageRef} className={theater ? "fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black" : "relative flex flex-1 items-center justify-center bg-muted/40 p-2"}
        style={theater ? { touchAction: "none" } : undefined}
        onPointerDown={(e) => { if (!theater) return; pinch.current.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch.current.pts.size >= 2) lastTap.current = 0; if (pinch.current.pts.size === 2) { const [a, b] = [...pinch.current.pts.values()]; pinch.current.d0 = Math.hypot(a!.x - b!.x, a!.y - b!.y); pinch.current.z0 = zoomV; } }}
        onPointerMove={(e) => { if (!theater || !pinch.current.pts.has(e.pointerId)) return; pinch.current.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch.current.pts.size === 2 && pinch.current.d0) { const [a, b] = [...pinch.current.pts.values()]; setZoomV(clamp((pinch.current.z0 * Math.hypot(a!.x - b!.x, a!.y - b!.y)) / pinch.current.d0, 1, 5)); } }}
        onPointerUp={(e) => { pinch.current.pts.delete(e.pointerId); if (pinch.current.pts.size < 2) pinch.current.d0 = 0; }}
        onPointerCancel={(e) => { pinch.current.pts.delete(e.pointerId); pinch.current.d0 = 0; }}>
        <canvas ref={canvasRef} onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} onPointerUp={() => (dragRef.current = null)} className={`touch-none bg-black ${theater ? "" : "rounded-lg shadow-lg"}`}
          style={theater ? (rotated ? { aspectRatio: `${ratio}`, width: `min(100dvh, calc(100vw * ${ratio}))`, maxWidth: "none", transform: `rotate(90deg) scale(${zoomV})` } : { aspectRatio: `${ratio}`, width: `min(100vw, calc(100dvh * ${ratio}))`, maxWidth: "none", transform: `scale(${zoomV})` }) : { aspectRatio: `${ratio}`, width: "100%", maxWidth: `calc(${viewerMax} * ${ratio})`, maxHeight: viewerMax }} />
        {theater ? <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 rounded-2xl bg-background/40 p-2 text-foreground backdrop-blur" onPointerDown={(e) => e.stopPropagation()} style={rotated ? { transform: "rotate(90deg)", transformOrigin: "center", inset: "auto", width: "92dvh", left: "calc(50% - 46dvh)", top: "calc(50% - 40px)", right: "auto" } : undefined}>
          <div className="flex items-center gap-2 text-xs" dir="ltr">
            <span className="tabular-nums">{fmtT(time)}</span>
            <input type="range" min={0} max={total} step={0.05} value={Math.min(time, total)} onChange={(e) => scrub(Number(e.target.value))} aria-label="تمرير الفيديو" className="flex-1 accent-[var(--gold)]" />
            <span className="tabular-nums">{fmtT(total)}</span>
          </div>
          <div className="flex items-center justify-center gap-2" dir="ltr">
          <button type="button" onClick={() => scrub(time - 10)} aria-label="رجوع 10 ثوانٍ" className="rounded-full bg-background/40 px-3 py-2 text-xs">-10</button>
          <button type="button" onClick={togglePlay} aria-label="تشغيل" className="grid size-11 place-items-center rounded-full bg-gold text-primary-foreground">{isPlaying ? <Pause className="size-6" /> : <Play className="size-6" />}</button>
          <button type="button" onClick={() => scrub(time + 10)} aria-label="تقديم 10 ثوانٍ" className="rounded-full bg-background/40 px-3 py-2 text-xs">+10</button>
          <button type="button" onClick={() => update((p) => ({ ...p, masterGain: Math.max(0, p.masterGain - 25) }))} aria-label="خفض الصوت" className="rounded-full bg-background/40 px-3 py-2 text-sm">🔉−</button>
          <select value={[0, 50, 100, 150, 200, 300, 400, 500, 700, 1000].includes(proj.masterGain) ? proj.masterGain : ""} onChange={(e) => update((p) => ({ ...p, masterGain: Number(e.target.value) }))} aria-label="مستوى الصوت" className="rounded-full bg-background/60 px-2 py-1.5 text-xs">
            {![0, 50, 100, 150, 200, 300, 400, 500, 700, 1000].includes(proj.masterGain) && <option value="">{proj.masterGain}%</option>}
            {[0, 50, 100, 150, 200, 300, 400, 500, 700, 1000].map((v) => <option key={v} value={v}>{v}%</option>)}
          </select>
          <button type="button" onClick={() => update((p) => ({ ...p, masterGain: Math.min(1000, p.masterGain + 25) }))} aria-label="رفع الصوت" className="rounded-full bg-background/40 px-3 py-2 text-sm">🔊+</button>
          <button type="button" onClick={exitTheater} aria-label="خروج من العرض الكامل" className="grid size-10 place-items-center rounded-full bg-background/40"><Minimize2 className="size-5" /></button>
          </div>
        </div> : <button type="button" onClick={() => void enterTheater()} aria-label="عرض الفيديو كاملًا" title="عرض كامل (أو اضغط مرتين على الفيديو)" className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full bg-background/70 text-gold shadow"><Maximize2 className="size-4" /></button>}
        {theater && zoomV > 1.01 && <button type="button" onClick={() => setZoomV(1)} className="absolute right-4 top-4 rounded-full bg-background/50 px-3 py-1 text-xs text-foreground">{Math.round(zoomV * 100)}% · إعادة</button>}
      </div>); return theater ? createPortal(stage, document.body) : stage; })()}
      <div className="space-y-1 border-t border-border p-2" dir="rtl">
        <input type="range" min={0} max={Math.max(total, 0.1)} step={0.05} value={time} disabled={isPlaying} onChange={(e) => void seek(+e.target.value)} className="w-full accent-[var(--gold)]" aria-label="الخط الزمني" dir="ltr" />
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="gold" onClick={togglePlay} disabled={exporting != null}>{isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}{isPlaying ? "إيقاف" : "تشغيل"}</Button>
          <span className="font-mono text-xs" dir="ltr">{fmt(time)} / {fmt(total)}</span>
          <Button size="sm" variant="ghost" onClick={splitAtPlayhead} disabled={isPlaying}><Scissors className="size-4" />قص</Button>
          <Button size="sm" variant="ghost" onClick={addText} disabled={isPlaying}><Type className="size-4" />عنوان</Button>
          <Button size="sm" variant="ghost" onClick={duplicateSelected} disabled={!sel}><Copy className="size-4" /></Button>
          <Button size="sm" variant="ghost" onClick={removeSelected} disabled={!sel}><Trash2 className="size-4" /></Button>
          <Button size="sm" variant="ghost" onClick={snapshot}><Camera className="size-4" /></Button>
        </div>
      </div>
    </div>
  );

  const strip = (
    <div className="space-y-1 border-t border-border p-2" dir="rtl">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><ArrowLeftRight className="size-3" />المقاطع · الطول الكلي {fmt(mainLen(proj))}</div>
      {proj.clips.length === 0 ? <p className="py-3 text-center text-xs text-muted-foreground">أضف فيديوهات أو صورًا لتظهر هنا</p> : (
        <LongPressStrip items={proj.clips} selectedId={sel?.type === "clip" ? sel.id : null} onReorder={reorder} width={(c) => Math.max(76, Math.min(240, clipLen(c) * 16))}
          onSelect={(id) => { setSel({ type: "clip", id }); if (!playing.current) void seek(startOf(id) + 0.01); }}
          render={(c, i) => <>{i > 0 && <button type="button" aria-label="اختر الانتقال" title="الانتقال" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setTxPick(c.id); }}
            className={`absolute left-0 top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full border-2 border-background text-[11px] font-bold ${c.transition === "none" ? "bg-secondary text-muted-foreground" : "bg-gold text-primary-foreground"}`}>⇄</button>}<div className={i > 0 ? "ps-0 pl-6" : ""}><ClipChip clip={c} index={i} /></div></>} />
      )}
      {(selAud || selOv || selText || selClip) && <div className="flex flex-wrap items-center gap-2 text-xs" dir="rtl">
        <span>بداية العنصر المحدد (ثانية)</span>
        {selClip ? <span className="font-mono" dir="ltr">{startOf(selClip.id).toFixed(2)}</span> : <input aria-label="بداية العنصر المحدد" type="number" min={0} step={0.01} value={selAud?.start ?? selOv?.start ?? selText?.start ?? 0} onChange={(e) => { const start = Math.max(0, +e.target.value); if (selAud) updAud(selAud.id, { start }); else if (selOv) updOv(selOv.id, { start }); else if (selText) updText(selText.id, { start, end: start + (selText.end - selText.start) }); }} className="h-8 w-20 rounded border border-input bg-background px-2" />}
        {!selClip && <Button variant="ghost" size="sm" onClick={() => { if (selAud) updAud(selAud.id, { start: time }); else if (selOv) updOv(selOv.id, { start: time }); else if (selText) updText(selText.id, { start: time, end: time + selText.end - selText.start }); }}>عند المؤشر</Button>}
      </div>}
      {(proj.overlays.length > 0 || proj.audios.length > 0 || proj.texts.length > 0) && (
        <div className="flex gap-1.5 overflow-x-auto" dir="ltr">
          {proj.overlays.map((o, i) => <Chip key={o.id} active={sel?.id === o.id} onClick={() => { setSel({ type: "overlay", id: o.id }); toggle("pip", true); }} icon={<Layers className="size-3" />} label={`طبقة ${i + 1}`} sub={`${o.start.toFixed(1)}s`} />)}
          {proj.audios.map((a) => <Chip key={a.id} active={sel?.id === a.id} onClick={() => { setSel({ type: "audio", id: a.id }); toggle("voice", true); }} icon={a.kind === "music" ? <Music className="size-3" /> : <Volume2 className="size-3" />} label={a.name} sub={`${a.start.toFixed(1)}s`} />)}
          {proj.texts.map((t) => <Chip key={t.id} active={sel?.id === t.id} onClick={() => { setSel({ type: "text", id: t.id }); toggle("brand", true); }} icon={<Type className="size-3" />} label={t.text} sub={`${t.start.toFixed(1)}s`} />)}
        </div>
      )}
    </div>
  );

  const libraryPicker = libTarget && (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-4" onClick={() => setLibTarget(null)}>
      <div className="glass max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-4" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><b>اختر من المكتبة</b><Button size="sm" variant="ghost" onClick={() => setLibTarget(null)}>إغلاق</Button></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {library.filter((a) => (libTarget === "audio" ? a.kind === "audio" : libTarget === "bg" || libTarget === "logo" ? a.kind === "image" : a.kind !== "audio")).map((a) => (
            <button type="button" key={a.id} onClick={() => void fromLibrary(a)} className="rounded-lg border border-border p-2 text-start text-xs hover:border-gold">
              {a.kind === "video" ? <Film className="mb-1 size-4 text-gold" /> : a.kind === "image" ? <ImageIcon className="mb-1 size-4 text-gold" /> : <Music className="mb-1 size-4 text-gold" />}<span className="line-clamp-2" dir="auto">{a.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const body = full ? (
    <div className="editor-fullscreen fixed inset-0 z-50 flex flex-col bg-background">
      {toolbar}
      <div className="flex min-h-0 flex-1 flex-row" dir="ltr">
        <div className="editor-stage flex min-w-0 flex-1 flex-col">{viewer}{strip}<div id="editor-drawer-slot" className="editor-drawer min-h-0 overflow-y-auto border-t border-border bg-popover text-popover-foreground empty:hidden" /></div>
        <aside className="editor-icon-rail relative w-14 shrink-0 overflow-y-auto border-s border-border p-1 sm:w-16">{panel}</aside>
      </div>
    </div>
  ) : (
    <div className="glass overflow-hidden rounded-2xl">
      {toolbar}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px]" dir="ltr">
        <div className="min-w-0">{viewer}{strip}</div>
        <aside className="border-t border-border p-2 lg:max-h-[86vh] lg:overflow-y-auto lg:border-s lg:border-t-0">{panel}</aside>
      </div>
    </div>
  );

  const txClip = txPick ? proj.clips.find((c) => c.id === txPick) : undefined;
  return <>{full ? createPortal(body, document.body) : body}{libraryPicker && createPortal(libraryPicker, document.body)}
    {txClip && createPortal(<TransitionPicker value={txClip.transition} onClose={() => setTxPick(null)}
      onPick={(id) => { updClip(txClip.id, { transition: id }); void seek(Math.max(0, startOf(txClip.id) - 0.3)).then(() => { if (!playing.current) void run(Math.max(0, startOf(txClip.id) - 0.3)); setTimeout(() => (playing.current = false), 1400); }); }}
      onAll={(id) => { update((p) => ({ ...p, clips: p.clips.map((c, i) => (i > 0 ? { ...c, transition: id } : c)) })); toast.success("طُبق الانتقال على كل المقاطع"); }} />, document.body)}</>;
}

function ClipChip({ clip, index }: { clip: Clip; index: number }) {
  return (
    <div className="p-1.5 text-[11px]" dir="rtl">
      <div className="flex items-center gap-1">{clip.kind === "video" ? <Film className="size-3 text-gold" /> : <ImageIcon className="size-3 text-gold" />}<b>{index + 1}</b>{clip.key.mode !== "none" && <Wand2 className="size-3 text-gold" />}</div>
      <div className="truncate" dir="auto">{clip.asset.name}</div>
      <div className="font-mono text-muted-foreground" dir="ltr">{clipLen(clip).toFixed(1)}s</div>
    </div>
  );
}
function Chip({ active, onClick, icon, label, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string }) {
  return <button type="button" onClick={onClick} className={`flex max-w-[160px] shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${active ? "border-gold" : "border-border"}`} dir="rtl"><span className="text-gold">{icon}</span><span className="truncate" dir="auto">{label}</span><span className="font-mono text-muted-foreground" dir="ltr">{sub}</span></button>;
}
