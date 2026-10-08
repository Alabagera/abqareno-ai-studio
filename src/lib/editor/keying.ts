import type { ImageSegmenter } from "@mediapipe/tasks-vision";
import type { Keying } from "./types";

// Background removal for clips and picture-in-picture layers.
// "ai" = person segmentation (no green screen), "chroma" = colour key.
let segmenter: ImageSegmenter | null = null;
let loading: Promise<void> | null = null;
export let segmenterState: "idle" | "loading" | "ready" | "failed" = "idle";

export function loadSegmenter() {
  if (loading) return loading;
  segmenterState = "loading";
  loading = (async () => {
    try {
      const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
      const fs = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm");
      const opts = (delegate: "GPU" | "CPU") => ({ baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite", delegate }, runningMode: "IMAGE" as const, outputConfidenceMasks: true, outputCategoryMask: false });
      segmenter = await ImageSegmenter.createFromOptions(fs, opts("GPU")).catch(() => ImageSegmenter.createFromOptions(fs, opts("CPU")));
      segmenterState = "ready";
    } catch (e) { console.error("segmenter", e); segmenterState = "failed"; }
  })();
  return loading;
}

const cache = new Map<string, { canvas: HTMLCanvasElement; sig: string }>();
const hexRgb = (h: string) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };
const ycc = (r: number, g: number, b: number) => [0.5 * r - 0.4187 * g - 0.0813 * b, -0.1687 * r - 0.3313 * g + 0.5 * b] as const;

/** Returns a canvas with the keyed (transparent background) frame. */
export function keyed(id: string, el: HTMLVideoElement | HTMLImageElement, key: Keying, filter: string, maxW = 720): HTMLCanvasElement | null {
  const sw = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth, sh = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
  if (!sw || !sh) return null;
  const s = Math.min(1, maxW / sw), w = Math.round(sw * s), h = Math.round(sh * s);
  const sig = `${el instanceof HTMLVideoElement ? el.currentTime.toFixed(3) : "img"}|${JSON.stringify(key)}|${filter}|${w}`;
  let entry = cache.get(id);
  if (entry && entry.sig === sig) return entry.canvas;
  if (!entry) { entry = { canvas: document.createElement("canvas"), sig: "" }; cache.set(id, entry); }
  const c = entry.canvas; c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.filter = filter; ctx.drawImage(el, 0, 0, w, h); ctx.filter = "none";
  const img = ctx.getImageData(0, 0, w, h); const d = img.data;
  if (key.mode === "chroma") {
    const [kr, kg, kb] = hexRgb(key.color); const [kcb, kcr] = ycc(kr, kg, kb);
    const tol = key.tolerance * 1.6, soft = Math.max(1, key.softness * 1.6);
    for (let i = 0; i < d.length; i += 4) {
      const [cb, cr] = ycc(d[i]!, d[i + 1]!, d[i + 2]!);
      const dist = Math.hypot(cb - kcb, cr - kcr);
      const a = dist < tol ? 0 : dist < tol + soft ? (dist - tol) / soft : 1;
      d[i + 3] = d[i + 3]! * a;
      if (a < 1 && a > 0) { const g = d[i + 1]!; d[i + 1] = Math.min(g, (d[i]! + d[i + 2]!) / 2 + 10); } // spill suppression
    }
  } else if (key.mode === "ai") {
    if (segmenterState === "idle") void loadSegmenter();
    if (!segmenter) { entry.sig = ""; return c; }
    const res = segmenter.segment(c);
    const mask = res.confidenceMasks?.[0];
    if (mask) {
      const m = mask.getAsFloat32Array(); const mw = mask.width, mh = mask.height;
      const lo = key.tolerance / 200, hi = Math.min(1, lo + Math.max(0.02, key.softness / 100));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = m[Math.floor((y * mh) / h) * mw + Math.floor((x * mw) / w)] ?? 0;
        const a = v <= lo ? 0 : v >= hi ? 1 : (v - lo) / (hi - lo);
        const i = (y * w + x) * 4 + 3; d[i] = d[i]! * a;
      }
    }
    res.close();
  }
  ctx.putImageData(img, 0, 0);
  entry.sig = sig;
  return c;
}
