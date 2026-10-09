// Library of symbols (emoji/glyphs) and ready-made text boxes for the editor.
import type { TextItem } from "./types";

const split = (s: string) => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].map((x) => x.segment).filter((x) => x.trim());

export const SYMBOL_GROUPS: { id: string; label: string; items: string[] }[] = [
  { id: "faces", label: "وجوه", items: split("😀😃😄😁😆😅🤣😂🙂😉😊😇🥰😍🤩😘😋😛😜🤪😝🤑🤗🤭🤫🤔🤐🤨😐😑😶😏😒🙄😬😮‍💨🤥😌😔😪🤤😴😷🤒🤕🤢🤮🥵🥶🥴😵🤯🤠🥳🥸😎🤓🧐😕😟🙁😮😯😲😳🥺😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀☠️💩🤡👹👺👻👽👾🤖") },
  { id: "hands", label: "أيادي", items: split("👋🤚🖐️✋🖖👌🤌🤏✌️🤞🤟🤘🤙👈👉👆🖕👇☝️👍👎✊👊🤛🤜👏🙌👐🤲🤝🙏✍️💅🤳💪🦾🫶🫡🫰🫵🫱🫲") },
  { id: "hearts", label: "قلوب", items: split("❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟❤️‍🔥❤️‍🩹💋💌") },
  { id: "arrows", label: "أسهم", items: split("⬆️↗️➡️↘️⬇️↙️⬅️↖️↕️↔️↩️↪️⤴️⤵️🔃🔄🔙🔚🔛🔜🔝➜➤➥➦➧➨➩➪➫➬➭➮➯➱➲➳➵➸➹➺➻➼➽⇦⇧⇨⇩⇪⟵⟶⟷") },
  { id: "signs", label: "علامات", items: split("✅☑️✔️❌❎➕➖➗✖️♾️‼️⁉️❓❔❕❗〰️💯🔞📵🚫⛔⭕🛑⚠️🚸🔱⚜️🔰♻️✳️❇️✴️💠🔷🔶🔹🔸🔺🔻🔴🟠🟡🟢🔵🟣⚫⚪🟥🟧🟨🟩🟦🟪⬛⬜🔘🔲🔳") },
  { id: "stars", label: "نجوم ولمعان", items: split("⭐🌟✨💫⚡🔥💥☄️🌈☀️🌤️⛅🌙🌛🌜🌝🌞🪐🌍🌎🌏💎🎇🎆🎉🎊🎈🎁🏆🥇🥈🥉🏅🎖️👑") },
  { id: "media", label: "سوشيال وميديا", items: split("▶️⏸️⏯️⏹️⏺️⏭️⏮️⏩⏪🔔🔕📢📣📯🎵🎶🎤🎧📻🎬🎥📹📷📸📺📱💻🖥️⌚💬💭🗨️🗯️👁️‍🗨️📌📍🔗🏷️🔖📎✂️🔍🔎💡📈📉📊🗓️⏰⏳⌛") },
  { id: "money", label: "أعمال", items: split("💰💵💴💶💷💸💳🧾🏦🏢🏪🛒🛍️📦🎯🚀📝📋📁📂🗂️💼🖊️✏️📚📖🔐🔑🗝️⚙️🛠️🔧🔨⚒️🧲🧪🔬🔭") },
  { id: "nature", label: "طبيعة", items: split("🌸💮🏵️🌹🥀🌺🌻🌼🌷🌱🪴🌲🌳🌴🌵🌾🌿☘️🍀🍁🍂🍃🍄🌊💧💦☔❄️☃️⛄🌪️🌫️🐶🐱🐭🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🦅🦉🦋🐝🐞🐢🐍🐬🐳🐟🐠🦈🐪🐫🐎🦄") },
  { id: "food", label: "طعام", items: split("🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🥑🍆🥔🥕🌽🌶️🥒🥬🥦🧄🧅🍞🥐🥖🧀🥚🍳🥞🧇🥓🍗🍖🌭🍔🍟🍕🥪🌮🌯🥗🍝🍜🍲🍛🍣🍱🍤🍙🍚🍰🎂🧁🍩🍪🍫🍬🍭🍯☕🍵🧃🥤🧋") },
  { id: "travel", label: "سفر وأماكن", items: split("🚗🚕🚙🚌🏎️🚓🚑🚒🚚🚜🏍️🛵🚲✈️🛫🛬🚁⛵🚤🛳️🚢⚓🚉🚇🗺️🧭🏔️⛰️🌋🏕️🏖️🏜️🏝️🏟️🏛️🏗️🏠🏡🕌🕋⛪🏰🗼🗽🌉🎡🎢") },
  { id: "islamic", label: "مناسبات", items: split("🕌🕋☪️📿🤲🌙🌛⭐🏮🎆🎇🎉🎊🎂🎁🎀🎈💐👰🤵💍🎓🎒🏫🎄🎃🪔🧨") },
  { id: "sport", label: "رياضة وألعاب", items: split("⚽🏀🏈⚾🥎🎾🏐🏉🥏🎱🏓🏸🏒🥊🥋⛳🏹🎣🤿🎿⛷️🏂🏋️🤸⛹️🤺🏊🚴🏇🎮🕹️🎲♟️🧩🎯🎳") },
  { id: "flags", label: "أعلام", items: split("🇸🇩🇸🇦🇶🇦🇦🇪🇪🇬🇰🇼🇧🇭🇴🇲🇯🇴🇸🇾🇱🇧🇮🇶🇾🇪🇵🇸🇱🇾🇹🇳🇩🇿🇲🇦🇲🇷🇸🇴🇩🇯🇰🇲🇹🇷🇺🇸🇬🇧🇫🇷🇩🇪🇮🇹🇪🇸🇨🇦🇧🇷🇮🇳🇵🇰🇨🇳🇯🇵🇰🇷🇷🇺🏁🏳️🏴") },
  { id: "glyphs", label: "رموز زخرفية", items: split("★☆✦✧✩✪✫✬✭✮✯✰❂❉❋✺✹✸✷✶✵✴❄❅❆☀☼☾☽♛♚♜♝♞♟♔♕♖♗♘♙♠♣♥♦♤♧♡♢☯☮✿❀❁✾✽⚘❦❧☘⚝۞۩✵☪﷽〄※§¶©®™℗∞≈≠±√∑∆◆◇◈○●◎◉◌◍◐◑◒◓▲△▼▽◀▶◁▷■□▣▤▥▦▧▨▩") },
];
export const SYMBOL_COUNT = SYMBOL_GROUPS.reduce((s, g) => s + g.items.length, 0);

// Ready-made text boxes: phrases × visual styles (hundreds of combinations).
const PHRASES: { g: string; t: string[] }[] = [
  { g: "عناوين", t: ["عنوان الفيديو", "الحلقة الأولى", "الجزء الثاني", "قصة اليوم", "خبر عاجل", "حصريًا", "جديد", "الآن", "قريبًا", "مباشر"] },
  { g: "تفاعل", t: ["اشترك في القناة", "فعّل الجرس 🔔", "لايك ومشاركة", "اكتب رأيك في التعليقات", "تابعني للمزيد", "شارك الفيديو", "احفظ الفيديو", "رابط في البايو"] },
  { g: "تسويق", t: ["عرض خاص", "خصم 50%", "لفترة محدودة", "اطلب الآن", "توصيل مجاني", "الأكثر مبيعًا", "اتصل بنا", "واتساب للطلب"] },
  { g: "تعليم", t: ["معلومة سريعة", "هل تعلم؟", "الخطوة الأولى", "نصيحة اليوم", "ملخص", "سؤال وجواب", "خطأ شائع", "الحل"] },
  { g: "مناسبات", t: ["رمضان كريم", "عيد مبارك", "جمعة مباركة", "كل عام وأنتم بخير", "مبروك", "شكرًا لكم", "صباح الخير", "مساء الخير"] },
  { g: "English", t: ["SUBSCRIBE", "Breaking News", "Coming Soon", "Watch Till The End", "Part 1", "Follow For More", "Limited Offer", "Thank You"] },
];
const STYLES: { id: string; label: string; s: Partial<TextItem> }[] = [
  { id: "plain", label: "أبيض بسيط", s: { color: "#FFFFFF", bg: "transparent", font: "Cairo", bold: true, anim: "fade" } },
  { id: "gold", label: "ذهبي فخم", s: { color: "#FFD700", bg: "rgba(0,0,0,0.55)", font: "Amiri", bold: true, anim: "pop" } },
  { id: "red", label: "عاجل أحمر", s: { color: "#FFFFFF", bg: "#E11D48", font: "Cairo", bold: true, anim: "slideSide" } },
  { id: "yellow", label: "أصفر صارخ", s: { color: "#111111", bg: "#FFD700", font: "Cairo", bold: true, anim: "pop" } },
  { id: "blue", label: "أزرق احترافي", s: { color: "#FFFFFF", bg: "#1D4ED8", font: "Tajawal", bold: true, anim: "slideUp" } },
  { id: "green", label: "أخضر", s: { color: "#FFFFFF", bg: "#059669", font: "Tajawal", bold: true, anim: "slideUp" } },
  { id: "dark", label: "شريط داكن", s: { color: "#FFFFFF", bg: "rgba(0,0,0,0.75)", font: "Readex Pro", bold: false, anim: "fade" } },
  { id: "white", label: "صندوق أبيض", s: { color: "#0F172A", bg: "#FFFFFF", font: "Cairo", bold: true, anim: "pop" } },
  { id: "pink", label: "وردي", s: { color: "#FFFFFF", bg: "#DB2777", font: "Cairo", bold: true, anim: "pop" } },
  { id: "purple", label: "بنفسجي", s: { color: "#FFFFFF", bg: "#7C3AED", font: "Tajawal", bold: true, anim: "slideSide" } },
  { id: "type", label: "آلة كاتبة", s: { color: "#3DDC84", bg: "rgba(0,0,0,0.7)", font: "Readex Pro", bold: false, anim: "typewriter" } },
  { id: "navy", label: "كحلي وذهبي", s: { color: "#FFD700", bg: "#0F172A", font: "Cairo", bold: true, anim: "slideUp" } },
];
export const TEXT_BOX_GROUPS = PHRASES.map((p) => ({ label: p.g, items: p.t.flatMap((t) => STYLES.map((st) => ({ key: `${p.g}-${t}-${st.id}`, text: t, style: st.label, s: st.s }))) }));
export const TEXT_BOX_STYLES = STYLES;
export const TEXT_BOX_COUNT = TEXT_BOX_GROUPS.reduce((s, g) => s + g.items.length, 0);
