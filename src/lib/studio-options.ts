export const FONTS = [
  "Readex Pro", "Tajawal", "Cairo", "Amiri", "Lalezar", "Reem Kufi", "Markazi Text", "Aref Ruqaa", "El Messiri", "Changa",
  "Lemonada", "Mada", "Almarai", "IBM Plex Sans Arabic", "Noto Kufi Arabic", "Noto Naskh Arabic", "Scheherazade New", "Harmattan",
  "Lateef", "Mirza", "Rakkas", "Jomhuria", "Katibeh", "Vibes", "Marhey", "Blaka", "Kufam", "Baloo Bhaijaan 2", "Alexandria",
  "Zain", "Playpen Sans Arabic", "Montserrat", "Bebas Neue", "Oswald", "Playfair Display",
];

const loaded = new Set(["Readex Pro", "Tajawal"]);
export function loadFont(family: string) {
  if (typeof document === "undefined" || loaded.has(family)) return;
  loaded.add(family);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@400;700&display=swap`;
  document.head.appendChild(l);
}

export const COLORS = [
  "#FFFFFF", "#F5F5F5", "#BDBDBD", "#000000", "#1A1A2E", "#FFD700", "#E6B422", "#F4C430", "#FFA500", "#FF7F50",
  "#FF4500", "#FF0000", "#DC143C", "#C2185B", "#FF1493", "#FF69B4", "#E040FB", "#9C27B0", "#673AB7", "#3F51B5",
  "#1E3A8A", "#2196F3", "#03A9F4", "#00BCD4", "#00E5FF", "#009688", "#00C853", "#4CAF50", "#8BC34A", "#CDDC39",
  "#FFEB3B", "#FFF59D", "#795548", "#A1887F", "#607D8B", "#B0BEC5", "#0B132B", "#5BC0BE", "#F72585", "#7209B7",
];

export const GRADIENTS = [
  "linear-gradient(90deg,#FFD700,#FF8C00)", "linear-gradient(90deg,#00C6FF,#0072FF)", "linear-gradient(90deg,#F72585,#7209B7)",
  "linear-gradient(90deg,#00F260,#0575E6)", "linear-gradient(90deg,#FF416C,#FF4B2B)", "linear-gradient(90deg,#FDFC47,#24FE41)",
];

export interface SocialSize { id: string; platform: string; label: string; ratio: string; w: number; h: number }
export const SOCIAL_SIZES: SocialSize[] = [
  { id: "yt", platform: "يوتيوب", label: "فيديو يوتيوب", ratio: "16:9", w: 1920, h: 1080 },
  { id: "yt-shorts", platform: "يوتيوب", label: "يوتيوب شورتس", ratio: "9:16", w: 1080, h: 1920 },
  { id: "tiktok", platform: "تيك توك", label: "تيك توك", ratio: "9:16", w: 1080, h: 1920 },
  { id: "ig-reels", platform: "إنستغرام", label: "ريلز إنستغرام", ratio: "9:16", w: 1080, h: 1920 },
  { id: "ig-post", platform: "إنستغرام", label: "منشور مربع", ratio: "1:1", w: 1080, h: 1080 },
  { id: "ig-portrait", platform: "إنستغرام", label: "منشور طولي", ratio: "4:5", w: 1080, h: 1350 },
  { id: "ig-story", platform: "إنستغرام", label: "ستوري إنستغرام", ratio: "9:16", w: 1080, h: 1920 },
  { id: "fb-feed", platform: "فيسبوك", label: "فيديو فيسبوك", ratio: "16:9", w: 1920, h: 1080 },
  { id: "fb-square", platform: "فيسبوك", label: "منشور مربع", ratio: "1:1", w: 1080, h: 1080 },
  { id: "fb-portrait", platform: "فيسبوك", label: "منشور طولي", ratio: "4:5", w: 1080, h: 1350 },
  { id: "fb-reels", platform: "فيسبوك", label: "ريلز فيسبوك", ratio: "9:16", w: 1080, h: 1920 },
  { id: "fb-story", platform: "فيسبوك", label: "ستوري فيسبوك", ratio: "9:16", w: 1080, h: 1920 },
  { id: "x-land", platform: "إكس", label: "فيديو أفقي", ratio: "16:9", w: 1920, h: 1080 },
  { id: "x-square", platform: "إكس", label: "فيديو مربع", ratio: "1:1", w: 1080, h: 1080 },
  { id: "li-land", platform: "لينكدإن", label: "فيديو أفقي", ratio: "16:9", w: 1920, h: 1080 },
  { id: "li-square", platform: "لينكدإن", label: "فيديو مربع", ratio: "1:1", w: 1080, h: 1080 },
  { id: "li-portrait", platform: "لينكدإن", label: "فيديو طولي", ratio: "4:5", w: 1080, h: 1350 },
  { id: "snap", platform: "سناب شات", label: "سناب / سبوتلايت", ratio: "9:16", w: 1080, h: 1920 },
  { id: "pin", platform: "بنترست", label: "بن فيديو", ratio: "2:3", w: 1000, h: 1500 },
  { id: "wa-status", platform: "واتساب", label: "حالة واتساب", ratio: "9:16", w: 1080, h: 1920 },
  { id: "tg", platform: "تيليجرام", label: "فيديو تيليجرام", ratio: "16:9", w: 1280, h: 720 },
  { id: "threads", platform: "ثريدز", label: "فيديو ثريدز", ratio: "4:5", w: 1080, h: 1350 },
  { id: "custom", platform: "مخصص", label: "مقاس مخصص", ratio: "custom", w: 1080, h: 1080 },
];

export function estimateMinutes(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((words / 130) * 100) / 100;
}
