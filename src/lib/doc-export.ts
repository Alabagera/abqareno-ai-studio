// Turns an assistant Markdown answer into styled PDF / Word / PowerPoint / Excel
// files in the browser. The assistant may prepend a theme comment such as
// <!--theme: primary=#0b1f4b; accent=#d4af37; font=Tajawal--> to set colors.
import { marked, type Token, type Tokens } from "marked";

export type DocFormat = "pdf" | "docx" | "pptx" | "xlsx";
export interface DocTheme { primary: string; accent: string; text: string; font: string }

const DEFAULT: DocTheme = { primary: "#0b1f4b", accent: "#d4af37", text: "#1f2937", font: "Tajawal" };
const hex = (v?: string) => (v && /^#?[0-9a-f]{6}$/i.test(v.trim()) ? `#${v.trim().replace("#", "")}` : undefined);

export function parseTheme(md: string): { theme: DocTheme; body: string } {
  const m = md.match(/<!--\s*theme:([^>]*)-->/i);
  const theme = { ...DEFAULT };
  if (m) for (const pair of (m[1] ?? "").split(/[;,]/)) {
    const [k, v] = pair.split("=").map((s) => s?.trim());
    if (k === "primary") theme.primary = hex(v) ?? theme.primary;
    if (k === "accent") theme.accent = hex(v) ?? theme.accent;
    if (k === "text") theme.text = hex(v) ?? theme.text;
    if (k === "font" && v) theme.font = v.replace(/[^\w\s-]/g, "");
  }
  return { theme, body: md.replace(/<!--\s*theme:[^>]*-->/gi, "").trim() };
}

const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s);
const plain = (s: string) => s.replace(/\*\*|__|`|\*|_/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
const noHash = (c: string) => c.replace("#", "");

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function titleOf(tokens: Token[], fallback: string) {
  const h = tokens.find((t) => t.type === "heading") as Tokens.Heading | undefined;
  return plain(h?.text ?? fallback).slice(0, 80);
}

async function toPdf(body: string, theme: DocTheme, name: string) {
  const html = await marked.parse(body);
  const rtl = isArabic(body);
  const el = document.createElement("div");
  el.dir = rtl ? "rtl" : "ltr";
  el.innerHTML = `<style>
    .doc{font-family:'${theme.font}','Noto Sans Arabic','Noto Sans',sans-serif;color:${theme.text};padding:28px 34px;line-height:1.8;font-size:13px;background:#fff}
    .doc h1{color:${theme.primary};border-bottom:3px solid ${theme.accent};padding-bottom:6px;font-size:24px}
    .doc h2{color:${theme.primary};font-size:19px;margin-top:18px}.doc h3{color:${theme.accent};font-size:16px}
    .doc table{border-collapse:collapse;width:100%;margin:10px 0}.doc th{background:${theme.primary};color:#fff}
    .doc th,.doc td{border:1px solid #cbd5e1;padding:6px 8px;text-align:start}.doc tr:nth-child(even) td{background:#f8fafc}
    .doc blockquote{border-inline-start:4px solid ${theme.accent};margin:8px 0;padding:4px 12px;background:#fffbeb}
    .doc pre{background:#0f172a;color:#e2e8f0;padding:10px;border-radius:6px;direction:ltr;white-space:pre-wrap}
    .doc a{color:${theme.primary}}</style><div class="doc">${html}</div>`;
  const html2pdf = (await import("html2pdf.js")).default;
  await html2pdf().set({ margin: 8, filename: `${name}.pdf`, image: { type: "jpeg", quality: 0.95 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4" } } as Record<string, unknown>).from(el).save();
}

async function toDocx(tokens: Token[], theme: DocTheme, name: string) {
  const d = await import("docx");
  const rtl = (s: string) => isArabic(s);
  const run = (text: string, opts: Record<string, unknown> = {}) => new d.TextRun({ text: plain(text), font: theme.font, color: noHash(theme.text), rightToLeft: rtl(text), ...opts });
  const children: Array<InstanceType<typeof d.Paragraph> | InstanceType<typeof d.Table>> = [];
  const para = (text: string, opts: Record<string, unknown> = {}, runOpts: Record<string, unknown> = {}) => new d.Paragraph({ bidirectional: rtl(text), alignment: rtl(text) ? d.AlignmentType.RIGHT : d.AlignmentType.LEFT, spacing: { after: 120 }, children: [run(text, runOpts)], ...opts });
  for (const t of tokens) {
    if (t.type === "heading") {
      const h = t as Tokens.Heading;
      children.push(para(h.text, { heading: h.depth === 1 ? d.HeadingLevel.HEADING_1 : h.depth === 2 ? d.HeadingLevel.HEADING_2 : d.HeadingLevel.HEADING_3, ...(h.depth === 1 ? { border: { bottom: { color: noHash(theme.accent), size: 12, style: d.BorderStyle.SINGLE, space: 4 } } } : {}) }, { bold: true, size: h.depth === 1 ? 40 : h.depth === 2 ? 32 : 26, color: noHash(h.depth > 2 ? theme.accent : theme.primary) }));
    } else if (t.type === "paragraph") children.push(para((t as Tokens.Paragraph).text, {}, { size: 24 }));
    else if (t.type === "list") for (const item of (t as Tokens.List).items) children.push(para(item.text, { bullet: { level: 0 } }, { size: 24 }));
    else if (t.type === "blockquote") children.push(para((t as Tokens.Blockquote).text, { shading: { fill: "FFFBEB" } }, { italics: true, size: 24 }));
    else if (t.type === "code") for (const line of (t as Tokens.Code).text.split("\n")) children.push(new d.Paragraph({ shading: { fill: "F1F5F9" }, children: [new d.TextRun({ text: line, font: "Consolas", size: 20 })] }));
    else if (t.type === "table") {
      const tb = t as Tokens.Table;
      const cell = (text: string, head: boolean) => new d.TableCell({ ...(head ? { shading: { fill: noHash(theme.primary) } } : {}), children: [para(text, {}, { bold: head, color: head ? "FFFFFF" : noHash(theme.text), size: 22 })] });
      children.push(new d.Table({ width: { size: 100, type: d.WidthType.PERCENTAGE }, visuallyRightToLeft: rtl(tb.raw), rows: [new d.TableRow({ tableHeader: true, children: tb.header.map((h) => cell(h.text, true)) }), ...tb.rows.map((r) => new d.TableRow({ children: r.map((c) => cell(c.text, false)) }))] }));
      children.push(new d.Paragraph({}));
    }
  }
  const doc = new d.Document({ sections: [{ children }] });
  save(await d.Packer.toBlob(doc), `${name}.docx`);
}

async function toPptx(tokens: Token[], theme: DocTheme, name: string) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS(); pptx.layout = "LAYOUT_WIDE";
  const P = noHash(theme.primary), A = noHash(theme.accent);
  const slides: Array<{ title: string; bullets: string[]; table?: Tokens.Table }> = [];
  for (const t of tokens) {
    if (t.type === "heading" && (t as Tokens.Heading).depth <= 2) slides.push({ title: plain((t as Tokens.Heading).text), bullets: [] });
    else {
      if (!slides.length) slides.push({ title: name, bullets: [] });
      const cur = slides[slides.length - 1]!;
      if (t.type === "list") cur.bullets.push(...(t as Tokens.List).items.map((i) => plain(i.text)));
      else if (t.type === "paragraph" || t.type === "heading") cur.bullets.push(plain((t as Tokens.Paragraph).text));
      else if (t.type === "table") cur.table = t as Tokens.Table;
    }
  }
  slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    const rtl = isArabic(s.title + s.bullets.join(""));
    const align = rtl ? "right" : "left";
    if (i === 0) {
      slide.background = { color: P };
      slide.addShape("rect", { x: 0, y: 4.6, w: 13.33, h: 0.12, fill: { color: A } });
      slide.addText(s.title, { x: 0.6, y: 2, w: 12.1, h: 1.6, fontSize: 40, bold: true, color: "FFFFFF", fontFace: theme.font, align: "center", rtlMode: rtl });
      if (s.bullets[0]) slide.addText(s.bullets[0], { x: 0.6, y: 3.6, w: 12.1, h: 0.8, fontSize: 20, color: A, fontFace: theme.font, align: "center", rtlMode: rtl });
      return;
    }
    slide.background = { color: "FFFFFF" };
    slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 1.1, fill: { color: P } });
    slide.addShape("rect", { x: 0, y: 1.1, w: 13.33, h: 0.06, fill: { color: A } });
    slide.addText(s.title, { x: 0.5, y: 0.15, w: 12.3, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF", fontFace: theme.font, align, rtlMode: rtl });
    if (s.table) {
      const rows = [s.table.header.map((h) => ({ text: plain(h.text), options: { bold: true, color: "FFFFFF", fill: { color: P } } })), ...s.table.rows.map((r) => r.map((c) => ({ text: plain(c.text) })))];
      slide.addTable(rows, { x: 0.5, y: 1.5, w: 12.3, fontSize: 14, fontFace: theme.font, border: { type: "solid", color: "CBD5E1", pt: 1 }, align });
    } else if (s.bullets.length) {
      slide.addText(s.bullets.slice(0, 8).map((b) => ({ text: b, options: { bullet: { code: "25CF" }, color: noHash(theme.text), breakLine: true } })), { x: 0.6, y: 1.5, w: 12.1, h: 5.5, fontSize: 20, fontFace: theme.font, align, rtlMode: rtl, valign: "top", paraSpaceAfter: 10 });
    }
    slide.addText(`${i + 1}`, { x: 12.4, y: 7, w: 0.6, h: 0.4, fontSize: 12, color: A });
  });
  await pptx.writeFile({ fileName: `${name}.pptx` });
}

async function toXlsx(tokens: Token[], theme: DocTheme, name: string, body: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const tables = tokens.filter((t) => t.type === "table") as Tokens.Table[];
  const rtl = isArabic(body);
  const argb = (c: string) => `FF${noHash(c).toUpperCase()}`;
  if (!tables.length) {
    const ws = wb.addWorksheet("المحتوى", { views: [{ rightToLeft: rtl }] });
    ws.getColumn(1).width = 100;
    body.split("\n").filter(Boolean).forEach((l) => ws.addRow([plain(l.replace(/^#+\s*|^[-*]\s*/, ""))]));
  }
  tables.forEach((tb, i) => {
    const ws = wb.addWorksheet(`جدول ${i + 1}`, { views: [{ rightToLeft: rtl, state: "frozen", ySplit: 1 }] });
    const head = ws.addRow(tb.header.map((h) => plain(h.text)));
    head.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" }, name: theme.font }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(theme.primary) } }; c.alignment = { horizontal: "center", vertical: "middle" }; });
    tb.rows.forEach((r, ri) => {
      const row = ws.addRow(r.map((c) => { const v = plain(c.text); const n = Number(v.replace(/,/g, "")); return v !== "" && !Number.isNaN(n) ? n : v; }));
      row.eachCell((c) => { c.border = { bottom: { style: "thin", color: { argb: "FFCBD5E1" } } }; if (ri % 2) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }; });
    });
    ws.columns.forEach((col) => { col.width = 22; });
    ws.getRow(1).height = 24;
    head.eachCell((c) => { c.border = { bottom: { style: "medium", color: { argb: argb(theme.accent) } } }; });
  });
  save(new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${name}.xlsx`);
}

export async function exportDocument(markdown: string, format: DocFormat, fallbackName = "عبقرينو") {
  const { theme, body } = parseTheme(markdown);
  const tokens = marked.lexer(body);
  const name = titleOf(tokens, fallbackName).replace(/[\\/:*?"<>|]/g, "-") || fallbackName;
  if (format === "pdf") return toPdf(body, theme, name);
  if (format === "docx") return toDocx(tokens, theme, name);
  if (format === "pptx") return toPptx(tokens, theme, name);
  return toXlsx(tokens, theme, name, body);
}

export function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  legacyCopy(text);
  return Promise.resolve();
}
function legacyCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
}
export function downloadCode(text: string, lang: string) {
  const ext: Record<string, string> = { javascript: "js", js: "js", typescript: "ts", ts: "ts", tsx: "tsx", jsx: "jsx", python: "py", py: "py", html: "html", css: "css", json: "json", bash: "sh", sh: "sh", sql: "sql", markdown: "md", md: "md", java: "java", csharp: "cs", cpp: "cpp", c: "c", php: "php", dart: "dart", kotlin: "kt", swift: "swift", go: "go", yaml: "yml" };
  save(new Blob([text], { type: "text/plain;charset=utf-8" }), `code.${ext[lang.toLowerCase()] ?? "txt"}`);
}
