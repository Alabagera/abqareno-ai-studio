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
  }
  return f;
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
function fill(c: CanvasRenderingContext2D, W: number, H: number, color: string) { c.fillStyle = color; c.fillRect(0, 0, W, H); }
