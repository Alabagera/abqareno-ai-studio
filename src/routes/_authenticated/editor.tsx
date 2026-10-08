import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Film, Pencil, Plus, Trash2 } from "lucide-react";
import { createProject, deleteProject, listProjects } from "@/lib/editor/projects";
import { downloadMedia } from "@/lib/media";
import { PageHeader } from "@/components/PageHeader";
import { MediaThumb } from "@/components/MediaThumb";
import { VideoEditor } from "@/components/editor/VideoEditor";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/editor")({
  validateSearch: (s: Record<string, unknown>) => ({ p: typeof s["p"] === "string" ? (s["p"] as string) : undefined }),
  head: () => ({ meta: [{ title: "محرر الفيديو — عبقرينو AI Studio" }, { name: "description", content: "صناعة الفيديو وتعديله بطبقات وصوت احترافي وترجمة، مع مكتبة مشاريع وحفظ تلقائي." }, { property: "og:title", content: "محرر الفيديو — عبقرينو AI Studio" }, { property: "og:description", content: "محرر عربي بطبقات صوت وصورة وحفظ تلقائي وتصدير MP4." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: EditorPage,
});

function EditorPage() {
  const { p } = Route.useSearch();
  if (p) return <VideoEditor key={p} projectId={p} />;
  return <EditorLibrary />;
}

function EditorLibrary() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: projects = [], isLoading } = useQuery({ queryKey: ["editor-projects"], queryFn: listProjects });
  const open = (id: string) => navigate({ to: "/editor", search: { p: id } });
  async function create() {
    setBusy(true);
    try { open(await createProject()); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-5">
      <PageHeader title="محرر الفيديو" subtitle="مكتبة مشاريعك: كل مشروع يُحفظ تلقائيًا ويمكنك الرجوع إليه وتعديله في أي وقت" />
      <Button variant="gold" size="lg" disabled={busy} onClick={() => void create()}><Plus className="size-4" />مشروع فيديو جديد</Button>
      {isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p> : projects.length === 0 ? <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">لا توجد مشاريع بعد. ابدأ مشروعك الأول.</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((pr) => (
            <div key={pr.id} className="glass overflow-hidden rounded-2xl">
              <button type="button" onClick={() => open(pr.id)} className="block aspect-video w-full bg-secondary">
                {pr.thumb_path ? <MediaThumb path={pr.thumb_path} kind="image" className="size-full" /> : <div className="grid size-full place-items-center"><Film className="size-10 text-gold" /></div>}
              </button>
              <div className="space-y-2 p-3">
                <div className="font-bold" dir="auto">{pr.title}</div>
                <div className="text-[11px] text-muted-foreground">{pr.duration_seconds ? `${Number(pr.duration_seconds).toFixed(0)} ث · ` : ""}آخر تعديل {new Date(pr.updated_at).toLocaleString("ar")}</div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="gold" onClick={() => open(pr.id)}><Pencil className="size-3" />متابعة التعديل</Button>
                  {pr.export_path && <Button size="sm" variant="glass" onClick={() => void downloadMedia(pr.export_path!, `${pr.title}.mp4`)}><Download className="size-3" />تنزيل</Button>}
                  <Button size="sm" variant="ghost" onClick={async () => { if (!confirm("حذف هذا المشروع؟")) return; await deleteProject(pr.id); void qc.invalidateQueries({ queryKey: ["editor-projects"] }); }}><Trash2 className="size-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
