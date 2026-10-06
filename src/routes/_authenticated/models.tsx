import { createFileRoute } from "@tanstack/react-router";
import { AI_MODELS, TASK_LABELS, type ModelTask } from "@/lib/ai/registry";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/models")({
  head: () => ({ meta: [{ title: "نماذج الذكاء الاصطناعي — عبقرينو" }, { name: "description", content: "النماذج مفتوحة المصدر المتاحة للاستوديو." }, { property: "og:title", content: "نماذج عبقرينو AI" }, { property: "og:description", content: "سجل نماذج الصوت وتحريك الوجه والترجمة القابل للتوسعة." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Models,
});

function Models() {
  const tasks = Object.keys(TASK_LABELS) as ModelTask[];
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
                    <h3 className="font-bold" dir="ltr">{m.name}</h3>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground">
                      {m.status === "ready" ? "متصل" : "المرحلة 2"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">المصدر: {m.source}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
