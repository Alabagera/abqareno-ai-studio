// Serializable editor project model. Media is referenced by its private
// library path (re-signed on load); `url` is only a runtime value.

export interface Asset { path: string | null; url: string; name: string }
export interface Filters { brightness: number; contrast: number; saturate: number; hue: number; grayscale: number; sepia: number; blur: number }
export type Transition = "none" | "fade" | "zoom" | "slide" | "blur" | "flash" | "spin" | "wipe" | "circle" | "whip" | "glitch" | "dip" | "push";
export type KeyMode = "none" | "ai" | "chroma";
export interface Keying { mode: KeyMode; color: string; tolerance: number; softness: number }
export interface AudioFx { mic: string; gain: number; bass: number; presence: number; air: number; comp: number; clean: number }
export type Anim = "none" | "fade" | "pop" | "slideUp" | "slideSide" | "typewriter";

export interface Clip {
  id: string; kind: "video" | "image"; asset: Asset; natural: number; trimStart: number; trimEnd: number; imageDuration: number; speed: number;
  fit: "cover" | "contain"; kenBurns: boolean; transition: Transition; fadeIn: number; fadeOut: number; muted: boolean; flipX: boolean; rotate: number; zoom: number;
  filters: Filters; key: Keying; audio: AudioFx;
}
export interface Overlay {
  id: string; kind: "video" | "image"; asset: Asset; start: number; natural: number; trimStart: number; trimEnd: number; imageDuration: number;
  x: number; y: number; w: number; opacity: number; shape: "rect" | "round" | "circle"; border: string; borderWidth: number; shadow: boolean; rotate: number;
  anim: Anim; muted: boolean; key: Keying; audio: AudioFx; filters: Filters;
}
export interface AudioLayer {
  id: string; name: string; asset: Asset; kind: "voice" | "music" | "sfx"; start: number; natural: number; trimStart: number; trimEnd: number;
  fadeIn: number; fadeOut: number; loop: boolean; muted: boolean; audio: AudioFx;
}
export interface Caption { id: string; start: number; end: number; text: string; translation: string }
export interface CaptionStyle {
  show: boolean; font: string; size: number; color: string; bg: string; activeColor: string; activeBg: string; highlight: boolean; x: number; y: number; maxWidth: number;
  showTranslation: boolean; targetLang: string; tFont: string; tSize: number; tColor: string; tBg: string; tY: number;
}
export interface TextItem { id: string; text: string; start: number; end: number; x: number; y: number; size: number; color: string; bg: string; font: string; bold: boolean; anim: Anim }
export interface Branding {
  bgColor: string; bgImage: Asset | null; bgBlur: boolean; logo: Asset | null; logoX: number; logoY: number; logoSize: number; logoOpacity: number;
  vignette: number; grain: number; letterbox: boolean;
  /** Optional pro grade: whole-frame tint, glow, shake and fades. */
  tint?: string; tintStrength?: number; bloom?: number; shake?: number; fadeStart?: number; fadeEnd?: number;
}
export interface Project {
  version: 1; sizeId: string; clips: Clip[]; overlays: Overlay[]; audios: AudioLayer[]; captions: Caption[]; captionStyle: CaptionStyle; texts: TextItem[];
  brand: Branding; script: string; voice: string; masterGain: number;
  /** Music/sfx level (%) while a voice layer plays; 100 = no ducking. */
  duck?: number; audioFadeIn?: number; audioFadeOut?: number;
}

export const NO_FILTERS: Filters = { brightness: 100, contrast: 100, saturate: 100, hue: 0, grayscale: 0, sepia: 0, blur: 0 };
export const NO_KEY: Keying = { mode: "none", color: "#00FF00", tolerance: 30, softness: 15 };
export const FLAT_AUDIO: AudioFx = { mic: "none", gain: 100, bass: 0, presence: 0, air: 0, comp: 0, clean: 10 };

export const MICS: { id: string; label: string; bass: number; presence: number; air: number; comp: number; clean: number }[] = [
  { id: "none", label: "بدون محاكاة (الصوت الأصلي)", bass: 0, presence: 0, air: 0, comp: 0, clean: 0 },
  { id: "sm7b", label: "Shure SM7B — إذاعي دافئ وقوي", bass: 3, presence: 4, air: 0.5, comp: 60, clean: 25 },
  { id: "u87", label: "Neumann U87 — استوديو عالمي فاخر", bass: 1.5, presence: 2.5, air: 4, comp: 40, clean: 15 },
  { id: "re20", label: "Electro-Voice RE20 — بودكاست عميق", bass: 4, presence: 2, air: -1, comp: 65, clean: 25 },
  { id: "mkh416", label: "Sennheiser MKH 416 — تعليق سينمائي", bass: -1, presence: 5, air: 3, comp: 50, clean: 35 },
  { id: "c414", label: "AKG C414 — نقي ومفصّل", bass: 0.5, presence: 2, air: 5, comp: 35, clean: 15 },
  { id: "tlm103", label: "Neumann TLM 103 — تعليق إعلاني حاد", bass: 1, presence: 3.5, air: 3.5, comp: 55, clean: 20 },
  { id: "nt1", label: "Rode NT1 — هادئ وناعم", bass: 1, presence: 1.5, air: 2.5, comp: 30, clean: 15 },
  { id: "procaster", label: "Rode Procaster — بث مباشر واضح", bass: 2, presence: 3, air: 1, comp: 55, clean: 30 },
  { id: "sm58", label: "Shure SM58 — صوت حي للمسرح", bass: 2, presence: 3, air: -2, comp: 50, clean: 30 },
];

export const AUDIO_PRESETS: { label: string; fx: AudioFx }[] = [
  { label: "طبيعي", fx: FLAT_AUDIO },
  { label: "إذاعي قوي", fx: { mic: "sm7b", gain: 180, bass: 2, presence: 2, air: 1, comp: 75, clean: 30 } },
  { label: "بودكاست", fx: { mic: "re20", gain: 160, bass: 1, presence: 2, air: 1, comp: 70, clean: 30 } },
  { label: "سينمائي", fx: { mic: "mkh416", gain: 170, bass: 3, presence: 1, air: 2, comp: 65, clean: 35 } },
  { label: "وضوح فائق", fx: { mic: "c414", gain: 150, bass: -2, presence: 5, air: 4, comp: 55, clean: 45 } },
  { label: "موسيقى خلفية", fx: { mic: "none", gain: 35, bass: 1, presence: -3, air: 0, comp: 20, clean: 0 } },
];

export const PRESETS: { label: string; f: Partial<Filters> }[] = [
  { label: "بدون", f: {} }, { label: "سينمائي", f: { contrast: 120, saturate: 85, sepia: 15 } }, { label: "دافئ", f: { saturate: 120, sepia: 30, hue: -10 } },
  { label: "بارد", f: { hue: 15, saturate: 90, brightness: 105 } }, { label: "أبيض وأسود", f: { grayscale: 100, contrast: 115 } }, { label: "حيوي", f: { saturate: 150, contrast: 110 } },
  { label: "قديم", f: { sepia: 70, contrast: 90 } }, { label: "تيل وبرتقالي (هوليوود)", f: { contrast: 118, saturate: 125, hue: -8, sepia: 12 } },
  { label: "Kodak دافئ", f: { contrast: 108, saturate: 115, sepia: 22, brightness: 103 } }, { label: "Fuji ناعم", f: { contrast: 95, saturate: 110, hue: 6, brightness: 104 } },
  { label: "نوار أسود", f: { grayscale: 100, contrast: 160, brightness: 85 } }, { label: "مطفي (Matte)", f: { contrast: 82, saturate: 88, brightness: 108 } },
  { label: "Bleach Bypass", f: { contrast: 140, saturate: 45 } }, { label: "الساعة الذهبية", f: { sepia: 40, saturate: 130, brightness: 106, hue: -12 } },
  { label: "ليل القمر", f: { hue: 25, saturate: 70, brightness: 85, contrast: 115 } }, { label: "أكشن", f: { contrast: 135, saturate: 115, brightness: 95 } }, { label: "حالم", f: { brightness: 110, saturate: 80, blur: 1 } }, { label: "درامي", f: { contrast: 145, saturate: 70, brightness: 90 } },
];
export const TRANSITIONS: { id: Transition; label: string }[] = [
  { id: "none", label: "بدون" }, { id: "fade", label: "تلاشي" }, { id: "zoom", label: "تقريب" }, { id: "slide", label: "انزلاق" }, { id: "blur", label: "ضبابي" }, { id: "flash", label: "وميض" }, { id: "spin", label: "دوران" },
  { id: "wipe", label: "مسح جانبي" }, { id: "circle", label: "دائرة تتسع" }, { id: "whip", label: "انزلاق سريع (Whip)" }, { id: "push", label: "دفع" }, { id: "glitch", label: "تشويش رقمي (Glitch)" }, { id: "dip", label: "عبر الأسود" },
];
export const ANIMS: { id: Anim; label: string }[] = [
  { id: "none", label: "بدون" }, { id: "fade", label: "ظهور تدريجي" }, { id: "pop", label: "قفزة" }, { id: "slideUp", label: "صعود" }, { id: "slideSide", label: "دخول جانبي" }, { id: "typewriter", label: "آلة كاتبة" },
];
export const LANGS = [{ id: "en", l: "English" }, { id: "ar", l: "العربية" }, { id: "fr", l: "Français" }, { id: "es", l: "Español" }, { id: "tr", l: "Türkçe" }, { id: "ur", l: "اردو" }, { id: "hi", l: "हिन्दी" }, { id: "de", l: "Deutsch" }, { id: "zh", l: "中文" }, { id: "id", l: "Indonesia" }];
export const VOICES = [{ id: "Charon", l: "رجالي عميق" }, { id: "Orus", l: "رجالي حازم" }, { id: "Kore", l: "نسائي واضح" }, { id: "Aoede", l: "نسائي دافئ" }];

export const newProject = (): Project => ({
  version: 1, sizeId: "yt", clips: [], overlays: [], audios: [], captions: [], texts: [], script: "", voice: "Charon", masterGain: 100,
  captionStyle: { show: true, font: "Cairo", size: 58, color: "#FFFFFF", bg: "rgba(0,0,0,0.55)", activeColor: "#1A1A2E", activeBg: "#FFD700", highlight: true, x: 50, y: 82, maxWidth: 86, showTranslation: false, targetLang: "en", tFont: "Montserrat", tSize: 40, tColor: "#FFD700", tBg: "rgba(0,0,0,0.45)", tY: 92 },
  brand: { bgColor: "#000000", bgImage: null, bgBlur: true, logo: null, logoX: 8, logoY: 8, logoSize: 12, logoOpacity: 90, vignette: 0, grain: 0, letterbox: false },
});

export const clipLen = (c: Clip) => (c.kind === "image" ? c.imageDuration : Math.max(0.1, (c.trimEnd - c.trimStart) / c.speed));
export const ovLen = (o: Overlay) => (o.kind === "image" ? o.imageDuration : Math.max(0.1, o.trimEnd - o.trimStart));
export const audLen = (a: AudioLayer) => Math.max(0.1, a.trimEnd - a.trimStart);
export const mainLen = (p: Project) => p.clips.reduce((s, c) => s + clipLen(c), 0);
export const totalLen = (p: Project) => Math.max(mainLen(p), ...p.overlays.map((o) => o.start + ovLen(o)), ...p.audios.filter((a) => !a.loop).map((a) => a.start + audLen(a)), ...p.texts.map((t) => t.end), ...p.captions.map((c) => c.end), 0);

/** Strips runtime URLs from library-backed assets before saving. */
export function serialize(p: Project): Project {
  return JSON.parse(JSON.stringify(p, (k, v) => (k === "url" ? "" : v))) as Project;
}
export const filterCss = (f: Filters) => `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) hue-rotate(${f.hue}deg) grayscale(${f.grayscale}%) sepia(${f.sepia}%) blur(${f.blur}px)`;
