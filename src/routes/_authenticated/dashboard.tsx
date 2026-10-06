import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clapperboard, ImageIcon, Mic, Video, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader, STATUS_LABEL } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "لوحة التحكم — عبقرينو" }, { name: "description", content: "نظرة عامة على مشاريعك وملفاتك." }, { property: "og:title", content: "لوحة تحكم عبقرينو" }, { property: "og:description", content: "إدارة مشاريع وملفات عبقرينو AI Studio." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => (await supabase.from("media_assets").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await supabase.from("video_projects").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const count = (k: string) => assets.filter((a) => a.kind === k).length;
  const stats = [
    { l: "مشاريع الفيديو", v: projects.length, i: Clapperboard },
    { l: "صور", v: count("image"), i: ImageIcon },
    { l: "صوتيات", v: count("audio"), i: Mic },
    { l: "فيديوهات", v: count("video"), i: Video },
    { l: "مستندات", v: count("document"), i: FileText },
  ];
  const steps = ["صوتك", "نموذج الصوت", "صورتك", "تحريك الوجه", "FFmpeg", "الفيديو النهائي"];

  return (
    <div>
      <PageHeader title="أهلًا بك في استوديو عبقرينو" subtitle="ابدأ مشروع فيديو جديد أو تصفّح مكتبتك"
        action={<Button asChild variant="gold"><Link to="/studio">فيديو جديد</Link></Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.l} className="glass rounded-2xl p-4">
            <s.i className="size-5 text-gold" />
            <div className="mt-3 text-2xl font-bold">{s.v}</div>
            <div className="text-xs text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>

      <section className="glass mt-6 rounded-2xl p-5">
        <h2 className="mb-4 font-bold">مسار الإنتاج <span className="text-xs font-normal text-muted-foreground">(يُفعَّل في المرحلة 2)</span></h2>
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs ${i === steps.length - 1 ? "bg-gold-gradient text-primary-foreground font-bold" : "bg-secondary"}`}>{s}</span>
              {i < steps.length - 1 && <ArrowLeft className="size-4 text-gold" />}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">آخر المشاريع</h2>
          <Link to="/library" className="text-sm text-gold-soft">عرض الكل</Link>
        </div>
        {projects.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">لا توجد مشاريع بعد</div>
        ) : (
          <div className="space-y-2">
            {projects.slice(0, 5).map((p) => (
              <div key={p.id} className="glass flex items-center justify-between rounded-xl p-4">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar")}</div>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs text-gold-soft">{STATUS_LABEL[p.status] ?? p.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
