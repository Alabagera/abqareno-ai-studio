import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera, Check, Images, Mic2, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media";
import { PageHeader } from "@/components/PageHeader";
import { MediaThumb } from "@/components/MediaThumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/profiles")({
  head: () => ({ meta: [
    { title: "الأفاتار والصوت — عبقرينو AI Studio" },
    { name: "description", content: "أنشئ أفاتارًا وصوتًا ثابتين لاستخدامهما في فيديوهاتك." },
    { property: "og:title", content: "ملفاتي الشخصية — عبقرينو" },
    { property: "og:description", content: "مكتبة الأفاتار والأصوات المحفوظة." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProfilesPage,
});

function ProfilesPage() {
  const qc = useQueryClient();
  const [avatarName, setAvatarName] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [avatarAssets, setAvatarAssets] = useState<string[]>([]);
  const [voiceAssets, setVoiceAssets] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);

  const { data: avatars = [] } = useQuery({
    queryKey: ["avatar-profiles"],
    queryFn: async () => (await supabase.from("avatar_profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: voices = [] } = useQuery({
    queryKey: ["voice-profiles"],
    queryFn: async () => (await supabase.from("voice_profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => (await supabase.from("media_assets").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function uploadMany(files: FileList | null, kind: "image" | "audio") {
    if (!files?.length) return;
    setBusy(true);
    try {
      const uploaded = [];
      for (const file of Array.from(files)) uploaded.push(await uploadMedia(file, kind));
      if (kind === "image") setAvatarAssets((old) => [...old, ...uploaded.map((a) => a.id)]);
      else setVoiceAssets((old) => [...old, ...uploaded.map((a) => a.id)]);
      await qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("تم رفع العينات");
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  async function saveAvatar() {
    if (!avatarName.trim() || avatarAssets.length < 3) return toast.error("اكتب اسمًا وارفع 3 صور على الأقل من زوايا مختلفة");
    const { error } = await supabase.from("avatar_profiles").insert({
      name: avatarName.trim(), image_asset_ids: avatarAssets, cover_asset_id: avatarAssets[0], status: "ready",
    });
    if (error) return toast.error(error.message);
    setAvatarName(""); setAvatarAssets([]); await qc.invalidateQueries({ queryKey: ["avatar-profiles"] });
    toast.success("تم حفظ الأفاتار");
  }

  async function saveVoice() {
    if (!voiceName.trim() || voiceAssets.length === 0) return toast.error("اكتب اسمًا وارفع تسجيلاً صوتيًا واضحًا");
    const { error } = await supabase.from("voice_profiles").insert({
      name: voiceName.trim(), sample_asset_ids: voiceAssets, primary_sample_asset_id: voiceAssets[0], status: "ready",
      enhancement: { clarity: 100, noise_reduction: 100, studio_quality: true },
    });
    if (error) return toast.error(error.message);
    setVoiceName(""); setVoiceAssets([]); await qc.invalidateQueries({ queryKey: ["voice-profiles"] });
    toast.success("تم حفظ الصوت الاستوديو");
  }

  return (
    <div>
      <PageHeader title="الأفاتار والصوت الثابت" subtitle="جهّز هويتك مرة واحدة، ثم استخدمها في أي فيديو" />
      <Tabs defaultValue="avatar" dir="rtl">
        <TabsList className="mb-5 grid h-auto w-full grid-cols-2 md:w-96">
          <TabsTrigger value="avatar"><Camera className="ms-2 size-4" />الأفاتار</TabsTrigger>
          <TabsTrigger value="voice"><Mic2 className="ms-2 size-4" />الصوت</TabsTrigger>
        </TabsList>
        <TabsContent value="avatar" className="space-y-5">
          <section className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-start gap-3"><Images className="mt-1 size-5 text-gold" /><div><h2 className="font-bold">إنشاء أفاتار ثابت</h2><p className="text-sm text-muted-foreground">ارفع صورًا واضحة: أمامية، يمين، يسار، وزاوية ثلاثة أرباع.</p></div></div>
            <Label htmlFor="avatar-name">اسم الأفاتار</Label>
            <Input id="avatar-name" className="mt-2" value={avatarName} onChange={(e) => setAvatarName(e.target.value)} placeholder="مثال: عبقرينو الرسمي" />
            <input ref={imageInput} hidden multiple type="file" accept="image/*" onChange={(e) => uploadMany(e.target.files, "image")} />
            <Button className="mt-4" variant="glass" disabled={busy} onClick={() => imageInput.current?.click()}><Upload />رفع صور الوجه</Button>
            <SelectedAssets ids={avatarAssets} assets={assets} />
            <Button className="mt-4 w-full md:w-auto" variant="gold" disabled={busy} onClick={saveAvatar}><Sparkles />حفظ الأفاتار النهائي</Button>
          </section>
          <ProfileGrid items={avatars} assets={assets} kind="avatar" onDelete={async (id) => { await supabase.from("avatar_profiles").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["avatar-profiles"] }); }} />
        </TabsContent>
        <TabsContent value="voice" className="space-y-5">
          <section className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-start gap-3"><Mic2 className="mt-1 size-5 text-gold" /><div><h2 className="font-bold">إنشاء صوت استوديو ثابت</h2><p className="text-sm text-muted-foreground">سجّل في مكان هادئ وبنبرة طبيعية. سيُحفظ مع إعدادات وضوح وتنقية قصوى.</p></div></div>
            <Label htmlFor="voice-name">اسم الصوت</Label>
            <Input id="voice-name" className="mt-2" value={voiceName} onChange={(e) => setVoiceName(e.target.value)} placeholder="مثال: صوتي الرسمي" />
            <input ref={audioInput} hidden multiple type="file" accept="audio/*" onChange={(e) => uploadMany(e.target.files, "audio")} />
            <Button className="mt-4" variant="glass" disabled={busy} onClick={() => audioInput.current?.click()}><Upload />رفع عينات الصوت</Button>
            <SelectedAssets ids={voiceAssets} assets={assets} />
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-gold-soft"><span className="rounded-full bg-secondary px-3 py-1"><Check className="inline size-3" /> تنقية الضوضاء</span><span className="rounded-full bg-secondary px-3 py-1"><Check className="inline size-3" /> وضوح 100%</span><span className="rounded-full bg-secondary px-3 py-1"><Check className="inline size-3" /> جودة استوديو</span></div>
            <Button className="mt-4 w-full md:w-auto" variant="gold" disabled={busy} onClick={saveVoice}><Sparkles />حفظ الصوت الثابت</Button>
          </section>
          <ProfileGrid items={voices} assets={assets} kind="voice" onDelete={async (id) => { await supabase.from("voice_profiles").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["voice-profiles"] }); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Asset = { id: string; name: string; storage_path: string; kind: string };
type Profile = { id: string; name: string; cover_asset_id?: string | null; primary_sample_asset_id?: string | null; image_asset_ids?: string[]; sample_asset_ids?: string[] };

function SelectedAssets({ ids, assets }: { ids: string[]; assets: Asset[] }) {
  if (!ids.length) return null;
  return <div className="mt-4 flex gap-2 overflow-x-auto">{ids.map((id) => { const a = assets.find((item) => item.id === id); return a ? <div key={id} className="w-20 shrink-0"><MediaThumb path={a.storage_path} kind={a.kind} className="aspect-square w-full rounded-xl" /><p className="mt-1 truncate text-[10px]" dir="ltr">{a.name}</p></div> : null; })}</div>;
}

function ProfileGrid({ items, assets, kind, onDelete }: { items: Profile[]; assets: Asset[]; kind: "avatar" | "voice"; onDelete: (id: string) => void }) {
  if (!items.length) return <div className="glass rounded-2xl p-8 text-center text-muted-foreground">لم تحفظ أي ملفات بعد</div>;
  return <div className="grid gap-3 md:grid-cols-3">{items.map((item) => { const assetId = kind === "avatar" ? item.cover_asset_id : item.primary_sample_asset_id; const asset = assets.find((a) => a.id === assetId); const count = kind === "avatar" ? item.image_asset_ids?.length : item.sample_asset_ids?.length; return <div key={item.id} className="glass flex items-center gap-3 rounded-2xl p-3">{asset ? <MediaThumb path={asset.storage_path} kind={asset.kind} className="size-16 shrink-0 rounded-xl" /> : <div className="grid size-16 place-items-center rounded-xl bg-secondary"><Plus /></div>}<div className="min-w-0 flex-1"><h3 className="truncate font-bold">{item.name}</h3><p className="text-xs text-muted-foreground">{count} {kind === "avatar" ? "صور" : "عينات"} · جاهز</p></div><Button variant="ghost" size="icon" aria-label="حذف" onClick={() => onDelete(item.id)}><Trash2 /></Button></div>; })}</div>;
}