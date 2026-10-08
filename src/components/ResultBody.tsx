import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { MessageResponse } from "@/components/ai-elements/message";
import { copyText, downloadCode } from "@/lib/doc-export";

// Renders an assistant answer and attaches reliable copy / download buttons to
// every code box (works inside the preview frame and on phones).
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
      const mk = (label: string, fn: () => void) => {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = label;
        b.className = "rounded-md bg-secondary/90 px-2 py-1 text-xs text-foreground shadow hover:bg-gold hover:text-primary-foreground";
        b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
        bar.appendChild(b);
      };
      mk("نسخ", () => void copyText(pre.innerText).then(() => toast.success("تم نسخ الكود")));
      mk("تنزيل", () => downloadCode(pre.innerText, lang));
      host.appendChild(bar);
    });
  }, [content]);
  return <div ref={ref}><MessageResponse controls={{ code: false, table: true, mermaid: true }}>{content}</MessageResponse></div>;
}
