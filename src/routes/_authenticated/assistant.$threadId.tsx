import { createFileRoute } from "@tanstack/react-router";
import { AssistantWorkspace } from "@/components/AssistantWorkspace";

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  head: () => ({ meta: [{ title: "محادثة عبقرينو — AI Studio" }, { name: "description", content: "مساحة عمل ذكية محفوظة للكتابة والترجمة والبرمجة والكورسات والملفات." }, { property: "og:title", content: "محادثة عبقرينو" }, { property: "og:description", content: "مساحة عمل عبقرينو الذكية متعددة المهام." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ThreadPage,
});
function ThreadPage() { const { threadId } = Route.useParams(); return <AssistantWorkspace key={threadId} threadId={threadId} />; }