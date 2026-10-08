import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clapperboard, Copy, Download, File, FileDown, FileText, Maximize2, Minimize2, Presentation, Sheet, Menu, MessageSquarePlus, Paperclip, Pencil, Send, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ASSISTANT_MODES, createThread, deleteThread, downloadText, listThreads, loadThread, renameThread, type AssistantMode } from "@/lib/assistant";
import { deleteMedia, downloadMedia, formatSize, uploadMedia } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlabageraPortrait } from "@/components/AlabageraPortrait";
import { ResultBody } from "@/components/ResultBody";
import { copyText, exportDocument, type DocFormat } from "@/lib/doc-export";
import { AI_MODELS, TASK_LABELS } from "@/lib/ai/registry";
import { ASSISTANT_TEMPLATES } from "@/lib/assistant-templates";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageActions, MessageAction, MessageContent, MessageResponse } from "@/components/ai-elements/message";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; created_at?: string };
type UploadedAsset = { id: string; name: string; storage_path: string; size_bytes: number | null; mime_type: string | null };
type ThreadAttachment = { id: string; asset_id: string; media_assets: UploadedAsset | UploadedAsset[] | null };

export function AssistantWorkspace({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AssistantMode>("general");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[] | null>(null);
  const [showThreads, setShowThreads] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  async function exportAs(content: string, f: DocFormat) {
    const t = toast.loading("جارٍ تجهيز الملف…");
    try { await exportDocument(content, f, data?.thread.title || "عبقرينو"); toast.success("تم تنزيل الملف", { id: t }); } catch (e) { toast.error((e as Error).message || "تعذر إنشاء الملف", { id: t }); }
  }
  const [modelId, setModelId] = useState("openai/gpt-6-astra");
  const { data: access } = useQuery({ queryKey: ["workspace-access"], queryFn: async () => ((await supabase.rpc("my_workspace_access")).data ?? {}) as Record<string, unknown> });
  const allowedList = access?.["allowed_models"];
  const showNames = access?.["show_model_names"] === true;
  const chatModels = AI_MODELS.filter((m) => m.task === "chat" && (!Array.isArray(allowedList) || allowedList.includes(m.id)));
  const modelLabel = (m: (typeof AI_MODELS)[number]) => showNames ? m.name : `${TASK_LABELS[m.task]} ${chatModels.indexOf(m) + 1}`;
  const { data: linked = [] } = useQuery({ queryKey: ["linked-models"], queryFn: async () => ((await supabase.from("model_endpoints").select("model_id").eq("enabled", true)).data ?? []).map((r) => r.model_id) });
  const currentModel = chatModels.find((m) => m.id === modelId) ?? chatModels[0];
  function applyTemplate(t: (typeof ASSISTANT_TEMPLATES)[number]) {
    setInput(t.prompt); setMode(t.mode);
    const best = chatModels.find((m) => m.id === t.modelId && (m.status === "ready" || linked.includes(m.id)));
    setModelId(best?.id ?? chatModels.find((m) => m.status === "ready")?.id ?? modelId);
    inputRef.current?.focus();
  }
  const { data: threads = [] } = useQuery({ queryKey: ["assistant-threads"], queryFn: listThreads });
  const { data, isPending, error } = useQuery({ queryKey: ["assistant-thread", threadId], queryFn: () => loadThread(threadId), retry: false });
  const messages = liveMessages ?? ((data?.messages ?? []).filter((m) => m.role === "user" || m.role === "assistant") as ChatMessage[]);

  useEffect(() => { if (data?.thread.mode && data.thread.mode in ASSISTANT_MODES) setMode(data.thread.mode as AssistantMode); }, [data?.thread.mode]);
  useEffect(() => { inputRef.current?.focus(); }, [threadId, busy]);
  useEffect(() => { setLiveMessages(null); }, [threadId]);

  async function newThread() {
    const thread = await createThread(mode);
    await qc.invalidateQueries({ queryKey: ["assistant-threads"] });
    navigate({ to: "/assistant/$threadId", params: { threadId: thread.id } });
  }
  async function removeThread(id: string) {
    if (!confirm("حذف هذه المحادثة نهائيًا؟ المرفقات ستبقى في المكتبة حتى تحذفها منها.")) return;
    await deleteThread(id); await qc.invalidateQueries({ queryKey: ["assistant-threads"] });
    if (id === threadId) navigate({ to: "/assistant" });
  }
  async function editTitle() {
    const title = prompt("اسم المحادثة", data?.thread.title ?? "");
    if (!title?.trim()) return;
    await renameThread(threadId, title); await Promise.all([qc.invalidateQueries({ queryKey: ["assistant-threads"] }), qc.invalidateQueries({ queryKey: ["assistant-thread", threadId] })]);
  }
  function addFiles(next: FileList | null) {
    if (!next) return;
    const accepted = Array.from(next).filter((file) => file.size <= 20 * 1024 * 1024).slice(0, Math.max(0, 8 - files.length));
    if (accepted.length !== next.length) toast.error("يمكن إرفاق 8 ملفات، بحد أقصى 20 ميجابايت للملف");
    setFiles((current) => [...current, ...accepted]);
    if (fileRef.current) fileRef.current.value = "";
  }
  async function send() {
    const content = input.trim();
    if ((!content && !files.length) || busy) return;
    setBusy(true); setUploading(Boolean(files.length));
    const optimistic: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: "user", content: content || "حلّل الملفات المرفقة" }, { id: crypto.randomUUID(), role: "assistant", content: "" }];
    setLiveMessages(optimistic); setInput("");
    try {
      const uploaded: UploadedAsset[] = [];
      for (const file of files) uploaded.push(await uploadMedia(file));
      setUploading(false); setFiles([]);
      const auth = await supabase.auth.getSession();
      const controller = new AbortController(); abortRef.current = controller;
      const response = await fetch("/api/assistant", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.data.session?.access_token ?? ""}` }, body: JSON.stringify({ threadId, content: content || "حلّل الملفات المرفقة بالتفصيل", mode, modelId: currentModel?.id, assetIds: uploaded.map((asset) => asset.id) }) });
      if (!response.ok || !response.body) throw new Error((await response.text()) || "تعذر الوصول إلى المساعد");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let answer = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim(); if (!payload || payload === "[DONE]") continue;
          try { const event = JSON.parse(payload) as { type?: string; delta?: string; error?: { message?: string } }; if (event.type === "response.output_text.delta") { answer += event.delta ?? ""; const pending = optimistic[optimistic.length - 1]; if (pending) setLiveMessages([...optimistic.slice(0, -1), { ...pending, content: answer }]); } else if (event.type === "error" || event.type === "response.failed") throw new Error(event.error?.message ?? "فشل إنشاء الرد"); } catch (streamError) { if (streamError instanceof Error && streamError.message === "فشل إنشاء الرد") throw streamError; }
        }
      }
      if (!answer.trim()) throw new Error("لم يصل رد من المساعد");
      await Promise.all([qc.invalidateQueries({ queryKey: ["assistant-thread", threadId] }), qc.invalidateQueries({ queryKey: ["assistant-threads"] }), qc.invalidateQueries({ queryKey: ["assets"] })]);
    } catch (sendError) {
      if ((sendError as Error).name !== "AbortError") { toast.error((sendError as Error).message); setLiveMessages(messages); }
    } finally { setBusy(false); setUploading(false); abortRef.current = null; }
  }
  async function saveResult(content: string) {
    const title = (data?.thread.title || "نتيجة-عبقرينو").replace(/[\\/:*?"<>|]/g, "-");
    const file = new globalThis.File([content], `${title}.md`, { type: "text/markdown" });
    await uploadMedia(file, "document"); await qc.invalidateQueries({ queryKey: ["assets"] }); toast.success("حُفظت النتيجة في المكتبة");
  }
  function toStudio(content: string) { sessionStorage.setItem("studio-script", content); navigate({ to: "/studio" }); }
  const threadAttachments = (data?.attachments ?? []) as ThreadAttachment[];
  const attachmentAsset = (item: ThreadAttachment) => Array.isArray(item.media_assets) ? item.media_assets[0] : item.media_assets;
  async function removeAttachment(item: ThreadAttachment) {
    const asset = attachmentAsset(item); if (!asset || !confirm("حذف هذا الملف من المرفقات والمكتبة نهائيًا؟")) return;
    await deleteMedia(asset.id, asset.storage_path); await Promise.all([qc.invalidateQueries({ queryKey: ["assistant-thread", threadId] }), qc.invalidateQueries({ queryKey: ["assets"] })]); toast.success("تم حذف الملف");
  }

  if (error) return <div className="glass rounded-xl p-8 text-center"><p>تعذر فتح المحادثة.</p><Button className="mt-4" onClick={() => navigate({ to: "/assistant" })}>العودة</Button></div>;
  return <div className={focusMode ? "fixed inset-0 z-[60] flex bg-background p-1 sm:p-3" : "mx-auto flex h-[calc(100dvh-8rem)] max-w-6xl gap-3 md:h-[calc(100dvh-4rem)]"}>
    <aside className={`${showThreads ? "fixed inset-3 z-[70] flex" : "hidden"} glass w-72 shrink-0 flex-col rounded-lg p-3 ${focusMode ? "" : "md:flex md:static"}`}>
      <div className="mb-3 flex items-center justify-between"><strong>المحادثات</strong><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={newThread} aria-label="محادثة جديدة"><MessageSquarePlus /></Button><Button size="icon" variant="ghost" className="md:hidden" onClick={() => setShowThreads(false)} aria-label="إغلاق"><X /></Button></div></div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">{threads.map((thread) => <div key={thread.id} className={`flex items-center rounded-md ${thread.id === threadId ? "bg-secondary" : ""}`}><Button variant="ghost" className="min-w-0 flex-1 justify-start truncate" onClick={() => { setShowThreads(false); navigate({ to: "/assistant/$threadId", params: { threadId: thread.id } }); }}>{thread.title}</Button><Button variant="ghost" size="icon" aria-label="حذف المحادثة" onClick={() => removeThread(thread.id)}><Trash2 /></Button></div>)}</div>
    </aside>
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background/40">
      <header className="flex flex-wrap items-center gap-2 border-b p-3"><Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowThreads(true)} aria-label="المحادثات"><Menu /></Button><AlabageraPortrait className="size-10 rounded-full border border-gold" eager /><div className="min-w-0 flex-1"><h1 className="truncate font-bold">{data?.thread.title ?? "محادثة عبقرينو"}</h1><p className="truncate text-xs text-muted-foreground">{ASSISTANT_MODES[mode].hint}</p></div><Button variant="ghost" size="icon" onClick={() => setFocusMode(!focusMode)} aria-label={focusMode ? "تصغير" : "تكبير الشاشة"} title={focusMode ? "رجوع للوضع العادي" : "تكبير مساحة الردود"}>{focusMode ? <Minimize2 /> : <Maximize2 />}</Button><Button variant="ghost" size="icon" onClick={editTitle} aria-label="تغيير الاسم"><Pencil /></Button><Select value={mode} onValueChange={(value) => setMode(value as AssistantMode)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ASSISTANT_MODES).map(([key, item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent></Select><Select value={currentModel?.id ?? ""} onValueChange={setModelId}><SelectTrigger className="w-full sm:w-56" aria-label="النموذج"><SelectValue placeholder="النموذج" /></SelectTrigger><SelectContent className="max-w-[92vw]">{chatModels.map((m) => <SelectItem key={m.id} value={m.id} className="items-start"><div className="flex flex-col text-start"><span className="font-medium">{modelLabel(m)} {m.status !== "ready" && !linked.includes(m.id) && <span className="text-[10px] text-gold-soft">(يعمل بعد ربط السيرفر)</span>}</span><span className="whitespace-normal text-xs text-muted-foreground">{m.description}</span></div></SelectItem>)}</SelectContent></Select>{currentModel && <p className="w-full text-xs text-muted-foreground">✦ {currentModel.description}</p>}</header>
      <Conversation className="min-h-0"><ConversationContent className="mx-auto w-full max-w-3xl">{isPending ? <div className="text-center text-muted-foreground">جارٍ تحميل المحادثة…</div> : messages.length === 0 ? <ConversationEmptyState title="أنا عبقرينو، كيف أساعدك؟" description="اختر نوع المهمة، اكتب طلبك أو أرفق ملفاتك" icon={<AlabageraPortrait className="size-24 rounded-full border-2 border-gold" />} /> : messages.map((message) => <Message key={message.id} from={message.role}><MessageContent dir="auto" className="bilingual-text">{message.role === "assistant" ? <ResultBody content={message.content || (busy ? "أفكر…" : "")} /> : <p className="whitespace-pre-wrap">{message.content}</p>}</MessageContent>{message.role === "assistant" && message.content && <MessageActions><MessageAction tooltip="نسخ" onClick={() => { void copyText(message.content).then(() => toast.success("تم النسخ")); }}><Copy /></MessageAction><MessageAction tooltip="تنزيل Markdown" onClick={() => downloadText(message.content, "نتيجة-عبقرينو.md")}><Download /></MessageAction><MessageAction tooltip="PDF" onClick={() => exportAs(message.content, "pdf")}><FileDown /></MessageAction><MessageAction tooltip="Word" onClick={() => exportAs(message.content, "docx")}><FileText /></MessageAction><MessageAction tooltip="PowerPoint" onClick={() => exportAs(message.content, "pptx")}><Presentation /></MessageAction><MessageAction tooltip="Excel" onClick={() => exportAs(message.content, "xlsx")}><Sheet /></MessageAction><MessageAction tooltip="حفظ في المكتبة" onClick={() => saveResult(message.content)}><Check /></MessageAction><MessageAction tooltip="استخدام في الاستوديو" onClick={() => toStudio(message.content)}><Clapperboard /></MessageAction></MessageActions>}</Message>)}</ConversationContent><ConversationScrollButton /></Conversation>
      <div className="border-t p-2 sm:p-3"><div className="mx-auto max-w-3xl">{threadAttachments.length > 0 && <div className="mb-2 flex gap-2 overflow-x-auto">{threadAttachments.map((item) => { const asset = attachmentAsset(item); return asset ? <div key={item.id} className="flex shrink-0 items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs"><File className="size-3"/><span className="max-w-28 truncate">{asset.name}</span><Button variant="ghost" size="icon" className="size-6" aria-label="تنزيل الملف" onClick={() => downloadMedia(asset.storage_path, asset.name)}><Download /></Button><Button variant="ghost" size="icon" className="size-6" aria-label="حذف الملف" onClick={() => removeAttachment(item)}><Trash2 /></Button></div> : null; })}</div>}{files.length > 0 && <div className="mb-2 flex gap-2 overflow-x-auto">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex shrink-0 items-center gap-2 rounded-md bg-secondary px-2 py-1 text-xs"><File className="size-3"/><span className="max-w-32 truncate">{file.name}</span><span className="text-muted-foreground">{formatSize(file.size)}</span><Button variant="ghost" size="icon" className="size-6" onClick={() => setFiles(files.filter((_, i) => i !== index))} aria-label="إزالة المرفق"><X /></Button></div>)}</div>}<div className="mb-2 flex gap-2 overflow-x-auto pb-1">{ASSISTANT_TEMPLATES.map((t) => <button key={t.label} type="button" onClick={() => applyTemplate(t)} className="shrink-0 rounded-full border border-gold/40 bg-secondary px-3 py-1 text-xs hover:bg-gold/20">{t.label}</button>)}</div><div className="glass rounded-lg p-2"><input ref={fileRef} hidden multiple type="file" accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.json,.srt,.vtt,.ppt,.pptx,.xls,.xlsx,.js,.jsx,.ts,.tsx,.py,.html,.css,.zip" onChange={(event) => addFiles(event.target.files)} /><Textarea ref={inputRef} dir="auto" value={input} onChange={(event) => setInput(event.target.value)} placeholder="اكتب طلبك بالعربية أو English…" className="bilingual-text min-h-16 resize-none border-0 bg-transparent" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} /><div className="flex items-center justify-between"><Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}><Paperclip />إرفاق</Button>{busy ? <Button variant="destructive" size="sm" onClick={() => abortRef.current?.abort()}><Square />{uploading ? "جارٍ الرفع" : "إيقاف"}</Button> : <Button variant="gold" size="sm" onClick={send} disabled={!input.trim() && !files.length}><Send />إرسال</Button>}</div></div></div></div>
    </section>
  </div>;
}