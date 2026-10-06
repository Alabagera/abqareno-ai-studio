import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard, ImageIcon, Mic, Video, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader, STATUS_LABEL } from "@/components/PageHeader";
import { AlabageraPortrait } from "@/components/AlabageraPortrait";
import step1 from "@/assets/step-1.jpg";
import step2 from "@/assets/step-2.jpg";
import step3 from "@/assets/step-3.jpg";
import step4 from "@/assets/step-4.jpg";

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
  const steps = [
    { img: step1, t: "ارفع صورتك وصوتك", d: "من «الأفاتار والأصوات» ارفع صورة واضحة للوجه وسجّل عينة صوتك 10–30 ثانية، أو صوّر وسجّل مباشرة من الموقع." },
    { img: step2, t: "اكتب النص أو اطلبه من عبقرينو", d: "اكتب السكربت في الاستوديو أو اختر قالبًا في المساعد الذكي ثم «استخدام في الاستوديو»، واختر اللغة واللهجة وتحسين الصوت." },
    { img: step3, t: "صمّم الفيديو", d: "اختر المقاس (ريلز، تيك توك، يوتيوب…)، الخلفية، الشعار، العناوين والترجمة، وحرّكها بإصبعك في المعاينة." },
    { img: step4, t: "أنتج وانشر", d: "اضغط «إنتاج الفيديو»: يُولَّد صوتك، يتحرك وجهك بتزامن الشفاه، وتُدمج الترجمة، ثم حمّل الفيديو من المكتبة وانشره." },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-4"><AlabageraPortrait className="size-20 rounded-full border-2 border-gold shadow-gold" eager /><div className="min-w-0 flex-1"><PageHeader title="أهلًا بك في استوديو عبقرينو" subtitle="ابدأ مشروع فيديو أو محادثة ذكية جديدة" action={<Button asChild variant="gold"><Link to="/assistant">اسأل عبقرينو</Link></Button>} /></div></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.l} className="glass rounded-2xl p-4">
            <s.i className="size-5 text-gold" />
            <div className="mt-3 text-2xl font-bold">{s.v}</div>
            <div className="text-xs text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="mb-4 font-bold">كيف تنتج فيديو في 4 خطوات</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.t} className="glass overflow-hidden rounded-2xl">
              <img src={s.img} alt={s.t} loading="lazy" width={992} height={672} className="aspect-[3/2] w-full object-cover" />
              <div className="p-4">
                <div className="mb-1 flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-gold-gradient text-sm font-bold text-primary-foreground">{i + 1}</span><h3 className="font-bold">{s.t}</h3></div>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
        <Button asChild variant="gold" className="mt-4"><Link to="/studio">ابدأ فيديو جديد</Link></Button>
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
