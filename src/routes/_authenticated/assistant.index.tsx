import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import { listThreads, createThread } from "@/lib/assistant";
import { Button } from "@/components/ui/button";
import { AlabageraPortrait } from "@/components/AlabageraPortrait";

export const Route = createFileRoute("/_authenticated/assistant/")({
  head: () => ({ meta: [{ title: "المساعد الذكي — عبقرينو AI Studio" }, { name: "description", content: "مساعد عربي وإنجليزي للترجمة والبرمجة والكورسات وتحليل الملفات." }, { property: "og:title", content: "مساعد عبقرينو الذكي" }, { property: "og:description", content: "محادثات محفوظة ومساعد متعدد المهام والملفات." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AssistantHome,
});

function AssistantHome() {
  const navigate = useNavigate();
  const { data: threads = [], isPending } = useQuery({ queryKey: ["assistant-threads"], queryFn: listThreads });
  async function start() { const thread = await createThread(); navigate({ to: "/assistant/$threadId", params: { threadId: thread.id } }); }
  return <div className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col items-center justify-center text-center">
    <AlabageraPortrait className="mb-5 size-32 rounded-full border-4 border-gold shadow-gold motion-safe:animate-in motion-safe:zoom-in-90" eager />
    <h1 className="text-3xl font-bold">مساعد عبقرينو الذكي</h1>
    <p className="mt-2 max-w-lg text-muted-foreground">للأعمال، الترجمة الطويلة، البرمجة، إنشاء الكورسات وتحليل ملفاتك بالعربية والإنجليزية.</p>
    <Button variant="gold" size="lg" className="mt-6" onClick={start}><MessageSquarePlus />محادثة جديدة</Button>
    {!isPending && threads.length > 0 && <div className="mt-8 w-full text-start"><h2 className="mb-2 text-sm font-bold">المحادثات الأخيرة</h2>{threads.slice(0, 6).map((t) => <Button key={t.id} variant="glass" className="mb-2 w-full justify-start" onClick={() => navigate({ to: "/assistant/$threadId", params: { threadId: t.id } })}>{t.title}</Button>)}</div>}
  </div>;
}