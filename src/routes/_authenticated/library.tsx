import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { KIND_META, uploadMedia, deleteMedia, downloadMedia, formatSize, type MediaKind } from "@/lib/media";
import { MediaThumb } from "@/components/MediaThumb";
import { PageHeader, STATUS_LABEL } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "المكتبة — عبقرينو" }, { name: "description", content: "سجل الفيديوهات وكل ملفاتك المرفوعة." }, { property: "og:title", content: "مكتبة عبقرينو" }, { property: "og:description", content: "الفيديوهات والصور والصوتيات والمستندات المحفوظة." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Library,
});

type Tab = "videos" | MediaKind;

function Library() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("videos");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => (await supabase.from("media_assets").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await supabase.from("video_projects").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) await uploadMedia(f);
      toast.success("تم الرفع");
      qc.invalidateQueries({ queryKey: ["assets"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function removeProject(id: string) {
    await supabase.from("video_projects").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["projects"] });
  }

  const tabs: { k: Tab; l: string }[] = [{ k: "videos", l: "سجل الفيديوهات" }, ...(Object.keys(KIND_META) as MediaKind[]).map((k) => ({ k, l: KIND_META[k].label }))];
  const list = tab === "videos" ? [] : assets.filter((a) => a.kind === tab);
  async function removeSelected() {
    const targets = assets.filter((asset) => selected.includes(asset.id));
    if (!targets.length || !confirm(`حذف ${targets.length} ملف نهائيًا؟`)) return;
    await Promise.all(targets.map((asset) => deleteMedia(asset.id, asset.storage_path)));
    setSelected([]); await qc.invalidateQueries({ queryKey: ["assets"] }); toast.success("تم حذف الملفات المحددة");
  }

  return (
    <div>
      <PageHeader title="المكتبة" subtitle="صور، فيديوهات، صوتيات، مستندات ومشاريعك"
        action={
          <>
            <input ref={input} type="file" multiple hidden accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.srt,.vtt,.ppt,.pptx,.xls,.xlsx" onChange={(e) => onFiles(e.target.files)} />
            <Button variant="gold" disabled={busy} onClick={() => input.current?.click()}><Upload /> {busy ? "جارٍ الرفع…" : "رفع ملفات"}</Button>
          </>
        } />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${tab === t.k ? "bg-gold-gradient font-bold text-primary-foreground" : "glass text-muted-foreground"}`}>{t.l}</button>
        ))}
      </div>
      {tab !== "videos" && selected.length > 0 && <div className="mb-4 flex items-center justify-between rounded-lg border bg-secondary p-2 text-sm"><span>تم تحديد {selected.length}</span><Button variant="destructive" size="sm" onClick={removeSelected}><Trash2 />حذف المحدد</Button></div>}

      {tab === "videos" ? (
        projects.length === 0 ? <Empty /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((p) => (
              <div key={p.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold">{p.title}</h3>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("ar")}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs text-gold-soft">{STATUS_LABEL[p.status] ?? p.status}</span>
                </div>
                {p.script_text && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.script_text}</p>}
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span dir="ltr">{p.voice_model} · {p.avatar_model}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeProject(p.id)} aria-label="حذف"><Trash2 /></Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : list.length === 0 ? <Empty /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {list.map((a) => (
            <div key={a.id} className="glass overflow-hidden rounded-2xl">
              <label className="absolute z-10 m-2 grid size-7 cursor-pointer place-items-center rounded-md bg-background"><input type="checkbox" checked={selected.includes(a.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, a.id] : current.filter((id) => id !== a.id))} aria-label={`تحديد ${a.name}`} /></label>
              <MediaThumb path={a.storage_path} kind={a.kind} className="aspect-square w-full" />
              <div className="flex items-center justify-between gap-1 p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs" dir="ltr">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatSize(a.size_bytes)}</p>
                </div>
                <div className="flex"><Button variant="ghost" size="icon" aria-label="تنزيل" onClick={() => downloadMedia(a.storage_path, a.name)}><Download /></Button><Button variant="ghost" size="icon" aria-label="حذف" onClick={async () => { if (!confirm("حذف الملف نهائيًا؟")) return; await deleteMedia(a.id, a.storage_path); qc.invalidateQueries({ queryKey: ["assets"] }); }}><Trash2 /></Button></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <div className="glass rounded-2xl p-10 text-center text-muted-foreground">لا يوجد شيء هنا بعد</div>;
}
