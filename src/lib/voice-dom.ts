// Page helpers for the voice commander: find buttons/fields/text on the current page by spoken words.
export const norm = (s: string) => s.replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();
const FILLER = new Set(["على", "علي", "زر", "الزر", "اضغط", "انقر", "دوس", "في", "من", "الى", "الي", "خانه", "حقل", "مربع", "مكان", "النص", "نص", "اكتب", "الصق", "الصقه", "و", "ال", "لي", "قسم", "click", "press", "the"]);
export const words = (s: string) => norm(s).split(/[\s،,.:]+/).map((w) => w.replace(/^(و|ال|بال|لل)/, "")).filter((w) => w.length > 1 && !FILLER.has(w));

const panel = () => document.querySelector("[data-voice-panel]");
const visible = (el: Element) => { const r = (el as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0 && !panel()?.contains(el); };
const labelOf = (el: Element) => {
  const h = el as HTMLInputElement;
  const lab = h.id ? document.querySelector(`label[for="${h.id}"]`)?.textContent : h.closest("label")?.textContent;
  return [h.getAttribute("aria-label"), h.getAttribute("title"), h.placeholder, lab, el.textContent].filter(Boolean).join(" ");
};
function bestEl(sel: string, w: string[]) {
  if (!w.length) return null;
  let top: { el: Element; s: number } | null = null;
  for (const el of document.querySelectorAll(sel)) {
    if (!visible(el)) continue;
    const t = norm(labelOf(el));
    const s = w.filter((x) => t.includes(x)).length;
    if (s && (!top || s > top.s || (s === top.s && t.length < norm(labelOf(top.el)).length))) top = { el, s };
  }
  return top && top.s >= Math.min(2, w.length) ? top.el : null;
}
export function clickByWords(phrase: string) {
  const el = bestEl("button, a, [role=button], [role=tab], summary, label, select", words(phrase));
  if (!el) return null;
  (el as HTMLElement).click(); (el as HTMLElement).focus?.();
  return (labelOf(el).trim().slice(0, 40)) || "الزر";
}
export function fieldByWords(phrase: string) {
  return bestEl("input:not([type=file]):not([type=checkbox]):not([type=range]), textarea, [contenteditable=true]", words(phrase)) as HTMLInputElement | HTMLElement | null;
}
export function focusedOrFirstField() {
  const a = document.activeElement;
  if (a && (a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement) && !panel()?.contains(a)) return a;
  return [...document.querySelectorAll("textarea, input[type=text], input:not([type])")].find(visible) as HTMLElement | undefined ?? null;
}
export function setField(el: HTMLElement, value: string, append = false) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const next = append && el.value ? `${el.value} ${value}` : value;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else { el.innerText = append ? `${el.innerText} ${value}` : value; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new FocusEvent("blur")); }
  el.focus(); el.scrollIntoView({ block: "center", behavior: "smooth" });
}
/** Finds a text block on the page containing the spoken words; returns its full text. */
export function findPageText(phrase: string) {
  const w = words(phrase); if (!w.length) return null;
  let top: { t: string; s: number } | null = null;
  for (const el of document.querySelectorAll("p, li, h1, h2, h3, h4, td, span, div, textarea, input")) {
    if (!visible(el)) continue;
    const raw = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : el.children.length > 3 ? "" : (el as HTMLElement).innerText;
    if (!raw || raw.length > 4000) continue;
    const s = w.filter((x) => norm(raw).includes(x)).length;
    if (s && (!top || s > top.s || (s === top.s && raw.length < top.t.length))) top = { t: raw.trim(), s };
  }
  return top && top.s >= Math.min(2, w.length) ? top.t : null;
}
export function setTheme(light: boolean) {
  document.documentElement.classList.toggle("light", light);
  localStorage.setItem("theme", light ? "light" : "dark");
  window.dispatchEvent(new Event("abq-theme"));
}
