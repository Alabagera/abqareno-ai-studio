import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Mic, Paperclip, Sparkles, Image as ImageIcon, Stamp, Type, Volume2, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, signedUrl } from "@/lib/media";
import { modelsFor } from "@/lib/ai/registry";
import { FONTS, COLORS, SOCIAL_SIZES, loadFont, estimateMinutes } from "@/lib/studio-options";
import { PageHeader } from "@/components/PageHeader";
import { ColorPicker, FontSelect } from "@/components/ColorPicker";
import { AudioRecorder, CameraCapture } from "@/components/MediaCapture";
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

const BGS = [
  { id: "rgba(10,15,40,0.75)", l: "داكن" },
  { id: "transparent", l: "بدون" },
  { id: "rgba(30,58,138,0.8)", l: "أزرق" },
  { id: "rgba(255,255,255,0.85)", l: "فاتح" },
];
const DEFAULT_CAPTION_BG = "rgba(10,15,40,0.75)";
const SCRIPT_LANGS = [
  { id: "auto", l: "تلقائي — العربية أو English" },
  { id: "ar", l: "العربية" },
  { id: "en", l: "English" },
];
const LANGS = [
  { id: "", l: "بدون ترجمة" }, { id: "en", l: "الإنجليزية" }, { id: "fr", l: "الفرنسية" }, { id: "tr", l: "التركية" },
  { id: "es", l: "الإسبانية" }, { id: "de", l: "الألمانية" }, { id: "ur", l: "الأردية" }, { id: "id", l: "الإندونيسية" },
];

function Studio() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [scriptLanguage, setScriptLanguage] = useState("auto");
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
  const [titleFont, setTitleFont] = useState("Lalezar");
  const [titleColor, setTitleColor] = useState("#FFD700");
  const [extraText, setExtraText] = useState("");
  const [subs, setSubs] = useState(true);
  const [font, setFont] = useState("Readex Pro");
  const [color, setColor] = useState("#FFFFFF");
  const [bg, setBg] = useState(DEFAULT_CAPTION_BG);
  const [size, setSize] = useState(22);
  const [translateTo, setTranslateTo] = useState("");
  const [activeColor, setActiveColor] = useState("#FFD700");
  const [activeSize, setActiveSize] = useState(28);
  const [translationFont, setTranslationFont] = useState("Tajawal");
  const [translationColor, setTranslationColor] = useState("#03A9F4");
  const [translationActiveColor, setTranslationActiveColor] = useState("#FFD700");
  const [translationSize, setTranslationSize] = useState(20);
  const [sizeId, setSizeId] = useState("ig-reels");
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const imgIn = useRef<HTMLInputElement>(null);
  const audIn = useRef<HTMLInputElement>(null);
  const extraIn = useRef<HTMLInputElement>(null);
  const bgIn = useRef<HTMLInputElement>(null);
  const logoIn = useRef<HTMLInputElement>(null);

  const sel = SOCIAL_SIZES.find((s) => s.id === sizeId) ?? SOCIAL_SIZES[0];
  if (!sel) return null;
  const w = sel.id === "custom" ? customW : sel.w;
  const h = sel.id === "custom" ? customH : sel.h;
  const minutes = estimateMinutes(script);

  const { data: images = [] } = useQuery({
    queryKey: ["assets", "image"],
    queryFn: async () => (await supabase.from("media_assets").select("*").eq("kind", "image").order("created_at", { ascending: false }).limit(12)).data ?? [],
  });
  const { data: avatarProfiles = [] } = useQuery({ queryKey: ["avatar-profiles"], queryFn: async () => (await supabase.from("avatar_profiles").select("*").eq("status", "ready").order("created_at", { ascending: false })).data ?? [] });
  const { data: voiceProfiles = [] } = useQuery({ queryKey: ["voice-profiles"], queryFn: async () => (await supabase.from("voice_profiles").select("*").eq("status", "ready").order("created_at", { ascending: false })).data ?? [] });
  const { data: usage } = useQuery({ queryKey: ["my-usage"], queryFn: async () => (await supabase.rpc("my_usage")).data as { max_videos: number | null; max_minutes_per_video: number | null; used: number } | null });

  useEffect(() => { const s = sessionStorage.getItem("studio-script"); if (s) { setScript(s); sessionStorage.removeItem("studio-script"); } }, []);
  useEffect(() => { [font, titleFont, translationFont].forEach(loadFont); }, [font, titleFont, translationFont]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  useEffect(() => { const a = images.find((i) => i.id === imageId); if (a) signedUrl(a.storage_path).then(setImageUrl); }, [imageId, images]);
  useEffect(() => { const p = avatarProfiles.find((x) => x.id === avatarProfileId); if (p?.cover_asset_id) setImageId(p.cover_asset_id); }, [avatarProfileId, avatarProfiles]);

  async function upload(file: File | undefined, kind: "image" | "audio" | null) {
    if (!file) return;
    setBusy("upload");
    try {
      const a = await uploadMedia(file, kind ?? undefined);
      if (a.kind === "image" && kind === "image") setImageId(a.id);
      if (kind === "audio") { setAudioId(a.id); setVoiceMode("upload"); }
      await qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("تم حفظ الملف");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }

  async function uploadVisual(file: File | undefined, target: "background" | "logo") {
    if (!file) return;
    setBusy("upload");
    try {
      const asset = await uploadMedia(file, "image");
      const url = await signedUrl(asset.storage_path);
      if (target === "background") { setBackgroundId(asset.id); setBackgroundUrl(url); } else { setLogoId(asset.id); setLogoUrl(url); }
      toast.success(target === "background" ? "تمت إضافة الخلفية" : "تمت إضافة الشعار");
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(null); }
  }

  function speak() {
    const synth = window.speechSynthesis;
    if (!synth) { toast.error("متصفحك لا يدعم تجربة النطق"); return; }
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    if (!script.trim()) { toast.error("اكتب النص أولًا"); return; }
    const hasArabic = /[\u0600-\u06ff]/.test(script);
    const speechLanguage = scriptLanguage === "auto" ? (hasArabic ? "ar" : "en") : scriptLanguage;
    const u = new SpeechSynthesisUtterance(script);
    u.lang = speechLanguage === "ar" ? "ar-SA" : "en-US"; u.rate = rate; u.pitch = pitch;
    const v = synth.getVoices().find((x) => x.lang.toLowerCase().startsWith(speechLanguage));
    if (v) u.voice = v;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel(); synth.speak(u); setSpeaking(true);
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
      subtitles_enabled: subs, subtitle_style: { font, color, bg, size, activeColor, activeSize, language: scriptLanguage, direction: "auto" },
      translate_to: translateTo || null, translation_style: { font: translationFont, color: translationColor, activeColor: translationActiveColor, size: translationSize },
      title_overlay: { text: videoTitle, position: "top", font: titleFont, color: titleColor, direction: "auto" },
      text_overlays: extraText.trim() ? [{ text: extraText.trim(), position: "middle", font: titleFont, color: titleColor, direction: "auto" }] : [],
      logo_style: { position: "top-left", size: 18 }, status,
      aspect_ratio: sel.id === "custom" ? `${w}x${h}` : sel.ratio, platform: sel.id, duration_minutes: minutes || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "queued" ? "أُضيف إلى قائمة الإنتاج — سيُعالج عند ربط النماذج" : "تم حفظ المسودة");
    qc.invalidateQueries({ queryKey: ["projects"] }); qc.invalidateQueries({ queryKey: ["my-usage"] });
    navigate({ to: "/library" });
  }

  const sample = script.trim().split(/[.!؟?\n]/)[0]?.slice(0, 60) || "هنا تظهر الترجمة النصية";
  const platforms = [...new Set(SOCIAL_SIZES.map((s) => s.platform))];

  return (
    <div>
      <PageHeader title="إنشاء فيديو متحدث" subtitle="صورة + نص/صوت ← فيديو Talking Avatar" />
      {usage?.max_videos != null || usage?.max_minutes_per_video != null ? (
        <div className="mb-4 rounded-xl bg-secondary px-4 py-2 text-sm">
          {usage?.max_videos != null && <>المتبقي لك: <b className="text-gold">{Math.max(0, usage.max_videos - usage.used)}</b> من {usage.max_videos} فيديو. </>}
          {usage?.max_minutes_per_video != null && <>الحد لكل فيديو: {usage.max_minutes_per_video} دقيقة.</>}
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <Card n="1" t="عنوان المشروع ومقاس الفيديو">
            <Input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: تقديم قناتي / Channel intro" />
            <div className="mt-4 space-y-3">
              {platforms.map((p) => (
                <div key={p}>
                  <div className="mb-1.5 text-xs text-muted-foreground">{p}</div>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_SIZES.filter((s) => s.platform === p).map((s) => (
                      <button key={s.id} type="button" onClick={() => setSizeId(s.id)} className={`rounded-xl px-3 py-1.5 text-xs transition ${sizeId === s.id ? "bg-secondary text-gold ring-1 ring-primary" : "bg-muted/50 text-muted-foreground"}`}>
                        {s.label} <span dir="ltr" className="opacity-70">{s.ratio !== "custom" ? s.ratio : ""}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {sizeId === "custom" && <div className="grid grid-cols-2 gap-2"><label className="text-xs">العرض<Input type="number" value={customW} onChange={(e) => setCustomW(+e.target.value || 1)} /></label><label className="text-xs">الارتفاع<Input type="number" value={customH} onChange={(e) => setCustomH(+e.target.value || 1)} /></label></div>}
              <p className="text-xs text-gold-soft" dir="ltr">{w} × {h}</p>
            </div>
          </Card>

          <Card n="2" t="صورتك">
            {avatarProfiles.length > 0 && <Select label="الأفاتار المحفوظ" value={avatarProfileId} onChange={setAvatarProfileId} options={[{ id: "", l: "استخدام صورة جديدة" }, ...avatarProfiles.map((p) => ({ id: p.id, l: p.name }))]} />}
            <input ref={imgIn} hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], "image")} />
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => imgIn.current?.click()} aria-label="رفع صورة" className="grid size-20 shrink-0 place-items-center rounded-xl border border-dashed border-primary/50 text-gold"><ImagePlus /></button>
              {images.map((i) => <Thumb key={i.id} path={i.storage_path} active={imageId === i.id} onClick={() => setImageId(i.id)} />)}
            </div>
            <div className="mt-3"><CameraCapture label="التقط صورتك الآن" onSave={(f) => upload(f, f.type.startsWith("image") ? "image" : null)} /></div>
          </Card>

          <Card n="3" t="النص والصوت">
            <Select label="لغة النص المنطوق" value={scriptLanguage} onChange={setScriptLanguage} options={SCRIPT_LANGS} />
            <Textarea dir="auto" lang={scriptLanguage === "auto" ? undefined : scriptLanguage} rows={5} value={script} onChange={(e) => setScript(e.target.value)} placeholder="اكتب بالعربية أو English ما تريد أن يقوله الأفاتار…" className="mt-3 bilingual-text" />
            <p className="mt-1 text-xs text-muted-foreground">المدة التقديرية: {minutes} دقيقة{usage?.max_minutes_per_video != null && minutes > usage.max_minutes_per_video ? <span className="text-destructive"> — تتجاوز الحد المسموح</span> : null}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Seg active={voiceMode === "tts"} onClick={() => setVoiceMode("tts")}><Sparkles className="size-4" /> تحويل النص لصوتي</Seg>
              <Seg active={voiceMode === "upload"} onClick={() => setVoiceMode("upload")}><Mic className="size-4" /> تسجيل / رفع صوت</Seg>
            </div>
            {voiceMode === "tts" ? (
              <>
                {voiceProfiles.length > 0 && <Select label="الصوت الثابت المحفوظ" value={voiceProfileId} onChange={setVoiceProfileId} options={[{ id: "", l: "بدون صوت محفوظ" }, ...voiceProfiles.map((p) => ({ id: p.id, l: p.name }))]} />}
                <Select label="نموذج الصوت" value={voiceModel} onChange={setVoiceModel} options={modelsFor("tts").map((m) => ({ id: m.id, l: m.name }))} />
                <div className="mt-4 rounded-xl bg-muted/40 p-3">
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <label>السرعة: {rate}<input type="range" min={0.6} max={1.5} step={0.1} value={rate} onChange={(e) => setRate(+e.target.value)} className="w-full accent-[var(--gold)]" /></label>
                    <label>طبقة الصوت: {pitch}<input type="range" min={0.5} max={1.5} step={0.1} value={pitch} onChange={(e) => setPitch(+e.target.value)} className="w-full accent-[var(--gold)]" /></label>
                  </div>
                  <Button type="button" className="mt-2 w-full" variant="glass" onClick={speak}>{speaking ? <><Square />إيقاف التجربة</> : <><Volume2 />جرّب نطق النص الآن</>}</Button>
                  <p className="mt-2 text-[11px] text-muted-foreground">تجربة سريعة بصوت المتصفح. النطق بصوتك المستنسخ يُفعَّل عند ربط XTTS-v2 في المرحلة 2.</p>
                </div>
              </>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <AudioRecorder onSave={(f) => upload(f, "audio")} />
                <input ref={audIn} hidden type="file" accept="audio/*" onChange={(e) => upload(e.target.files?.[0], "audio")} />
                <Button variant="glass" onClick={() => audIn.current?.click()}><Paperclip /> {audioId ? "تم إضافة الصوت ✓" : "اختر ملف صوتي"}</Button>
              </div>
            )}
            <Select label="نموذج تحريك الوجه" value={avatarModel} onChange={setAvatarModel} options={modelsFor("avatar").map((m) => ({ id: m.id, l: m.name }))} />
          </Card>

          <Card n="4" t="النص المنطوق على الشاشة والترجمة">
            <div className="flex items-center justify-between"><Label>إظهار النص أثناء الحديث</Label><Switch checked={subs} onCheckedChange={setSubs} /></div>
            {subs && (
              <div className="mt-4 space-y-4">
                <FontSelect label="الخط" value={font} onChange={setFont} fonts={FONTS} />
                <ColorPicker label="لون النص" value={color} onChange={setColor} />
                <ColorPicker label="لون الكلمة المنطوقة الآن" value={activeColor} onChange={setActiveColor} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs text-muted-foreground">حجم النص: {size}<input type="range" min={14} max={40} value={size} onChange={(e) => setSize(+e.target.value)} className="w-full accent-[var(--gold)]" /></label>
                  <label className="text-xs text-muted-foreground">حجم الكلمة الحالية: {activeSize}<input type="range" min={16} max={52} value={activeSize} onChange={(e) => setActiveSize(+e.target.value)} className="w-full accent-[var(--gold)]" /></label>
                </div>
                <div><Label className="mb-2 block text-xs text-muted-foreground">خلفية النص</Label><div className="grid grid-cols-4 gap-2">{BGS.map((b) => <Seg key={b.id} active={bg === b.id} onClick={() => setBg(b.id)}>{b.l}</Seg>)}</div></div>
              </div>
            )}
            <Select label="ترجمة إلى لغة أخرى" value={translateTo} onChange={setTranslateTo} options={LANGS} />
            {translateTo && (
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                <h3 className="font-bold">تنسيق الترجمة</h3>
                <FontSelect label="خط الترجمة" value={translationFont} onChange={setTranslationFont} fonts={FONTS} />
                <ColorPicker label="لون الترجمة" value={translationColor} onChange={setTranslationColor} />
                <ColorPicker label="لون الكلمة المترجمة الحالية" value={translationActiveColor} onChange={setTranslationActiveColor} />
                <label className="block text-xs text-muted-foreground">حجم الترجمة: {translationSize}<input type="range" min={14} max={40} value={translationSize} onChange={(e) => setTranslationSize(+e.target.value)} className="w-full accent-[var(--gold)]" /></label>
              </div>
            )}
          </Card>

          <Card n="5" t="الخلفية والشعار والعناوين">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><input ref={bgIn} hidden type="file" accept="image/*" onChange={(e) => uploadVisual(e.target.files?.[0], "background")} /><Button className="w-full" variant="glass" onClick={() => bgIn.current?.click()}><ImageIcon />{backgroundId ? "تمت إضافة الخلفية ✓" : "إضافة صورة خلفية"}</Button></div>
              <div><input ref={logoIn} hidden type="file" accept="image/*" onChange={(e) => uploadVisual(e.target.files?.[0], "logo")} /><Button className="w-full" variant="glass" onClick={() => logoIn.current?.click()}><Stamp />{logoId ? "تمت إضافة الشعار ✓" : "إضافة شعار"}</Button></div>
            </div>
            <div className="mt-4 grid gap-3">
              <div><Label htmlFor="video-title">عنوان يظهر أعلى الفيديو</Label><Input id="video-title" dir="auto" className="mt-1 bilingual-text" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="عنوان عربي أو English title" /></div>
              <div><Label htmlFor="extra-text">نص إضافي داخل الفيديو</Label><Input id="extra-text" dir="auto" className="mt-1 bilingual-text" value={extraText} onChange={(e) => setExtraText(e.target.value)} placeholder="مثال: تابعني للمزيد / Follow for more" /></div>
              <FontSelect label="خط العناوين" value={titleFont} onChange={setTitleFont} fonts={FONTS} />
              <ColorPicker label="لون العناوين" value={titleColor} onChange={setTitleColor} />
            </div>
          </Card>

          <Card n="6" t="ملفات إضافية (اختياري)">
            <input ref={extraIn} hidden multiple type="file" accept="video/*,audio/*,.pdf,.doc,.docx,.txt,.srt,.vtt" onChange={async (e) => { for (const f of Array.from(e.target.files ?? [])) await upload(f, null); }} />
            <div className="flex flex-wrap gap-2"><Button variant="glass" onClick={() => extraIn.current?.click()}><Paperclip /> رفع فيديو / صوت / مستند</Button><CameraCapture label="تصوير فيديو" onSave={(f) => upload(f, null)} /></div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="glass overflow-hidden rounded-3xl">
            <div className="flex justify-center bg-muted/40 p-3">
              <div className="relative w-full overflow-hidden rounded-xl bg-secondary" style={{ aspectRatio: `${w} / ${h}`, maxHeight: "60vh", maxWidth: `calc(60vh * ${w / h})` }}>
                {backgroundUrl && <img src={backgroundUrl} alt="الخلفية" className="absolute inset-0 size-full object-cover" />}
                {imageUrl ? <img src={imageUrl} alt="الأفاتار" className={`relative size-full ${backgroundUrl ? "object-contain object-bottom" : "object-cover"}`} /> : <div className="grid size-full place-items-center text-sm text-muted-foreground">معاينة الفيديو</div>}
                {videoTitle && <div className="absolute inset-x-3 top-4 text-center"><span dir="auto" className="bilingual-text inline-block max-w-full rounded-lg bg-black/50 px-3 py-1 text-lg font-bold" style={{ fontFamily: `${titleFont}, Noto Sans Arabic, Noto Sans, sans-serif`, color: titleColor }}>{videoTitle}</span></div>}
                {logoUrl && <img src={logoUrl} alt="الشعار" className="absolute start-3 top-3 size-12 object-contain" />}
                {extraText && <div className="absolute inset-x-3 top-1/2 text-center"><span dir="auto" className="bilingual-text inline-block max-w-full rounded-lg bg-black/50 px-3 py-1 text-sm" style={{ fontFamily: `${titleFont}, Noto Sans Arabic, Noto Sans, sans-serif`, color: titleColor }}><Type className="me-1 inline size-3" />{extraText}</span></div>}
                {subs && (
                  <div className="absolute inset-x-3 bottom-4 text-center">
                    <span dir="auto" lang={scriptLanguage === "auto" ? undefined : scriptLanguage} className="bilingual-text inline-block max-w-full rounded-lg px-3 py-1.5 font-bold leading-relaxed" style={{ fontFamily: `${font}, Noto Sans Arabic, Noto Sans, sans-serif`, color, background: bg, fontSize: size }}>{sample.split(/(\s+)/).map((word, index) => <span key={`${word}-${index}`} style={index === 0 ? { color: activeColor, fontSize: activeSize } : undefined}>{word}</span>)}</span>
                    {translateTo && <span dir={translateTo === "en" ? "ltr" : "auto"} lang={translateTo} className="bilingual-text mt-2 block font-bold" style={{ fontFamily: `${translationFont}, Noto Sans Arabic, Noto Sans, sans-serif`, color: translationColor, fontSize: translationSize }}><span style={{ color: translationActiveColor }}>Translation</span> preview</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 p-4">
              <p className="text-center text-xs text-gold-soft">{sel.platform} · {sel.label}</p>
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
    <section className="glass rounded-2xl p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold"><span className="grid size-7 place-items-center rounded-full bg-gold-gradient text-sm text-primary-foreground">{n}</span>{t}</h2>
      {children}
    </section>
  );
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-secondary text-gold ring-1 ring-primary" : "bg-muted/50 text-muted-foreground"}`}>{children}</button>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; l: string }[] }) {
  return (
    <div className="mt-4">
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{options.map((o) => <option key={o.id} value={o.id}>{o.l}</option>)}</select>
    </div>
  );
}

function Thumb({ path, active, onClick }: { path: string; active: boolean; onClick: () => void }) {
  const { data: url } = useQuery({ queryKey: ["signed", path], queryFn: () => signedUrl(path), staleTime: 50 * 60 * 1000 });
  return <button onClick={onClick} className={`size-20 shrink-0 overflow-hidden rounded-xl ring-2 ${active ? "ring-primary" : "ring-transparent"}`}>{url && <img src={url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />}</button>;
}
