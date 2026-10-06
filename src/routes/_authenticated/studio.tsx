import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Mic, Paperclip, Sparkles, Image as ImageIcon, Stamp, Type } from "lucide-react";
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
  head: () => ({ meta: [
    { title: "استوديو الفيديو — عبقرينو AI Studio" },
    { name: "description", content: "أنشئ فيديو متحدثًا بأفاتارك وصوتك وخلفيتك وشعارك." },
    { property: "og:title", content: "استوديو الفيديو — عبقرينو" },
    { property: "og:description", content: "إنشاء فيديوهات عربية بأفاتار وصوت وترجمة قابلة للتنسيق." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
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
  const [avatarProfileId, setAvatarProfileId] = useState("");
  const [voiceProfileId, setVoiceProfileId] = useState("");
  const [backgroundId, setBackgroundId] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [logoId, setLogoId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [extraText, setExtraText] = useState("");
  const [subs, setSubs] = useState(true);
  const [font, setFont] = useState<string>("Readex Pro");
  const [color, setColor] = useState<string>(COLORS[0]!);
  const [bg, setBg] = useState<string>(BGS[0]!.id);
  const [size, setSize] = useState(22);
  const [translateTo, setTranslateTo] = useState("");
  const [activeColor, setActiveColor] = useState(COLORS[4]!);
  const [activeSize, setActiveSize] = useState(28);
  const [translationFont, setTranslationFont] = useState("Tajawal");
  const [translationColor, setTranslationColor] = useState(COLORS[2]!);
  const [translationActiveColor, setTranslationActiveColor] = useState(COLORS[0]!);
  const [translationSize, setTranslationSize] = useState(20);
  const [busy, setBusy] = useState<string | null>(null);
  const imgIn = useRef<HTMLInputElement>(null);
  const audIn = useRef<HTMLInputElement>(null);
  const extraIn = useRef<HTMLInputElement>(null);
  const bgIn = useRef<HTMLInputElement>(null);
  const logoIn = useRef<HTMLInputElement>(null);

  const { data: images = [] } = useQuery({
    queryKey: ["assets", "image"],
    queryFn: async () => (await supabase.from("media_assets").select("*").eq("kind", "image").order("created_at", { ascending: false }).limit(8)).data ?? [],
  });
  const { data: avatarProfiles = [] } = useQuery({ queryKey: ["avatar-profiles"], queryFn: async () => (await supabase.from("avatar_profiles").select("*").eq("status", "ready").order("created_at", { ascending: false })).data ?? [] });
  const { data: voiceProfiles = [] } = useQuery({ queryKey: ["voice-profiles"], queryFn: async () => (await supabase.from("voice_profiles").select("*").eq("status", "ready").order("created_at", { ascending: false })).data ?? [] });

  useEffect(() => {
    const a = images.find((i) => i.id === imageId);
    if (a) signedUrl(a.storage_path).then(setImageUrl);
  }, [imageId, images]);

  useEffect(() => {
    const profile = avatarProfiles.find((item) => item.id === avatarProfileId);
    if (profile?.cover_asset_id) {
      setImageId(profile.cover_asset_id);
    }
  }, [avatarProfileId, avatarProfiles]);

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

  async function uploadVisual(file: File | undefined, target: "background" | "logo") {
    if (!file) return;
    setBusy("upload");
    try {
      const asset = await uploadMedia(file, "image");
      const url = await signedUrl(asset.storage_path);
      if (target === "background") { setBackgroundId(asset.id); setBackgroundUrl(url); }
      else { setLogoId(asset.id); setLogoUrl(url); }
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success(target === "background" ? "تمت إضافة الخلفية" : "تمت إضافة الشعار");
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(null); }
  }

  async function save(status: "draft" | "queued"): Promise<void> {
    if (!title.trim()) { toast.error("أدخل عنوانًا للفيديو"); return; }
    if (!imageId && !avatarProfileId) { toast.error("اختر أفاتارًا أو ارفع صورة أولًا"); return; }
    if (voiceMode === "tts" && !script.trim()) { toast.error("أدخل النص"); return; }
    setBusy(status);
    const { error } = await supabase.from("video_projects").insert({
      title, script_text: script, avatar_asset_id: imageId, audio_asset_id: voiceMode === "upload" ? audioId : null,
      voice_model: voiceModel, avatar_model: avatarModel, avatar_profile_id: avatarProfileId || null,
      voice_profile_id: voiceProfileId || null, background_asset_id: backgroundId, logo_asset_id: logoId,
      subtitles_enabled: subs, subtitle_style: { font, color, bg, size, activeColor, activeSize },
      translate_to: translateTo || null, translation_style: { font: translationFont, color: translationColor, activeColor: translationActiveColor, size: translationSize },
      title_overlay: { text: videoTitle, position: "top", font, color },
      text_overlays: extraText.trim() ? [{ text: extraText.trim(), position: "middle", font, color }] : [],
      logo_style: { position: "top-left", size: 18 }, status,
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
            {avatarProfiles.length > 0 && <Select label="الأفاتار المحفوظ" value={avatarProfileId} onChange={setAvatarProfileId} options={[{ id: "", l: "استخدام صورة جديدة" }, ...avatarProfiles.map((p) => ({ id: p.id, l: p.name }))]} />}
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
              <>
                {voiceProfiles.length > 0 && <Select label="الصوت الثابت المحفوظ" value={voiceProfileId} onChange={setVoiceProfileId} options={[{ id: "", l: "بدون صوت محفوظ" }, ...voiceProfiles.map((p) => ({ id: p.id, l: p.name }))]} />}
                <Select label="نموذج الصوت" value={voiceModel} onChange={setVoiceModel} options={modelsFor("tts").map((m) => ({ id: m.id, l: m.name }))} />
              </>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="mb-2 block text-xs text-muted-foreground">لون الكلمة المنطوقة الآن</Label><div className="flex gap-2">{COLORS.map((c) => <button key={c} aria-label="لون الكلمة الحالية" onClick={() => setActiveColor(c)} className={`size-8 rounded-full border-2 ${activeColor === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />)}</div></div>
                  <div><Label className="mb-2 block text-xs text-muted-foreground">حجم الكلمة الحالية: {activeSize}</Label><input type="range" min={16} max={44} value={activeSize} onChange={(e) => setActiveSize(+e.target.value)} className="w-full accent-[var(--gold)]" /></div>
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
            {translateTo && <div className="mt-4 space-y-4 border-t border-border pt-4"><h3 className="font-bold">تنسيق الترجمة</h3><Select label="خط الترجمة" value={translationFont} onChange={setTranslationFont} options={FONTS.map((f) => ({ id: f.id, l: f.l }))} /><div className="grid gap-4 sm:grid-cols-2"><div><Label className="mb-2 block text-xs text-muted-foreground">لون الترجمة</Label><div className="flex gap-2">{COLORS.map((c) => <button key={c} aria-label="لون الترجمة" onClick={() => setTranslationColor(c)} className={`size-8 rounded-full border-2 ${translationColor === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />)}</div></div><div><Label className="mb-2 block text-xs text-muted-foreground">لون الكلمة المترجمة الحالية</Label><div className="flex gap-2">{COLORS.map((c) => <button key={c} aria-label="لون الكلمة المترجمة الحالية" onClick={() => setTranslationActiveColor(c)} className={`size-8 rounded-full border-2 ${translationActiveColor === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />)}</div></div></div><Label className="block text-xs text-muted-foreground">حجم الترجمة: {translationSize}</Label><input type="range" min={14} max={36} value={translationSize} onChange={(e) => setTranslationSize(+e.target.value)} className="w-full accent-[var(--gold)]" /></div>}
          </Card>

          <Card n="5" t="الخلفية والشعار والنصوص">
            <div className="grid gap-3 sm:grid-cols-2"><div><input ref={bgIn} hidden type="file" accept="image/*" onChange={(e) => uploadVisual(e.target.files?.[0], "background")} /><Button className="w-full" variant="glass" onClick={() => bgIn.current?.click()}><ImageIcon />{backgroundId ? "تمت إضافة الخلفية ✓" : "إضافة صورة خلفية"}</Button></div><div><input ref={logoIn} hidden type="file" accept="image/*" onChange={(e) => uploadVisual(e.target.files?.[0], "logo")} /><Button className="w-full" variant="glass" onClick={() => logoIn.current?.click()}><Stamp />{logoId ? "تمت إضافة الشعار ✓" : "إضافة شعار"}</Button></div></div>
            <div className="mt-4 grid gap-3"><div><Label htmlFor="video-title">عنوان يظهر أعلى الفيديو</Label><Input id="video-title" className="mt-1" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="اكتب عنوان الفيديو" /></div><div><Label htmlFor="extra-text">نص إضافي داخل الفيديو</Label><Input id="extra-text" className="mt-1" value={extraText} onChange={(e) => setExtraText(e.target.value)} placeholder="مثال: تابعني للمزيد" /></div></div>
          </Card>

          <Card n="6" t="ملفات إضافية (اختياري)">
            <input ref={extraIn} hidden multiple type="file" accept="video/*,audio/*,.pdf,.doc,.docx,.txt,.srt,.vtt" onChange={async (e) => { for (const f of Array.from(e.target.files ?? [])) await upload(f, null); }} />
            <Button variant="glass" onClick={() => extraIn.current?.click()}><Paperclip /> رفع فيديو / صوت / مستند</Button>
          </Card>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="glass overflow-hidden rounded-3xl">
            <div className="relative aspect-[9/12] bg-secondary">
              {backgroundUrl && <img src={backgroundUrl} alt="الخلفية" className="absolute inset-0 size-full object-cover" />}
              {imageUrl ? <img src={imageUrl} alt="الأفاتار" className={`relative size-full ${backgroundUrl ? "object-contain object-bottom" : "object-cover"}`} /> : <div className="grid size-full place-items-center text-sm text-muted-foreground">معاينة الفيديو</div>}
              {videoTitle && <div className="absolute inset-x-4 top-5 text-center"><span className="inline-block rounded-lg bg-background/75 px-3 py-1.5 text-lg font-bold">{videoTitle}</span></div>}
              {logoUrl && <img src={logoUrl} alt="الشعار" className="absolute start-4 top-4 size-14 object-contain" />}
              {extraText && <div className="absolute inset-x-4 top-1/2 text-center"><span className="rounded-lg bg-background/70 px-3 py-1 text-sm"><Type className="me-1 inline size-3" />{extraText}</span></div>}
              {subs && (
                <div className="absolute inset-x-4 bottom-6 text-center">
                  <span className="inline-block rounded-lg px-3 py-1.5 font-bold leading-relaxed" style={{ fontFamily: font, color, background: bg, fontSize: size }}>{sample.split(" ").map((word, index) => <span key={`${word}-${index}`} style={index === 0 ? { color: activeColor, fontSize: activeSize } : undefined}>{word} </span>)}</span>
                  {translateTo && <span className="mt-2 block font-bold" style={{ fontFamily: translationFont, color: translationColor, fontSize: translationSize }}><span style={{ color: translationActiveColor }}>Translation</span> preview</span>}
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
