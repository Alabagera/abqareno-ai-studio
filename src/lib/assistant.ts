import { supabase } from "@/integrations/supabase/client";

export type AssistantMode = "general" | "translate" | "code" | "course" | "documents";

export const ASSISTANT_MODES: Record<AssistantMode, { label: string; hint: string }> = {
  general: { label: "أعمال وكتابة", hint: "اكتب، خطط، حلّل، وأنشئ محتوى احترافيًا" },
  translate: { label: "ترجمة احترافية", hint: "ترجمة النصوص الطويلة مع حفظ التنسيق والمصطلحات" },
  code: { label: "برمجة من النص", hint: "تطبيقات ومواقع وألعاب مع ملفات وكود منظم" },
  course: { label: "إنشاء كورس", hint: "منهج كامل، دروس، تمارين واختبارات من الصفر" },
  documents: { label: "تحليل المستندات", hint: "تلخيص واستخراج معلومات وتقارير من ملفاتك" },
};

export async function listThreads() {
  const { data, error } = await supabase.from("assistant_threads").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createThread(mode: AssistantMode = "general") {
  const { data, error } = await supabase.from("assistant_threads").insert({ mode }).select().single();
  if (error) throw error;
  return data;
}

export async function renameThread(id: string, title: string) {
  const { error } = await supabase.from("assistant_threads").update({ title: title.trim().slice(0, 80), updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteThread(id: string) {
  const { error } = await supabase.from("assistant_threads").delete().eq("id", id);
  if (error) throw error;
}

export async function loadThread(id: string) {
  const [{ data: thread, error: threadError }, { data: messages, error: messagesError }, { data: attachments, error: attachmentsError }] = await Promise.all([
    supabase.from("assistant_threads").select("*").eq("id", id).single(),
    supabase.from("assistant_messages").select("*").eq("thread_id", id).order("created_at"),
    supabase.from("assistant_attachments").select("id, message_id, asset_id, media_assets(*)").eq("thread_id", id).order("created_at"),
  ]);
  if (threadError) throw threadError;
  if (messagesError) throw messagesError;
  if (attachmentsError) throw attachmentsError;
  return { thread, messages: messages ?? [], attachments: attachments ?? [] };
}

export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}