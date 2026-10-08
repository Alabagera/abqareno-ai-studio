import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileJson, Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Msg { role: "user" | "ai"; text: string }
const WF_KEY = "abq-editor-ai-workflow";

// Continuous chat that edits the selected clip or creates a new one.
export function EditorAI({ selected, size, onAdd }: { selected: { url: string; name: string } | null; size: { w: number; h: number }; onAdd: (a: { url: string; path: string; name: string }) => void }) {
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [seconds, setSeconds] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);
  const [wf, setWf] = useState<string>("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => { setWf(localStorage.getItem(WF_KEY) ?? ""); }, []);

  async function send() {
    const prompt = input.trim(); if (!prompt || busy) return;
    if (mode === "edit" && !selected) { toast.error("حدد مقطع فيديو من الشريط أولًا"); return; }
    setInput(""); setMsgs((m) => [...m, { role: "user", text: prompt }]); setBusy("جارٍ البدء…");
    const ac = new AbortController(); abort.current = ac;
    try {
      const f = new FormData();
      f.append("prompt", prompt); f.append("mode", mode); f.append("workflow", wf); f.append("seconds", String(seconds));
      f.append("width", String(size.w)); f.append("height", String(size.h));
      f.append("history", msgs.filter((m) => m.role === "user").map((m) => `- ${m.text}`).join("\n"));
      if (mode === "edit" && selected) f.append("video", await (await fetch(selected.url)).blob(), selected.name);
      const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
      const r = await fetch("/api/editor-ai", { method: "POST", body: f, headers: { Authorization: `Bearer ${token}` }, signal: ac.signal });
      if (!r.ok || !r.body) throw new Error((await r.text()) || "تعذر الطلب");
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p.startsWith("data:")) continue;
          const e = JSON.parse(p.slice(5)) as { type: string; text?: string; message?: string; url?: string; path?: string; name?: string };
          if (e.type === "progress") setBusy(e.text ?? "…");
          if (e.type === "error") throw new Error(e.message);
          if (e.type === "asset" && e.url && e.path) { onAdd({ url: e.url, path: e.path, name: e.name ?? "فيديو" }); setMsgs((m) => [...m, { role: "ai", text: "✓ جاهز وأُضيف إلى المحرر والمكتبة. اطلب تعديلًا جديدًا متى شئت." }]); }
        }
      }
    } catch (e) {
      if (!ac.signal.aborted) setMsgs((m) => [...m, { role: "ai", text: (e as Error).message }]);
    } finally { setBusy(null); abort.current = null; }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/40 p-1">
        {(["create", "edit"] as const).map((m) => <button type="button" key={m} onClick={() => setMode(m)} className={`rounded-md py-1.5 font-bold ${mode === m ? "bg-gold text-primary-foreground" : ""}`}>{m === "create" ? "فيديو جديد" : "تعديل المقطع المحدد"}</button>)}
      </div>
      {mode === "edit" && <p className="text-muted-foreground" dir="auto">{selected ? `المقطع: ${selected.name}` : "حدد مقطع فيديو من الشريط."}</p>}
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border p-2"><FileJson className="size-4 text-gold" />
        <span className="flex-1">{wf ? "✓ مخطط الفيديو محفوظ (اضغط للاستبدال)" : "ارفع مخطط فيديو ComfyUI (API JSON)"}</span>
        <input type="file" accept=".json,application/json" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const t = await file.text(); try { JSON.parse(t); localStorage.setItem(WF_KEY, t); setWf(t); toast.success("حُفظ المخطط"); } catch { toast.error("ملف JSON غير صالح"); } }} />
      </label>
      <p className="text-muted-foreground">في المخطط استخدم {"{{idea}}"} للوصف، {"{{video}}"} لملف المقطع عند التعديل، و{"{{width}}"} {"{{height}}"} {"{{seconds}}"}. يعمل على سيرفرك فقط، دون أي خصم.</p>
      <label className="flex items-center justify-between">المدة (ثانية)<input type="number" min={2} max={60} value={seconds} onChange={(e) => setSeconds(+e.target.value)} className="h-8 w-20 rounded border border-input bg-background px-2" /></label>
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {msgs.map((m, i) => <div key={i} dir="auto" className={`rounded-lg p-2 ${m.role === "user" ? "bg-secondary" : "border border-gold/40"}`}>{m.text}</div>)}
        {busy && <div className="flex items-center gap-2 text-gold"><Sparkles className="size-3 animate-pulse" />{busy}<button type="button" className="ms-auto underline" onClick={() => abort.current?.abort()}>إيقاف</button></div>}
      </div>
      <div className="flex gap-1">
        <textarea dir="auto" value={input} onChange={(e) => setInput(e.target.value)} placeholder={mode === "create" ? "صف الفيديو الذي تريده… / Describe the video…" : "ماذا تريد أن تغيّر في المقطع؟"} className="bilingual-text min-h-14 flex-1 rounded-md border border-input bg-background p-2 text-sm" />
        <Button size="icon" variant="gold" disabled={!!busy || !input.trim()} onClick={() => void send()} aria-label="إرسال"><Send className="size-4" /></Button>
      </div>
    </div>
  );
}
