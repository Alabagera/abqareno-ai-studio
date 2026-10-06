import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Bot, Clapperboard, Copy, Send, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [
    { title: "المساعد الذكي — عبقرينو AI Studio" },
    { name: "description", content: "مساعد كتابة ذكي للسكربتات والإعلانات والمقالات والإجابة عن الأسئلة." },
    { property: "og:title", content: "المساعد الذكي — عبقرينو" },
    { property: "og:description", content: "اكتب محتواك بمساعدة الذكاء الاصطناعي." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Assistant,
});

type Msg = { role: "user" | "assistant"; content: string };

const TEMPLATES = [
  { l: "سكربت فيديو", p: "اكتب سكربت فيديو قصير (60 ثانية) جاهز للنطق عن: " },
  { l: "إعلان", p: "اكتب إعلانًا تسويقيًا جذابًا مع عنوان ودعوة لاتخاذ إجراء عن: " },
  { l: "مقال", p: "اكتب مقالًا احترافيًا منظمًا بعناوين فرعية عن: " },
  { l: "منشور سوشيال", p: "اكتب 3 منشورات قصيرة لمواقع التواصل مع هاشتاقات عن: " },
  { l: "عناوين جذابة", p: "اقترح 10 عناوين جذابة لفيديو يوتيوب عن: " },
  { l: "أفكار محتوى", p: "اقترح 10 أفكار محتوى مبتكرة لصفحتي عن: " },
];

function Assistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput(""); setBusy(true);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/assistant", {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error((await res.text()) || "تعذر الوصول إلى المساعد");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload);
            if (ev.type === "response.output_text.delta") {
              answer += ev.delta;
              setMessages([...history, { role: "assistant", content: answer }]);
            } else if (ev.type === "error" || ev.type === "response.failed") {
              throw new Error("حدث خطأ أثناء توليد الرد");
            }
          } catch (e) { if (e instanceof Error && e.message.startsWith("حدث")) throw e; }
        }
      }
      if (!answer) throw new Error("لم يصل رد من المساعد");
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error((e as Error).message);
        setMessages((m) => (m[m.length - 1]?.content ? m : m.slice(0, -1)));
      }
    } finally { setBusy(false); abortRef.current = null; }
  }

  function toStudio(text: string) {
    sessionStorage.setItem("studio-script", text);
    navigate({ to: "/studio" });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader title="المساعد الذكي" subtitle="اسأل أي شيء، أو اكتب سكربتات وإعلانات ومقالات" />
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {TEMPLATES.map((t) => <button key={t.l} onClick={() => setInput(t.p)} className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs text-gold-soft">{t.l}</button>)}
      </div>
      <div className="space-y-3">
        {messages.length === 0 && <div className="glass rounded-2xl p-8 text-center text-muted-foreground"><Bot className="mx-auto mb-2 size-10 text-gold" />اختر قالبًا أو اكتب طلبك بالأسفل</div>}
        {messages.map((m, i) => (
          <div key={i} className={`rounded-2xl p-4 ${m.role === "user" ? "ms-8 bg-secondary" : "glass me-4"}`}>
            <div className="whitespace-pre-wrap text-sm leading-7">{m.content || (busy ? "يكتب…" : "")}</div>
            {m.role === "assistant" && m.content && !(busy && i === messages.length - 1) && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(m.content); toast.success("تم النسخ"); }}><Copy />نسخ</Button>
                <Button size="sm" variant="glass" onClick={() => toStudio(m.content)}><Clapperboard />استخدمه في الاستوديو</Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="glass sticky bottom-24 mt-4 rounded-2xl p-2 md:bottom-4">
        <Textarea rows={3} value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب سؤالك أو طلبك…" className="border-0 bg-transparent"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} />
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={busy || !messages.length}><Trash2 />محادثة جديدة</Button>
          {busy ? <Button variant="destructive" size="sm" onClick={() => abortRef.current?.abort()}><Square />إيقاف</Button>
            : <Button variant="gold" size="sm" onClick={send} disabled={!input.trim()}><Send />إرسال</Button>}
        </div>
      </div>
    </div>
  );
}
