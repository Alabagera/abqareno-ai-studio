// Transition effects applied to the incoming clip while the previous clip
// stays visible underneath. `p` is eased progress 0→1.
export interface TxFx {
  alpha: number; blur: number; scale: number; sx: number; sy: number; tx: number; ty: number; rot: number;
  clip?: (ctx: CanvasRenderingContext2D, W: number, H: number) => void;
  prevTx?: number; prevTy?: number; prevAlpha?: number; prevScale?: number;
  overlay?: (ctx: CanvasRenderingContext2D, W: number, H: number) => void;
}
export const TX_DURATION = 0.8;

export const TRANSITION_LIST: { id: string; label: string; group: string }[] = [
  { id: "none", label: "بدون", group: "أساسي" }, { id: "fade", label: "تلاشي", group: "أساسي" }, { id: "dip", label: "عبر الأسود", group: "أساسي" }, { id: "dipWhite", label: "عبر الأبيض", group: "أساسي" },
  { id: "flash", label: "وميض", group: "أساسي" }, { id: "blur", label: "ضبابي", group: "أساسي" }, { id: "dreamy", label: "حالم", group: "أساسي" },
  { id: "zoom", label: "تقريب", group: "تكبير" }, { id: "zoomOut", label: "تبعيد", group: "تكبير" }, { id: "lens", label: "عدسة سينمائية", group: "تكبير" }, { id: "zoomBlur", label: "تقريب ضبابي", group: "تكبير" }, { id: "bounce", label: "ارتداد", group: "تكبير" }, { id: "spinZoom", label: "دوران مع تقريب", group: "تكبير" },
  { id: "slide", label: "انزلاق يمين", group: "انزلاق" }, { id: "slideRight", label: "انزلاق يسار", group: "انزلاق" }, { id: "slideUp", label: "انزلاق لأعلى", group: "انزلاق" }, { id: "slideDown", label: "انزلاق لأسفل", group: "انزلاق" },
  { id: "push", label: "دفع لأعلى", group: "انزلاق" }, { id: "pushLeft", label: "دفع جانبي", group: "انزلاق" }, { id: "pushRight", label: "دفع عكسي", group: "انزلاق" }, { id: "pushDown", label: "دفع لأسفل", group: "انزلاق" },
  { id: "whip", label: "Whip سريع", group: "انزلاق" }, { id: "whipV", label: "Whip عمودي", group: "انزلاق" },
  { id: "wipe", label: "مسح يمين", group: "مسح" }, { id: "wipeRight", label: "مسح يسار", group: "مسح" }, { id: "wipeUp", label: "مسح لأعلى", group: "مسح" }, { id: "wipeDown", label: "مسح لأسفل", group: "مسح" }, { id: "wipeDiag", label: "مسح قطري", group: "مسح" },
  { id: "clock", label: "عقارب الساعة", group: "مسح" }, { id: "blinds", label: "ستائر أفقية", group: "مسح" }, { id: "blindsV", label: "ستائر عمودية", group: "مسح" }, { id: "checker", label: "رقعة شطرنج", group: "مسح" },
  { id: "doorH", label: "باب ينفتح", group: "مسح" }, { id: "doorV", label: "باب عمودي", group: "مسح" }, { id: "split", label: "انقسام", group: "مسح" },
  { id: "circle", label: "دائرة تتسع", group: "أشكال" }, { id: "rect", label: "مربع يتسع", group: "أشكال" }, { id: "diamond", label: "معيّن", group: "أشكال" }, { id: "star", label: "نجمة", group: "أشكال" }, { id: "heart", label: "قلب", group: "أشكال" },
  { id: "spin", label: "دوران", group: "ثلاثي الأبعاد" }, { id: "flip", label: "قلب أفقي", group: "ثلاثي الأبعاد" }, { id: "flipV", label: "قلب عمودي", group: "ثلاثي الأبعاد" }, { id: "cube", label: "مكعب", group: "ثلاثي الأبعاد" }, { id: "page", label: "قلب صفحة", group: "ثلاثي الأبعاد" }, { id: "swing", label: "تأرجح", group: "ثلاثي الأبعاد" },
  { id: "glitch", label: "Glitch رقمي", group: "مؤثرات" }, { id: "rgbSplit", label: "انقسام ألوان", group: "مؤثرات" }, { id: "lightLeak", label: "تسرب ضوء", group: "مؤثرات" }, { id: "filmBurn", label: "احتراق فيلم", group: "مؤثرات" }, { id: "shake", label: "اهتزاز", group: "مؤثرات" }, { id: "ripple", label: "تموج", group: "مؤثرات" },
  { id: "shatter", label: "تحطّم الزجاج", group: "الإبداعية" },
  { id: "pixelate", label: "تفكك البكسلات", group: "الإبداعية" },
  { id: "vortex", label: "دوّامة", group: "الإبداعية" },
  { id: "portal", label: "بوابة زمنية", group: "الإبداعية" },
  { id: "inkDrop", label: "قطرة حبر", group: "الإبداعية" },
  { id: "honeycomb", label: "خلايا النحل", group: "الإبداعية" },
  { id: "mosaicRain", label: "مطر الفسيفساء", group: "الإبداعية" },
  { id: "slices", label: "شرائح السكين", group: "الإبداعية" },
  { id: "zigzag", label: "برق متعرّج", group: "الإبداعية" },
  { id: "wave", label: "موجة البحر", group: "الإبداعية" },
  { id: "curtainOpen", label: "ستارة المسرح", group: "الإبداعية" },
  { id: "spiral", label: "حلزون ذهبي", group: "الإبداعية" },
  { id: "radar", label: "رادار", group: "الإبداعية" },
  { id: "fan", label: "مروحة يابانية", group: "الإبداعية" },
  { id: "stripesDiag", label: "خطوط قطرية", group: "الإبداعية" },
  { id: "dissolve", label: "ذوبان رملي", group: "الإبداعية" },
  { id: "bars", label: "أعمدة الموسيقى", group: "الإبداعية" },
  { id: "eye", label: "رمشة عين", group: "الإبداعية" },
  { id: "hyperspace", label: "قفزة ضوئية", group: "الإبداعية" },
  { id: "tvOff", label: "تلفاز قديم", group: "الإبداعية" },
  { id: "prism", label: "منشور ألوان", group: "الإبداعية" },
  { id: "kaleido", label: "مشكال", group: "الإبداعية" },
  { id: "crossZoom", label: "تصادم سينمائي", group: "الإبداعية" },
  { id: "dropIn", label: "سقوط من السماء", group: "الإبداعية" },
  { id: "orbit", label: "مدار", group: "الإبداعية" },
  { id: "tornado", label: "إعصار", group: "الإبداعية" },
  { id: "flare", label: "وهج العدسة", group: "الإبداعية" },
  { id: "bloom", label: "تفتّح زهرة", group: "الإبداعية" },
  { id: "crack", label: "تشقق الأرض", group: "الإبداعية" },
  { id: "triangles", label: "مثلثات متطايرة", group: "الإبداعية" },
  { id: "moon", label: "خسوف القمر", group: "الإبداعية" },
  { id: "puzzle", label: "قطع الأحجية", group: "الإبداعية" },
  { id: "scanline", label: "مسح ليزر", group: "الإبداعية" },
  { id: "neon", label: "نيون متوهج", group: "الإبداعية" },
  { id: "goldDust", label: "غبار ذهبي", group: "الإبداعية" },
  { id: "domino", label: "دومينو", group: "الإبداعية" },
];

const base = (): TxFx => ({ alpha: 1, blur: 0, scale: 1, sx: 1, sy: 1, tx: 0, ty: 0, rot: 0 });
function poly(ctx: CanvasRenderingContext2D, pts: [number, number][]) { pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }

export function txFx(id: string, p: number, W: number, H: number): TxFx {
  const f = base(); const q = 1 - p; const R = Math.hypot(W, H) / 2;
  switch (id) {
    case "fade": f.alpha = p; break;
    case "dip": f.alpha = clamp01((p - 0.5) * 2); f.overlay = (c) => fill(c, W, H, `rgba(0,0,0,${1 - Math.abs(p - 0.5) * 2})`); break;
    case "dipWhite": f.alpha = clamp01((p - 0.5) * 2); f.overlay = (c) => fill(c, W, H, `rgba(255,255,255,${1 - Math.abs(p - 0.5) * 2})`); break;
    case "flash": f.overlay = (c) => fill(c, W, H, `rgba(255,255,255,${q})`); break;
    case "blur": f.alpha = p; f.blur = q * 24; break;
    case "dreamy": f.alpha = p; f.blur = q * 14; f.overlay = (c) => fill(c, W, H, `rgba(255,240,220,${q * 0.5})`); break;
    case "zoom": f.scale = 1.35 - 0.35 * p; f.alpha = p; break;
    case "zoomOut": f.scale = 0.6 + 0.4 * p; f.alpha = p; f.prevScale = 1 + p * 0.4; break;
    case "lens": f.scale = 1.6 - 0.6 * p; f.blur = q * 18; f.alpha = p; f.prevScale = 1 + p * 0.5; break;
    case "zoomBlur": f.scale = 2 - p; f.blur = q * 30; f.alpha = Math.min(1, p * 2); break;
    case "bounce": f.scale = p < 1 ? 0.4 + 0.6 * (1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2)) : 1; break;
    case "spinZoom": f.rot = q * Math.PI; f.scale = 0.2 + 0.8 * p; f.alpha = p; break;
    case "slide": f.tx = -q * W; break;
    case "slideRight": f.tx = q * W; break;
    case "slideUp": f.ty = q * H; break;
    case "slideDown": f.ty = -q * H; break;
    case "push": f.ty = q * H; f.prevTy = -p * H; break;
    case "pushLeft": f.tx = q * W; f.prevTx = -p * W; break;
    case "pushRight": f.tx = -q * W; f.prevTx = p * W; break;
    case "pushDown": f.ty = -q * H; f.prevTy = p * H; break;
    case "whip": f.tx = q * W * 1.2; f.blur = q * 30; f.prevTx = -p * W; break;
    case "whipV": f.ty = q * H * 1.2; f.blur = q * 30; f.prevTy = -p * H; break;
    case "wipe": f.clip = (c) => c.rect(0, 0, W * p, H); break;
    case "wipeRight": f.clip = (c) => c.rect(W * q, 0, W * p, H); break;
    case "wipeUp": f.clip = (c) => c.rect(0, H * q, W, H * p); break;
    case "wipeDown": f.clip = (c) => c.rect(0, 0, W, H * p); break;
    case "wipeDiag": f.clip = (c) => { const d = (W + H) * p; poly(c, [[0, 0], [d, 0], [0, d]]); }; break;
    case "clock": f.clip = (c) => { c.moveTo(W / 2, H / 2); c.arc(W / 2, H / 2, R, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); c.closePath(); }; break;
    case "blinds": f.clip = (c) => { const n = 10, h = H / n; for (let i = 0; i < n; i++) c.rect(0, i * h, W, h * p); }; break;
    case "blindsV": f.clip = (c) => { const n = 10, w = W / n; for (let i = 0; i < n; i++) c.rect(i * w, 0, w * p, H); }; break;
    case "checker": f.clip = (c) => { const n = 8, w = W / n, h = H / 6; for (let i = 0; i < n; i++) for (let j = 0; j < 6; j++) { const d = clamp01(p * 2 - ((i + j) % 2) * 0.6); c.rect(i * w + (w * (1 - d)) / 2, j * h + (h * (1 - d)) / 2, w * d, h * d); } }; break;
    case "doorH": f.clip = (c) => c.rect(W / 2 - (W / 2) * p, 0, W * p, H); break;
    case "doorV": f.clip = (c) => c.rect(0, H / 2 - (H / 2) * p, W, H * p); break;
    case "split": f.clip = (c) => { c.rect(0, 0, W, (H / 2) * p); c.rect(0, H - (H / 2) * p, W, (H / 2) * p); }; break;
    case "circle": f.clip = (c) => c.arc(W / 2, H / 2, R * p, 0, Math.PI * 2); break;
    case "rect": f.clip = (c) => c.rect(W / 2 - (W / 2) * p, H / 2 - (H / 2) * p, W * p, H * p); break;
    case "diamond": f.clip = (c) => { const r = R * 1.45 * p; poly(c, [[W / 2, H / 2 - r], [W / 2 + r, H / 2], [W / 2, H / 2 + r], [W / 2 - r, H / 2]]); }; break;
    case "star": f.clip = (c) => { const r = R * 2.2 * p; const pts: [number, number][] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; pts.push([W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr]); } poly(c, pts); }; break;
    case "heart": f.clip = (c) => { const s = R * 2.4 * p; const x = W / 2, y = H / 2 - s * 0.25; c.moveTo(x, y + s * 0.3); c.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3); c.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s); c.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3); c.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3); }; break;
    case "spin": f.rot = q * Math.PI * 0.5; f.scale = 0.6 + 0.4 * p; f.alpha = p; break;
    case "flip": if (p < 0.5) { f.alpha = 0; f.prevScale = 1; } f.sx = Math.max(0.001, Math.abs(Math.cos(q * Math.PI))) * (p < 0.5 ? 0 : 1); f.prevAlpha = p < 0.5 ? 1 : 0; break;
    case "flipV": f.sy = p < 0.5 ? 0.001 : Math.max(0.001, -Math.cos(p * Math.PI)); f.prevAlpha = p < 0.5 ? 1 : 0; break;
    case "cube": f.sx = Math.max(0.001, p); f.tx = (W / 2) * q; f.prevTx = -(W / 2) * p; f.overlay = (c) => fill(c, W, H, `rgba(0,0,0,${Math.sin(p * Math.PI) * 0.35})`); break;
    case "page": f.clip = (c) => c.rect(W * q, 0, W * p, H); f.overlay = (c) => { const x = W * q; const g = c.createLinearGradient(x - 60, 0, x + 20, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${0.5 * q})`); c.fillStyle = g; c.fillRect(x - 60, 0, 80, H); }; break;
    case "swing": f.rot = q * -0.6; f.tx = -q * W * 0.4; f.alpha = p; break;
    case "glitch": if (p < 1) { f.tx = (Math.random() - 0.5) * 60 * q; f.ty = (Math.random() - 0.5) * 12 * q; f.alpha = Math.random() > 0.25 ? 1 : 0.4; } break;
    case "rgbSplit": f.alpha = p; f.overlay = (c) => { if (p >= 1) return; c.save(); c.globalCompositeOperation = "screen"; c.globalAlpha = q * 0.6; c.drawImage(c.canvas, q * 30, 0); c.fillStyle = `rgba(255,0,80,${q * 0.25})`; c.fillRect(0, 0, W, H); c.restore(); }; break;
    case "lightLeak": f.alpha = p; f.overlay = (c) => { const g = c.createRadialGradient(W * (0.2 + p * 0.6), H * 0.3, 0, W * 0.5, H * 0.5, R); g.addColorStop(0, `rgba(255,170,60,${Math.sin(p * Math.PI) * 0.9})`); g.addColorStop(1, "rgba(255,60,0,0)"); c.save(); c.globalCompositeOperation = "screen"; c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); }; break;
    case "filmBurn": f.alpha = p; f.overlay = (c) => { const a = Math.sin(p * Math.PI); c.save(); c.globalCompositeOperation = "screen"; fill(c, W, H, `rgba(255,${120 + 100 * p},40,${a * 0.85})`); c.restore(); }; break;
    case "shake": f.tx = Math.sin(p * 60) * 40 * q; f.ty = Math.cos(p * 50) * 25 * q; f.alpha = Math.min(1, p * 3); break;
    case "ripple": f.alpha = p; f.scale = 1 + Math.sin(p * Math.PI * 4) * 0.05 * q; f.blur = q * 8; break;
    case "shatter": f.clip = (c) => { const n = 7; for (let i = 0; i < n; i++) for (let j = 0; j < 5; j++) { const d = clamp01(p * 2.2 - hash(i, j) * 1.2); if (d <= 0) continue; const w = W / n, h = H / 5, cx = i * w + w / 2, cy = j * h + h / 2; poly(c, [[cx - (w / 2) * d, cy - (h / 2) * d], [cx + (w / 2) * d, cy - (h / 2) * d * 0.6], [cx + (w / 2) * d * 0.8, cy + (h / 2) * d], [cx - (w / 2) * d, cy + (h / 2) * d * 0.7]]); } }; f.prevScale = 1 + p * 0.08; break;
    case "pixelate": f.clip = (c) => { const n = 16, m = 9, w = W / n, h = H / m; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if (hash(i, j) < p) c.rect(i * w, j * h, w + 1, h + 1); }; break;
    case "vortex": f.rot = q * Math.PI * 3; f.scale = 0.05 + 0.95 * p; f.prevScale = 1 + p; f.prevAlpha = q; break;
    case "portal": f.clip = (c) => c.ellipse(W / 2, H / 2, R * p * 1.1, R * p * 0.7, 0, 0, Math.PI * 2); f.overlay = (c) => { if (p >= 1) return; c.save(); c.strokeStyle = `rgba(120,200,255,${q})`; c.lineWidth = 6 + 10 * q; c.shadowColor = "#6cf"; c.shadowBlur = 30; c.beginPath(); c.ellipse(W / 2, H / 2, R * p * 1.1, R * p * 0.7, 0, 0, Math.PI * 2); c.stroke(); c.restore(); }; break;
    case "inkDrop": f.clip = (c) => { for (let k = 0; k < 7; k++) { const a = hash(k, 3) * Math.PI * 2, d = R * 0.5 * hash(k, 9); const r = R * clamp01(p * 1.6 - hash(k, 1) * 0.6) * 0.9; if (r > 0) { c.moveTo(W / 2 + Math.cos(a) * d + r, H / 2 + Math.sin(a) * d); c.arc(W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d, r, 0, Math.PI * 2); } } }; break;
    case "honeycomb": f.clip = (c) => { const r = W / 14; for (let y = 0, row = 0; y < H + r; y += r * 1.5, row++) for (let x = (row % 2) * r * 0.87; x < W + r; x += r * 1.74) { const d = clamp01(p * 2 - (x / W) * 0.9); if (d <= 0) continue; const pts: [number, number][] = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; pts.push([x + Math.cos(a) * r * d, y + Math.sin(a) * r * d]); } poly(c, pts); } }; break;
    case "mosaicRain": f.clip = (c) => { const n = 20, w = W / n; for (let i = 0; i < n; i++) { const d = clamp01(p * 1.8 - hash(i, 2) * 0.8); c.rect(i * w, 0, w + 1, H * d); } }; break;
    case "slices": f.clip = (c) => { const n = 6, h = H / n; for (let i = 0; i < n; i++) { const d = clamp01(p * 1.6 - i * 0.1); const dir = i % 2 ? 1 : -1; c.rect(dir > 0 ? 0 : W * (1 - d), i * h, W * d, h + 1); } }; break;
    case "zigzag": f.clip = (c) => { const x = W * p * 1.2; const pts: [number, number][] = [[0, 0]]; for (let k = 0; k <= 8; k++) pts.push([x + (k % 2 ? 40 : -40), (H * k) / 8]); pts.push([0, H]); poly(c, pts); }; f.overlay = (c) => fill(c, W, H, `rgba(200,220,255,${Math.max(0, Math.sin(p * Math.PI * 6)) * 0.35 * q})`); break;
    case "wave": f.clip = (c) => { const y0 = H * (1 - p * 1.25); c.moveTo(0, H); for (let x = 0; x <= W; x += 8) c.lineTo(x, y0 + Math.sin(x / 40 + p * 10) * 30); c.lineTo(W, H); c.closePath(); }; break;
    case "curtainOpen": f.prevTx = 0; f.overlay = (c) => { if (p >= 1) return; const w = (W / 2) * q; const g = c.createLinearGradient(0, 0, 40, 0); g.addColorStop(0, "#5a0d14"); g.addColorStop(1, "#9b1c26"); c.save(); c.fillStyle = "#7d1520"; c.fillRect(0, 0, w, H); c.fillRect(W - w, 0, w, H); c.fillStyle = "rgba(0,0,0,.25)"; for (let x = 0; x < w; x += 24) { c.fillRect(x, 0, 8, H); c.fillRect(W - x - 8, 0, 8, H); } c.restore(); }; break;
    case "spiral": f.clip = (c) => { c.moveTo(W / 2, H / 2); for (let a = 0; a < p * Math.PI * 8; a += 0.1) { const r = (a / (Math.PI * 8)) * R * 1.3 + p * R * 0.4; c.lineTo(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r); } c.lineTo(W / 2, H / 2); }; f.overlay = (c) => fill(c, W, H, `rgba(201,162,39,${Math.sin(p * Math.PI) * 0.18})`); break;
    case "radar": f.clip = (c) => { c.moveTo(W / 2, H / 2); c.arc(W / 2, H / 2, R, 0, p * Math.PI * 2); c.closePath(); }; f.overlay = (c) => { if (p >= 1) return; const a = p * Math.PI * 2; c.save(); c.strokeStyle = "rgba(80,255,140,.9)"; c.lineWidth = 4; c.shadowColor = "#5f8"; c.shadowBlur = 20; c.beginPath(); c.moveTo(W / 2, H / 2); c.lineTo(W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R); c.stroke(); c.restore(); }; break;
    case "fan": f.clip = (c) => { const n = 8; for (let i = 0; i < n; i++) { const a0 = (i * Math.PI * 2) / n; c.moveTo(W / 2, H / 2); c.arc(W / 2, H / 2, R, a0, a0 + ((Math.PI * 2) / n) * p); c.closePath(); } }; break;
    case "stripesDiag": f.clip = (c) => { const n = 12, s = (W + H) / n; for (let i = 0; i < n; i++) { const d = clamp01(p * 1.7 - i * 0.06) * s; poly(c, [[i * s - H, H], [i * s - H + d, H], [i * s + d, 0], [i * s, 0]]); } }; break;
    case "dissolve": f.clip = (c) => { const n = 40, m = 24, w = W / n, h = H / m; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if (hash(i * 7, j * 3) < p) c.rect(i * w, j * h, w + 1, h + 1); }; break;
    case "bars": f.clip = (c) => { const n = 14, w = W / n; for (let i = 0; i < n; i++) { const d = clamp01(p * 1.5 - Math.abs(Math.sin(i * 1.7)) * 0.5); c.rect(i * w, H * (1 - d), w - 2, H * d); } }; break;
    case "eye": f.clip = (c) => { const h = (H / 2) * p * 1.3; c.moveTo(0, H / 2); c.quadraticCurveTo(W / 2, H / 2 - h * 2, W, H / 2); c.quadraticCurveTo(W / 2, H / 2 + h * 2, 0, H / 2); }; break;
    case "hyperspace": f.scale = 0.3 + 0.7 * p; f.alpha = p; f.prevScale = 1 + p * 2; f.prevAlpha = q; f.overlay = (c) => { if (p >= 1) return; c.save(); c.strokeStyle = `rgba(255,255,255,${q * 0.8})`; c.lineWidth = 2; for (let k = 0; k < 60; k++) { const a = hash(k, 5) * Math.PI * 2, r0 = R * hash(k, 8) * p, r1 = r0 + R * 0.5 * p; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); c.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1); c.stroke(); } c.restore(); }; break;
    case "tvOff": if (p < 0.5) { f.alpha = 0; f.prevScale = 1; } else { f.sy = Math.max(0.01, (p - 0.5) * 2); } f.prevAlpha = p < 0.5 ? 1 : 0; f.overlay = (c) => { const k = 1 - Math.abs(p - 0.5) * 2; if (k <= 0) return; c.fillStyle = `rgba(255,255,255,${k})`; c.fillRect(0, H / 2 - 2 - (1 - k) * H * 0.3, W, 4 + (1 - k) * H * 0.6); }; break;
    case "prism": f.alpha = p; f.tx = Math.sin(p * Math.PI) * 30 * q; f.overlay = (c) => { const a = Math.sin(p * Math.PI) * 0.35; ["255,0,0", "0,255,0", "0,80,255"].forEach((rgb, i) => { c.fillStyle = `rgba(${rgb},${a / 2})`; c.fillRect((i - 1) * 20 * q, 0, W, H); }); }; break;
    case "kaleido": f.clip = (c) => { const n = 12; for (let i = 0; i < n; i++) { const a = (i * Math.PI * 2) / n + q * 2; c.moveTo(W / 2, H / 2); c.arc(W / 2, H / 2, R * p * 1.2, a, a + Math.PI / n); c.closePath(); } }; f.rot = q * 0.8; break;
    case "crossZoom": f.scale = 2.2 - 1.2 * p; f.blur = Math.sin(p * Math.PI) * 26; f.alpha = clamp01(p * 2 - 0.5); f.prevScale = 1 + p * 1.2; f.overlay = (c) => fill(c, W, H, `rgba(255,255,255,${Math.max(0, 1 - Math.abs(p - 0.5) * 5) * 0.8})`); break;
    case "dropIn": f.ty = -q * H * 1.1; f.scale = p < 1 ? 1 + Math.sin(p * Math.PI) * 0.06 : 1; f.prevTy = p > 0.85 ? Math.sin(p * 60) * 10 * (1 - p) * 6 : 0; break;
    case "orbit": f.tx = Math.cos(p * Math.PI) * W * 0.5 * q * -1; f.ty = Math.sin(p * Math.PI) * -H * 0.3; f.scale = 0.3 + 0.7 * p; f.rot = q * 0.5; f.prevScale = 1 - p * 0.3; break;
    case "tornado": f.rot = q * Math.PI * 6; f.scale = p; f.blur = q * 10; f.prevScale = 1 - p * 0.5; f.prevAlpha = q; break;
    case "flare": f.alpha = p; f.overlay = (c) => { const a = Math.sin(p * Math.PI); const x = W * (p * 1.4 - 0.2); const g = c.createRadialGradient(x, H * 0.4, 0, x, H * 0.4, R * 0.9); g.addColorStop(0, `rgba(255,255,230,${a})`); g.addColorStop(0.2, `rgba(255,200,120,${a * 0.6})`); g.addColorStop(1, "rgba(255,120,0,0)"); c.save(); c.globalCompositeOperation = "screen"; c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = `rgba(255,230,180,${a * 0.5})`; c.fillRect(0, H * 0.4 - 2, W, 4); c.restore(); }; break;
    case "bloom": f.clip = (c) => { const n = 8, r = R * p * 1.4; for (let i = 0; i < n; i++) { const a = (i * Math.PI * 2) / n + q; c.moveTo(W / 2, H / 2); c.ellipse(W / 2 + Math.cos(a) * r * 0.5, H / 2 + Math.sin(a) * r * 0.5, r * 0.55, r * 0.25, a, 0, Math.PI * 2); } c.moveTo(W / 2 + r * 0.4, H / 2); c.arc(W / 2, H / 2, r * 0.4, 0, Math.PI * 2); }; break;
    case "crack": f.clip = (c) => { const pts: [number, number][] = [[0, 0], [W, 0]]; const y = H * p * 1.1; for (let k = 10; k >= 0; k--) pts.push([(W * k) / 10, y + (hash(k, 4) - 0.5) * 60]); poly(c, pts); }; f.prevTy = Math.sin(p * 80) * 6 * q; break;
    case "triangles": f.clip = (c) => { const n = 8, m = 5, w = W / n, h = H / m; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const d = clamp01(p * 2 - hash(i, j + 11) * 1); if (d <= 0) continue; const x = i * w, y = j * h; if ((i + j) % 2) poly(c, [[x, y], [x + w * d * 1.02, y], [x, y + h * d * 1.02]]), poly(c, [[x + w, y + h], [x + w - w * d * 1.02, y + h], [x + w, y + h - h * d * 1.02]]); else c.rect(x + (w * (1 - d)) / 2, y + (h * (1 - d)) / 2, w * d, h * d); } }; break;
    case "moon": f.clip = (c) => { c.arc(W / 2, H / 2, R * 1.05, 0, Math.PI * 2); c.moveTo(W / 2 + R * 2.2 * q + R * 1.05, H / 2); c.arc(W / 2 + R * 2.2 * q, H / 2, R * 1.05 * q + 0.01, 0, Math.PI * 2, true); }; f.overlay = (c) => fill(c, W, H, `rgba(10,10,40,${Math.sin(p * Math.PI) * 0.4})`); break;
    case "puzzle": f.clip = (c) => { const n = 6, m = 4, w = W / n, h = H / m; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const d = clamp01(p * 2.2 - hash(i + 3, j) * 1.2); if (d <= 0) continue; const ox = (1 - d) * (hash(i, j) - 0.5) * W, oy = (1 - d) * -H; c.rect(i * w + ox, j * h + oy, w + 1, h + 1); c.moveTo(i * w + w + ox + w * 0.15, j * h + h / 2 + oy); c.arc(i * w + w + ox, j * h + h / 2 + oy, w * 0.15, 0, Math.PI * 2); } }; break;
    case "scanline": f.clip = (c) => c.rect(0, 0, W, H * p); f.overlay = (c) => { if (p >= 1) return; c.save(); c.fillStyle = "rgba(255,40,40,.95)"; c.shadowColor = "#f33"; c.shadowBlur = 25; c.fillRect(0, H * p - 3, W, 6); c.restore(); }; break;
    case "neon": f.clip = (c) => c.rect(W / 2 - (W / 2) * p, H / 2 - (H / 2) * p, W * p, H * p); f.overlay = (c) => { if (p >= 1) return; c.save(); c.strokeStyle = `hsl(${p * 360},100%,60%)`; c.lineWidth = 6; c.shadowColor = c.strokeStyle; c.shadowBlur = 30; c.strokeRect(W / 2 - (W / 2) * p, H / 2 - (H / 2) * p, W * p, H * p); c.restore(); }; break;
    case "goldDust": f.alpha = p; f.overlay = (c) => { if (p >= 1) return; c.save(); c.globalCompositeOperation = "screen"; for (let k = 0; k < 140; k++) { const x = hash(k, 1) * W, y = ((hash(k, 2) + p * (0.3 + hash(k, 3))) % 1) * H; c.fillStyle = `rgba(255,${190 + hash(k, 4) * 60},80,${Math.sin(p * Math.PI) * hash(k, 5)})`; c.beginPath(); c.arc(x, y, 1 + hash(k, 6) * 3, 0, Math.PI * 2); c.fill(); } c.restore(); }; break;
    case "domino": f.clip = (c) => { const n = 10, w = W / n; for (let i = 0; i < n; i++) { const d = clamp01(p * 2 - i * 0.1); c.rect(i * w, 0, w * d + (d > 0 ? 1 : 0), H); } }; f.prevTy = 0; break;
  }
  return f;
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
function fill(c: CanvasRenderingContext2D, W: number, H: number, color: string) { c.fillStyle = color; c.fillRect(0, 0, W, H); }

function hash(i: number, j: number) { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); }
