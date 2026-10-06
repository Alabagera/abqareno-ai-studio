import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Mic, Paperclip, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, signedUrl } from "@/lib/media";
import { modelsFor } from "@/lib/ai/registry";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({ meta: [{ title: "الاستوديو — عبقرينو" }, { name: "description", content: "أنشئ فيديو Talking Avatar من صورتك ونصك." }] }),
  component: Studio,
});

const FONTS = [
  { id: "Readex Pro", l: "ريدكس" },
  { id: "Tajawal", l: "تجوال" },
  { id: "serif", l: "كلاسيكي" },
];
const COLORS = ["oklch(0.88 0.11 88)", "oklch(0.98 0 0)", "oklch(0.75 0.15 230)", "oklch(0.78 0.17 150)", "oklch(0.72 0.2 20)"];
const BGS = [
  { id: "oklch(0.15 0.04 262 / 75%)", l: "داكن" },
  { id: "transparent", l: "بدون" },
  { id: "oklch(0.55 0.19 258 / 80%)", l: "أزرق" },
];
const LANGS = [
  { id: "", l: "بدون ترجمة" },
  { id: "en", l: "الإنجليزية" },
  { id: "fr", l: "الفرنسية" },
  { id: "tr", l: "التركية" },
  { id: "es", l: "الإسبانية" },
];

function Studio() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState<"tts" | "upload">("tts");
  const [audioId, setAudioId] = useState<string | null>(null);
  const [voiceModel, setVoiceModel] = useState("xtts-v2");
  const [avatarModel, setAvatarModel] = useState("sadtalker");
  const [subs, setSubs] = useState(true);
  const [font, setFont] = useState<string>("Readex Pro");
  const [color, setColor] = useState<string>(COLORS[0]!);
  const [bg, setBg] = useState<string>(BGS[0]!.id);
  const [size, setSize] = useState(22);
  const [translateTo, setTranslateTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const imgIn = useRef<HTMLInputElement>(null);
  const audIn = useRef<HTMLInputElement>(null);
  const extraIn = useRef<HTMLInputElement>(null);

  const { data: images = [] } = useQuery({
    queryKey: ["assets", "image"],
    queryFn: async () => (await supabase.from("media_assets").select("*").eq("kind", "image").order("created_at", { ascending: false }).limit(8)).data ?? [],
  });

  useEffect(() => {
    const a = images.find((i) => i.id === imageId);
    if (a) signedUrl(a.storage_path).then(setImageUrl);
  }, [imageId, images]);

  async function upload(file: File | undefined, kind: "image" | "audio" | null) {
    if (!file) return;
    setBusy("upload");
    try {
      const a = await uploadMedia(file, kind ?? undefined);
      if (kind === "image") setImageId(a.id);
      if (kind === "audio") setAudioId(a.id);
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("تم رفع الملف");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save(status: "draft" | "queued"): Promise<void> {
    if (!title.trim()) { toast.error("أدخل عنوانًا للفيديو"); return; }
    if (!imageId) { toast.error("ارفع صورة أولًا"); return; }
    if (voiceMode === "tts" && !script.trim()) { toast.error("أدخل النص"); return; }
    setBusy(status);
    const { error } = await supabase.from("video_projects").insert({
      title, script_text: script, avatar_asset_id: imageId, audio_asset_id: voiceMode === "upload" ? audioId : null,
      voice_model: voiceModel, avatar_model: avatarModel, subtitles_enabled: subs,
      subtitle_style: { font, color, bg, size }, translate_to: translateTo || null, status,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "queued" ? "أُضيف إلى قائمة الإنتاج — سيُعالج عند ربط النماذج" : "تم حفظ المسودة");
    qc.invalidateQueries({ queryKey: ["projects"] });
    navigate({ to: "/library" });
  }

  const sample = script.trim().split(/[.!؟?\n]/)[0]?.slice(0, 60) || "هنا تظهر الترجمة النصية";

  return (
    <div>
      <PageHeader title="إنشاء فيديو متحدث" subtitle="صورة + نص/صوت ← فيديو Talking Avatar" />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card n="1" t="عنوان المشروع">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: تقديم قناتي" />
          </Card>

          <Card n="2" t="صورتك">
            <input ref={imgIn} hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], "image")} />
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => imgIn.current?.click()} className="grid size-20 shrink-0 place-items-center rounded-xl border border-dashed border-primary/50 text-gold">
                <ImagePlus />
              </button>
              {images.map((i) => (
                <Thumb key={i.id} path={i.storage_path} active={imageId === i.id} onClick={() => setImageId(i.id)} />
              ))}
            </div>
          </Card>

          <Card n="3" t="النص والصوت">
            <Textarea rows={5} value={script} onChange={(e) => setScript(e.target.value)} placeholder="اكتب ما تريد أن يقوله الأفاتار…" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Seg active={voiceMode === "tts"} onClick={() => setVoiceMode("tts")}><Sparkles className="size-4" /> تحويل النص لصوتي</Seg>
              <Seg active={voiceMode === "upload"} onClick={() => setVoiceMode("upload")}><Mic className="size-4" /> رفع تسجيل صوتي</Seg>
            </div>
            {voiceMode === "tts" ? (
              <Select label="نموذج الصوت" value={voiceModel} onChange={setVoiceModel} options={modelsFor("tts").map((m) => ({ id: m.id, l: m.name }))} />
            ) : (
              <div className="mt-3">
                <input ref={audIn} hidden type="file" accept="audio/*" onChange={(e) => upload(e.target.files?.[0], "audio")} />
                <Button variant="glass" onClick={() => audIn.current?.click()}><Mic /> {audioId ? "تم رفع الصوت ✓" : "اختر ملف صوتي"}</Button>
              </div>
            )}
            <Select label="نموذج تحريك الوجه" value={avatarModel} onChange={setAvatarModel} options={modelsFor("avatar").map((m) => ({ id: m.id, l: m.name }))} />
          </Card>

          <Card n="4" t="الترجمة النصية والترجمة">
            <div className="flex items-center justify-between">
              <Label>إظهار الترجمة النصية التلقائية</Label>
              <Switch checked={subs} onCheckedChange={setSubs} />
            </div>
            {subs && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label className="mb-2 block text-xs text-muted-foreground">الخط</Label>
                  <div className="grid grid-cols-3 gap-2">{FONTS.map((f) => <Seg key={f.id} active={font === f.id} onClick={() => setFont(f.id)}><span style={{ fontFamily: f.id }}>{f.l}</span></Seg>)}</div>
                </div>
                <div>
                  <Label className="mb-2 block text-xs text-muted-foreground">اللون</Label>
                  <div className="flex gap-2">{COLORS.map((c) => <button key={c} aria-label="لون" onClick={() => setColor(c)} className={`size-8 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />)}</div>
                </div>
                <div>
                  <Label className="mb-2 block text-xs text-muted-foreground">الخلفية</Label>
                  <div className="grid grid-cols-3 gap-2">{BGS.map((b) => <Seg key={b.id} active={bg === b.id} onClick={() => setBg(b.id)}>{b.l}</Seg>)}</div>
                </div>
                <div>
                  <Label className="mb-2 block text-xs text-muted-foreground">الحجم: {size}</Label>
                  <input type="range" min={14} max={36} value={size} onChange={(e) => setSize(+e.target.value)} className="w-full accent-[var(--gold)]" />
                </div>
              </div>
            )}
            <Select label="ترجمة إلى لغة أخرى" value={translateTo} onChange={setTranslateTo} options={LANGS} />
          </Card>

          <Card n="5" t="ملفات إضافية (اختياري)">
            <input ref={extraIn} hidden multiple type="file" accept="video/*,audio/*,.pdf,.doc,.docx,.txt,.srt,.vtt" onChange={async (e) => { for (const f of Array.from(e.target.files ?? [])) await upload(f, null); }} />
            <Button variant="glass" onClick={() => extraIn.current?.click()}><Paperclip /> رفع فيديو / صوت / مستند</Button>
          </Card>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="glass overflow-hidden rounded-3xl">
            <div className="relative aspect-[9/12] bg-secondary">
              {imageUrl ? <img src={imageUrl} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-sm text-muted-foreground">معاينة الفيديو</div>}
              {subs && (
                <div className="absolute inset-x-4 bottom-6 text-center">
                  <span className="inline-block rounded-lg px-3 py-1.5 font-bold leading-relaxed" style={{ fontFamily: font, color, background: bg, fontSize: size }}>{sample}</span>
                </div>
              )}
            </div>
            <div className="space-y-2 p-4">
              <Button variant="gold" className="w-full" size="lg" disabled={!!busy} onClick={() => save("queued")}>إنشاء الفيديو</Button>
              <Button variant="glass" className="w-full" disabled={!!busy} onClick={() => save("draft")}>حفظ كمسودة</Button>
              <p className="text-center text-[11px] text-muted-foreground">التوليد الفعلي يُفعَّل في المرحلة 2 عند ربط النماذج</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ n, t, children }: { n: string; t: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-gold-gradient text-sm text-primary-foreground">{n}</span>{t}
      </h2>
      {children}
    </section>
  );
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-secondary text-gold ring-1 ring-primary" : "bg-muted/50 text-muted-foreground"}`}>
      {children}
    </button>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; l: string }[] }) {
  return (
    <div className="mt-4">
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        {options.map((o) => <option key={o.id} value={o.id}>{o.l}</option>)}
      </select>
    </div>
  );
}

function Thumb({ path, active, onClick }: { path: string; active: boolean; onClick: () => void }) {
  const { data: url } = useQuery({ queryKey: ["signed", path], queryFn: () => signedUrl(path), staleTime: 50 * 60 * 1000 });
  return (
    <button onClick={onClick} className={`size-20 shrink-0 overflow-hidden rounded-xl ring-2 ${active ? "ring-primary" : "ring-transparent"}`}>
      {url && <img src={url} alt="" className="size-full object-cover" />}
    </button>
  );
}
