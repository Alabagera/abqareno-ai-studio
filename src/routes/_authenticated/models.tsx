import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AI_MODELS, TASK_LABELS, type ModelTask } from "@/lib/ai/registry";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/models")({
  head: () => ({ meta: [{ title: "نماذج الذكاء الاصطناعي — عبقرينو" }, { name: "description", content: "النماذج مفتوحة المصدر المتاحة للاستوديو." }, { property: "og:title", content: "نماذج عبقرينو AI" }, { property: "og:description", content: "سجل نماذج الصوت وتحريك الوجه والترجمة القابل للتوسعة." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Models,
});

function Models() {
  const { data: access } = useQuery({ queryKey: ["workspace-access"], queryFn: async () => (await supabase.rpc("my_workspace_access")).data as Record<string, boolean> | null });
  const tasks = Object.keys(TASK_LABELS) as ModelTask[];
  if (access && !access["models"]) return <div className="glass rounded-2xl p-8 text-center text-muted-foreground">لم يمنحك المدير صلاحية عرض هذه الصفحة.</div>;
  const showNames = access?.["show_model_names"] === true;
  return (
    <div>
      <PageHeader title="النماذج والأدوات" subtitle="سجل قابل للتوسعة — أضف أو بدّل أي نموذج مفتوح المصدر دون إعادة بناء الموقع" />
      <div className="space-y-6">
        {tasks.map((t) => (
          <section key={t}>
            <h2 className="mb-3 text-sm font-bold text-gold-soft">{TASK_LABELS[t]}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {AI_MODELS.filter((m) => m.task === t).map((m) => (
                <div key={m.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold" dir={showNames ? "ltr" : "rtl"}>{showNames ? m.name : TASK_LABELS[m.task]}</h3>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground">
                      {m.status === "ready" ? "متصل" : "المرحلة 2"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                  {showNames && <p className="mt-2 text-xs text-muted-foreground">المصدر: {m.source}</p>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
