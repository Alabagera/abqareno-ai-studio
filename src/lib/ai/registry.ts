// Pluggable AI model registry. Phase 2 connects each entry to a real backend
// (self-hosted open-source models). The UI only reads from this list, so
// swapping or adding models never requires rebuilding the site.

export type ModelTask = "tts" | "avatar" | "transcribe" | "translate" | "compose";

export interface AiModel {
  id: string;
  task: ModelTask;
  name: string;
  description: string;
  source: string;
  status: "planned" | "ready";
}

export const TASK_LABELS: Record<ModelTask, string> = {
  tts: "تحويل النص إلى صوت",
  avatar: "تحريك الوجه",
  transcribe: "تفريغ الصوت إلى نص",
  translate: "الترجمة",
  compose: "تركيب الفيديو",
};

export const AI_MODELS: AiModel[] = [
  { id: "xtts-v2", task: "tts", name: "XTTS-v2", description: "استنساخ صوتك من عينة قصيرة وتوليد كلام طبيعي بالعربية", source: "Coqui", status: "planned" },
  { id: "sadtalker", task: "avatar", name: "SadTalker", description: "تحريك صورة ثابتة لتتكلم بتزامن مع الصوت", source: "OpenTalker", status: "planned" },
  { id: "wav2lip", task: "avatar", name: "Wav2Lip", description: "مزامنة دقيقة لحركة الشفاه", source: "Rudrabha", status: "planned" },
  { id: "whisper", task: "transcribe", name: "Whisper", description: "تفريغ تلقائي للصوت إلى ترجمة نصية بتوقيت", source: "OpenAI (مفتوح)", status: "planned" },
  { id: "nllb", task: "translate", name: "NLLB-200", description: "ترجمة بين أكثر من 200 لغة", source: "Meta", status: "planned" },
  { id: "ffmpeg", task: "compose", name: "FFmpeg", description: "دمج الصوت والفيديو وحرق الترجمة بالخطوط والألوان", source: "FFmpeg", status: "planned" },
];

export const modelsFor = (task: ModelTask) => AI_MODELS.filter((m) => m.task === task);
