import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Sparkles, Send, FileText, ImageIcon, Film, Download, Share2, Square, Smartphone, Monitor, StopCircle, Upload, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { AlabageraPortrait } from "@/components/AlabageraPortrait";
import { supabase } from "@/integrations/supabase/client";
import { AI_MODELS } from "@/lib/ai/registry";
import { signedUrl } from "@/lib/media";
import { adsStore, type AdKind, type AdAsset } from "@/lib/ads-jobs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/ads")({
  head: () => ({ meta: [
    { title: "الإعلانات — عبقرينو AI Studio" }, { name: "description", content: "إعلانات نصية وصور وفيديو من فكرتك، مع تحليل الجمهور والمنصات باستخدام نماذج سيرفرك." },
    { property: "og:title", content: "استوديو الإعلانات — عبقرينو" }, { property: "og:description", content: "حوّل فكرتك إلى إعلان وحلل رسالته وجمهوره." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Ads,
});

type Asset = AdAsset;
type Action = AdKind | "all";
const KIND_LABEL = { text: "النص", image: "الصورة", video: "الفيديو" } as const;
const presets = [
  { id: "square", label: "مربع · Instagram / Facebook", w: 1080, h: 1080, icon: Square },
  { id: "portrait", label: "ريلز · TikTok / Instagram", w: 1080, h: 1920, icon: Smartphone },
  { id: "wide", label: "أفقي · YouTube / Facebook", w: 1920, h: 1080, icon: Monitor },
  { id: "custom", label: "مقاس يدوي", w: 1080, h: 1080, icon: Square },
];

function Ads() {
  const st = useSyncExternalStore(adsStore.subscribe, adsStore.get, adsStore.get);
  const { idea, text, image, video } = st; const setIdea = adsStore.setIdea;
  const [action, setAction] = useState<Action>("all"); const [modelId, setModelId] = useState("qwen3-8b");
  const [preset, setPreset] = useState("square"); const [width, setWidth] = useState(1080); const [height, setHeight] = useState(1080); const [duration, setDuration] = useState(60);
  const [workflow, setWorkflow] = useState<Record<string, unknown> | undefined>(); const [workflowName, setWorkflowName] = useState("");
  const [shareMode, setShareMode] = useState("text"); const [ask, setAsk] = useState(""); const [askTarget, setAskTarget] = useState<"all" | AdKind>("all");
  const { data: access } = useQuery({ queryKey: ["workspace-access"], queryFn: async () => (await supabase.rpc("my_workspace_access")).data as Record<string, unknown> | null });
  const models = action === "all" ? [] : AI_MODELS.filter((m) => m.selfHosted && m.task === (action === "text" ? "chat" : action) && (!Array.isArray(access?.["allowed_models"]) || access["allowed_models"].includes(m.id)));
  useEffect(() => { if (action !== "all" && !models.some((m) => m.id === modelId)) setModelId(models[0]?.id ?? ""); }, [action, access, modelId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void adsStore.init(); }, []);
  const busy = action === "all" ? adsStore.running() : st.status[action] === "running";
  const progress = (["text", "image", "video"] as const).filter((k) => st.status[k] === "running").map((k) => `${KIND_LABEL[k]}: ${st.progress[k] || "جارٍ العمل…"}`).join(" · ");
  const errors = (action === "all" ? (["text", "image", "video"] as const) : [action]).filter((k) => st.error[k]).map((k) => `${KIND_LABEL[k]}: ${st.error[k]}`);
  const params = { idea, width, height, duration, workflow };

  function generate() {
    if (!idea.trim()) { toast.error("اكتب فكرة إعلانك أولًا"); return; }
    if (action === "all") void adsStore.runAll(params);
    else void adsStore.run(action, { ...params, modelId });
  }
  function sendRevision() {
    const r = ask.trim(); if (!r || !idea.trim()) return;
    setAsk(""); void adsStore.runAll(params, askTarget === "all" ? ["text", "image", "video"] : [askTarget], r);
  }
  async function fileOf(asset: Asset) {
    const url = await signedUrl(asset.path); if (!url) throw new Error("تعذر فتح الملف");
    const response = await fetch(url); if (!response.ok) throw new Error("تعذر تنزيل الملف");
    return new File([await response.blob()], asset.name, { type: asset.kind === "image" ? "image/png" : asset.name.endsWith("webm") ? "video/webm" : "video/mp4" });
  }
  async function download(asset?: Asset) {
    try {
      const blob = asset ? await fileOf(asset) : new Blob(["\ufeff", text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = asset?.name ?? "إعلان-عبقرينو.txt"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { toast.error((e as Error).message); }
  }
  async function share(platform = "device") {
    try {
      if (platform === "whatsapp" && shareMode === "text") { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); return; }
      const files: File[] = [];
      if (shareMode !== "text") { if (!image) throw new Error("أنشئ صورة أولًا"); files.push(await fileOf(image)); }
      if (shareMode === "video-image") { if (!video) throw new Error("أنشئ فيديو أولًا"); files.push(await fileOf(video)); }
      const data: ShareData = { title: "إعلان عبقرينو", ...(shareMode !== "video-image" ? { text } : {}), ...(files.length ? { files } : {}) };
      if (navigator.share && (!files.length || navigator.canShare?.({ files }))) await navigator.share(data);
      else { toast.info("هذا المتصفح لا يدعم مشاركة الملفات. نزّلها ثم ارفعها إلى التطبيق المطلوب."); if (image && shareMode !== "text") await download(image); if (video && shareMode === "video-image") await download(video); }
    } catch (e) { if ((e as Error).name !== "AbortError") toast.error((e as Error).message); }
  }
  const selectedModel = models.find((m) => m.id === modelId);
  return <div className="space-y-5" dir="rtl">
    <div className="flex items-center justify-between gap-3"><PageHeader title="الإعلانات" subtitle="من فكرتك إلى رسالتك الإعلانية" /><AlabageraPortrait className="size-16 shrink-0 rounded-full border border-gold/40" /></div>
    <div className="grid gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <label className="block space-y-2 font-bold">فكرة الإعلان<Textarea aria-label="فكرة الإعلان" dir="auto" value={idea} onChange={(e) => setIdea(e.target.value)} rows={6} placeholder="المنتج أو الخدمة، الجمهور، العرض، الألوان، والأسلوب المطلوب…" /></label>
        <div className="flex flex-wrap gap-1 border-b border-border pb-2" role="tablist" aria-label="نوع الإعلان">{([{ id: "all", label: "الجميع", icon: Sparkles }, { id: "text", label: "نص وتحليل", icon: FileText }, { id: "image", label: "صورة", icon: ImageIcon }, { id: "video", label: "فيديو", icon: Film }] as const).map((tab) => <Button role="tab" aria-selected={action === tab.id} key={tab.id} variant={action === tab.id ? "gold" : "ghost"} size="sm" onClick={() => setAction(tab.id)}><tab.icon className="size-4" />{tab.label}</Button>)}</div>
        {action === "all" ? <p className="border-s-2 border-gold ps-3 text-xs text-muted-foreground">ينتج الإعلان النصي والصورة والفيديو معًا، ويختار تلقائيًا أقوى نموذج مربوط بسيرفرك لكل نوع. يستمر العمل أثناء تنقلك بين صفحات الموقع، ويتوقف فقط إذا أغلقت الموقع.</p> : <>        <label className="block text-sm">{access?.["show_model_names"] ? "النموذج المفتوح" : "أداة الإنتاج"}<select aria-label="نموذج الإعلان" disabled={busy} value={modelId} onChange={(e) => { setModelId(e.target.value); setWorkflow(undefined); setWorkflowName(""); }} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2">{models.map((m) => <option key={m.id} value={m.id}>{access?.["show_model_names"] ? m.name : m.description}</option>)}</select></label>
        {selectedModel && <p className="text-xs text-muted-foreground">{selectedModel.description}</p>}</>}
        <label className="block text-sm">مقاس الإعلان<select aria-label="مقاس الإعلان" value={preset} onChange={(e) => { const p = presets.find((p) => p.id === e.target.value); if (p) { setPreset(p.id); setWidth(p.w); setHeight(p.h); } }} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2">{presets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs">العرض (px)<Input type="number" aria-label="العرض" disabled={preset !== "custom"} min={256} max={4096} value={width} onChange={(e) => setWidth(+e.target.value)} /></label><label className="text-xs">الارتفاع (px)<Input type="number" aria-label="الارتفاع" disabled={preset !== "custom"} min={256} max={4096} value={height} onChange={(e) => setHeight(+e.target.value)} /></label></div>
        <label className="block text-sm">مدة الفيديو (ثانية)<Input type="number" aria-label="مدة الفيديو" min={3} max={180} value={duration} onChange={(e) => setDuration(+e.target.value)} /></label>
        {action !== "text" && <details className="border-y border-border py-2 text-xs"><summary className="cursor-pointer font-bold">إعداد مخطط التوليد على سيرفرك</summary><div className="space-y-2 py-2"><p>لـ ComfyUI: صدّر مخططًا بصيغة API وأرفقه. استخدم القيم {"{{idea}}"} و{"{{width}}"} و{"{{height}}"} و{"{{seconds}}"} أو {"{{frames}}"} (24 إطارًا/ثانية) في الحقول المناسبة. مدة دقيقة تحتاج مخططًا يدعم تجميع أو تمديد المشاهد؛ لا تُمدَّد المقاطع القصيرة تلقائيًا.</p><label className="flex cursor-pointer items-center gap-2 text-gold"><Upload className="size-4" />{workflowName || "إرفاق مخطط API (JSON)"}<input type="file" className="hidden" accept=".json" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const value = JSON.parse(await file.text()) as Record<string, unknown>; if (!value || Array.isArray(value) || typeof value !== "object") throw new Error(); setWorkflow(value); setWorkflowName(file.name); } catch { toast.error("اختر مخطط API صالحًا بصيغة JSON"); } }} /></label>{action === "image" && modelId === "sdxl" && <p>Stable Diffusion XL يدعم التوليد مباشرة عبر واجهة AUTOMATIC1111 دون مخطط.</p>}</div></details>}
        <p className="text-xs text-muted-foreground">يستخدم هذا القسم نماذج سيرفرك فقط، دون خصم رصيد AI. <Link to="/models" className="text-gold underline">ربط النماذج</Link></p>
        {errors.map((e) => <p key={e} role="alert" className="border-s-2 border-destructive ps-3 text-sm text-destructive">{e}</p>)}
        {progress && <p role="status" className="text-sm text-gold">{progress}</p>}
        {busy ? <div className="space-y-2"><Button variant="glass" onClick={() => adsStore.stop(action === "all" ? undefined : action)}><StopCircle className="size-4" />إيقاف الانتظار</Button><p className="text-xs text-muted-foreground">يمكنك الانتقال لصفحة أخرى وسيصلك إشعار عند الجاهزية. قد يستمر المخطط على سيرفرك حتى توقفه هناك.</p></div> : <Button variant="gold" className="w-full" disabled={action !== "all" && !modelId} onClick={generate}><Megaphone className="size-4" />{action === "all" ? "إنتاج الثلاثة معًا" : action === "text" ? "إنشاء النص والتحليل" : action === "image" ? "تصميم الصورة" : "إنتاج الفيديو"}</Button>}
        {(action === "all" || st.chat.length > 0) && <section className="space-y-2 border-t border-border pt-3">
          <h2 className="text-sm font-bold">اطلب تعديلًا</h2>
          <div className="max-h-64 space-y-2 overflow-y-auto">{st.chat.map((m, i) => <p key={i} dir="auto" className={`whitespace-pre-wrap rounded-lg p-2 text-xs ${m.role === "user" ? "ms-6 bg-secondary" : "me-6 border border-gold/30"}`}>{m.text}</p>)}</div>
          <select aria-label="ما الذي تريد تعديله" value={askTarget} onChange={(e) => setAskTarget(e.target.value as "all" | AdKind)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"><option value="all">تعديل الثلاثة</option><option value="text">النص فقط</option><option value="image">الصورة فقط</option><option value="video">الفيديو فقط</option></select>
          <div className="flex gap-2"><Textarea aria-label="طلب التعديل" dir="auto" rows={2} value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="مثال: اجعل العنوان أقصر والألوان ذهبية" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendRevision(); } }} /><Button variant="gold" size="icon" aria-label="إرسال التعديل" disabled={!ask.trim() || adsStore.running()} onClick={sendRevision}><Send className="size-4" /></Button></div>
        </section>}
      </div>
      <div className="min-w-0 space-y-5 border-t border-border pt-4 xl:border-s xl:border-t-0 xl:ps-6 xl:pt-0">
        {text ? <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold">النص والتحليل</h2><div className="flex gap-1"><Button variant="ghost" size="icon" title="نسخ النص" aria-label="نسخ النص" onClick={() => void navigator.clipboard.writeText(text).then(() => toast.success("تم النسخ")).catch(() => toast.error("تعذر النسخ"))}><Copy className="size-4" /></Button><Button variant="ghost" size="icon" title="تنزيل النص" aria-label="تنزيل النص" onClick={() => void download()}><Download className="size-4" /></Button></div></div><div dir="auto" className="bilingual-text space-y-3 text-sm leading-7 [&_h1]:text-xl [&_h2]:text-lg [&_h2]:font-bold [&_li]:ms-4 [&_table]:block [&_table]:overflow-auto [&_td]:border [&_td]:border-border [&_td]:p-2"><ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown></div></section> : <div className="grid min-h-56 place-items-center border-b border-border text-muted-foreground"><div className="space-y-2 text-center"><Megaphone className="mx-auto size-12 text-gold/60" /><p>إعلانك القادم</p></div></div>}
        <div className="grid gap-4 sm:grid-cols-2">{([image, video] as const).map((asset, i) => asset && <section key={i} className="min-w-0 space-y-2"><h2 className="font-bold">{asset.kind === "image" ? "الصورة الإعلانية" : "الفيديو الإعلاني"}</h2>{asset.kind === "image" ? <img src={asset.url} alt="التصميم الإعلاني الناتج" className="max-h-96 w-full rounded-lg object-contain" /> : <video src={asset.url} playsInline controls className="max-h-96 w-full rounded-lg" />}<Button variant="glass" size="sm" onClick={() => void download(asset)}><Download className="size-4" />تنزيل</Button></section>)}</div>
        <section className="space-y-3 border-t border-border pt-4"><h2 className="flex items-center gap-2 font-bold"><Share2 className="size-4 text-gold" />مشاركة الإعلان</h2><select aria-label="محتوى المشاركة" value={shareMode} onChange={(e) => setShareMode(e.target.value)} className="h-9 max-w-full rounded-md border border-input bg-background px-2 text-sm"><option value="text">نص فقط</option><option value="text-image">نص مع صورة</option><option value="video-image">فيديو مع صورة</option></select><div className="flex flex-wrap gap-2"><Button variant="gold" size="sm" disabled={!text && !image && !video} onClick={() => void share()}><Share2 className="size-4" />مشاركة عبر التطبيقات</Button>{["WhatsApp", "Facebook", "Instagram", "TikTok"].map((platform) => <Button variant="glass" size="sm" key={platform} disabled={!text && !image && !video} onClick={() => void share(platform === "WhatsApp" ? "whatsapp" : "device")}>{platform}</Button>)}</div><p className="text-xs text-muted-foreground">التطبيقات المتاحة تعتمد على هاتفك ودعمها للملفات. لا يتم النشر تلقائيًا في حساباتك؛ أكمل المشاركة داخل التطبيق المختار.</p></section>
      </div>
    </div>
  </div>;
}