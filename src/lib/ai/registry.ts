// Pluggable AI model registry. Phase 2 connects each entry to a real backend
// (self-hosted open-source models). The UI only reads from this list, so
// swapping or adding models never requires rebuilding the site.

export type ModelTask = "chat" | "tts" | "avatar" | "transcribe" | "translate" | "compose";

export interface AiModel {
  id: string;
  task: ModelTask;
  name: string;
  description: string;
  source: string;
  status: "planned" | "ready";
}

export const TASK_LABELS: Record<ModelTask, string> = {
  chat: "مساعد الكتابة والمحادثة",
  tts: "تحويل النص إلى صوت",
  avatar: "تحريك الوجه",
  transcribe: "تفريغ الصوت إلى نص",
  translate: "الترجمة",
  compose: "تركيب الفيديو",
};

export const AI_MODELS: AiModel[] = [
  { id: "openai/gpt-6-astra", task: "chat", name: "مساعد عبقرينو", description: "إجابة الأسئلة وكتابة السكربتات والإعلانات والمقالات", source: "Lovable AI", status: "ready" },
  { id: "llama-3.3", task: "chat", name: "Llama 3.3", description: "نموذج محادثة مفتوح المصدر — بديل يمكن تشغيله على سيرفرك", source: "Meta", status: "planned" },
  { id: "qwen-2.5", task: "chat", name: "Qwen 2.5", description: "نموذج مفتوح قوي في العربية", source: "Alibaba", status: "planned" },
  { id: "xtts-v2", task: "tts", name: "XTTS-v2", description: "استنساخ صوتك من عينة قصيرة وتوليد كلام طبيعي بالعربية", source: "Coqui", status: "planned" },
  { id: "sadtalker", task: "avatar", name: "SadTalker", description: "تحريك صورة ثابتة لتتكلم بتزامن مع الصوت", source: "OpenTalker", status: "planned" },
  { id: "wav2lip", task: "avatar", name: "Wav2Lip", description: "مزامنة دقيقة لحركة الشفاه", source: "Rudrabha", status: "planned" },
  { id: "whisper", task: "transcribe", name: "Whisper", description: "تفريغ تلقائي للصوت إلى ترجمة نصية بتوقيت", source: "OpenAI (مفتوح)", status: "planned" },
  { id: "nllb", task: "translate", name: "NLLB-200", description: "ترجمة بين أكثر من 200 لغة", source: "Meta", status: "planned" },
  { id: "ffmpeg", task: "compose", name: "FFmpeg", description: "دمج الصوت والفيديو وحرق الترجمة بالخطوط والألوان", source: "FFmpeg", status: "planned" },
];

export const activeModel = (task: ModelTask) => AI_MODELS.find((m) => m.task === task && m.status === "ready");

export const modelsFor = (task: ModelTask) => AI_MODELS.filter((m) => m.task === task);
export const modelsFor = (task: ModelTask) => AI_MODELS.filter((m) => m.task === task);
