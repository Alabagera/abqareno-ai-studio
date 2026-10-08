import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { MessageResponse } from "@/components/ai-elements/message";
import { copyText, downloadCode, downloadTableCsv, downloadTableXlsx, exportDocument, tableRows } from "@/lib/doc-export";

const BTN = "rounded-md bg-secondary/90 px-2 py-1 text-xs text-foreground shadow hover:bg-gold hover:text-primary-foreground";

function button(label: string, fn: () => void) {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = label; b.className = BTN;
  b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
  return b;
}

function openFullscreen(table: HTMLTableElement) {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-[100] flex flex-col bg-background/98 p-3 sm:p-6";
  overlay.dir = "auto";
  const top = document.createElement("div");
  top.className = "mb-3 flex items-center justify-between gap-2";
  const title = document.createElement("strong"); title.textContent = "عرض الجدول";
  const close = button("✕ إغلاق", () => { overlay.remove(); document.removeEventListener("keydown", esc); });
  const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close.click(); };
  document.addEventListener("keydown", esc);
  top.append(title, close);
  const wrap = document.createElement("div");
  wrap.className = "min-h-0 flex-1 overflow-auto rounded-lg border border-border";
  const clone = table.cloneNode(true) as HTMLTableElement;
  clone.className = "w-full border-collapse text-sm [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-secondary [&_th]:p-2";
  wrap.appendChild(clone);
  overlay.append(top, wrap);
  document.body.appendChild(overlay);
}

// Renders an assistant answer and attaches reliable copy / download / fullscreen
// controls to every code box and table (works inside the preview frame and on phones).
export function ResultBody({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll("pre").forEach((pre) => {
      const host = pre.parentElement;
      if (!host || host.querySelector(":scope > .code-tools")) return;
      host.style.position = "relative";
      const bar = document.createElement("div");
      bar.className = "code-tools absolute top-2 end-2 z-10 flex gap-1";
      const lang = (pre.querySelector("code")?.className.match(/language-([\w+-]+)/)?.[1]) ?? pre.closest("[data-language]")?.getAttribute("data-language") ?? "txt";
      bar.append(button("نسخ", () => void copyText(pre.innerText).then(() => toast.success("تم نسخ الكود"))), button("تنزيل", () => downloadCode(pre.innerText, lang)));
      host.appendChild(bar);
    });
    root.querySelectorAll("table").forEach((table) => {
      if (table.dataset["tools"]) return;
      table.dataset["tools"] = "1";
      const bar = document.createElement("div");
      bar.className = "table-tools my-1 flex flex-wrap items-center gap-1";
      const menu = document.createElement("div");
      menu.className = "hidden w-full flex-wrap gap-1 rounded-md border border-border bg-background p-1";
      const rows = () => tableRows(table);
      menu.append(
        button("CSV (للجداول)", () => downloadTableCsv(rows())),
        button("Excel (.xlsx)", () => void downloadTableXlsx(rows()).then(() => toast.success("تم تنزيل Excel"))),
        button("PDF", () => void exportDocument(table.outerHTML, "pdf", "جدول")),
      );
      bar.append(
        button("⛶ تكبير", () => openFullscreen(table)),
        button("نسخ الجدول", () => void copyText(rows().map((r) => r.join("\t")).join("\n")).then(() => toast.success("تم نسخ الجدول — الصقه في Excel أو Word"))),
        button("⬇ تنزيل…", () => { menu.classList.toggle("hidden"); menu.classList.toggle("flex"); }),
        menu,
      );
      const anchor = table.closest("[data-streamdown='table-wrapper']") ?? table.parentElement ?? table;
      anchor.parentElement?.insertBefore(bar, anchor);
    });
  }, [content]);
  return <div ref={ref}><MessageResponse controls={{ code: false, table: false, mermaid: true }}>{content}</MessageResponse></div>;
}
