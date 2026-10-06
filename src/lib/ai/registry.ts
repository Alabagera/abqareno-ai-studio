// Pluggable AI model registry. Self-hosted entries connect to the owner's own
// inference server (URL saved per model in `model_endpoints`). The UI only
// reads from this list, so swapping or adding models never requires a rebuild.

export type ModelTask = "chat" | "tts" | "enhance" | "avatar" | "transcribe" | "translate" | "compose";

export interface AiModel {
  id: string;
  task: ModelTask;
  name: string;
  description: string;
  source: string;
  status: "planned" | "ready";
  selfHosted?: boolean;
  /** Suggested local address when running on the owner's own computer. */
  defaultUrl?: string;
  /** Minimum graphics-card memory, for the setup guide. */
  vram?: string;
  repo?: string;
}

export const TASK_LABELS: Record<ModelTask, string> = {
  chat: "مساعد الكتابة والمحادثة",
  tts: "تحويل النص إلى صوت واستنساخ الصوت",
  enhance: "تنقية وتحسين الصوت",
  avatar: "تحريك الوجه ومزامنة الشفاه",
  transcribe: "تفريغ الصوت إلى نص",
  translate: "الترجمة",
  compose: "تركيب الفيديو",
};

export const AI_MODELS: AiModel[] = [
  { id: "openai/gpt-6-astra", task: "chat", name: "مساعد عبقرينو", description: "إجابة الأسئلة وكتابة السكربتات والإعلانات والمقالات", source: "Lovable AI", status: "ready" },
  { id: "qwen3-8b", task: "chat", name: "Qwen3-8B (Ollama)", description: "مساعد مفتوح قوي بالعربية والإنجليزية يعمل على جهازك", source: "Qwen", status: "planned", selfHosted: true, defaultUrl: "http://localhost:11434", vram: "8GB", repo: "https://ollama.com/library/qwen3" },
  { id: "xtts-v2", task: "tts", name: "XTTS-v2", description: "استنساخ صوتك من عينة 10 ثوانٍ وتوليد كلام عربي طبيعي", source: "Coqui", status: "planned", selfHosted: true, defaultUrl: "http://localhost:8020", vram: "6GB", repo: "https://github.com/daswer123/xtts-api-server" },
  { id: "resemble-enhance", task: "enhance", name: "Resemble Enhance", description: "إزالة الضوضاء ورفع جودة التسجيل إلى مستوى بودكاست مع الحفاظ على هوية الصوت", source: "Resemble AI", status: "planned", selfHosted: true, defaultUrl: "http://localhost:8030", vram: "4GB", repo: "https://github.com/resemble-ai/resemble-enhance" },
  { id: "sadtalker", task: "avatar", name: "SadTalker", description: "تحريك صورة ثابتة لتتكلم بتزامن مع الصوت", source: "OpenTalker", status: "planned", selfHosted: true, defaultUrl: "http://localhost:7860", vram: "6GB", repo: "https://github.com/OpenTalker/SadTalker" },
  { id: "wav2lip", task: "avatar", name: "Wav2Lip", description: "مزامنة دقيقة لحركة الشفاه", source: "Rudrabha", status: "planned", selfHosted: true, defaultUrl: "http://localhost:7861", vram: "4GB", repo: "https://github.com/Rudrabha/Wav2Lip" },
  { id: "whisper", task: "transcribe", name: "Whisper large-v3", description: "تفريغ الصوت إلى ترجمة نصية بتوقيت كل كلمة", source: "OpenAI (مفتوح)", status: "planned", selfHosted: true, defaultUrl: "http://localhost:9000", vram: "6GB", repo: "https://github.com/ahmetoner/whisper-asr-webservice" },
  { id: "nllb", task: "translate", name: "NLLB-200", description: "ترجمة بين أكثر من 200 لغة منها العربية", source: "Meta", status: "planned", selfHosted: true, defaultUrl: "http://localhost:6060", vram: "4GB", repo: "https://github.com/facebookresearch/fairseq/tree/nllb" },
  { id: "ffmpeg", task: "compose", name: "FFmpeg", description: "دمج الصوت والفيديو وحرق الترجمة بالخطوط والألوان", source: "FFmpeg", status: "planned", selfHosted: true, defaultUrl: "http://localhost:8090", vram: "بدون GPU", repo: "https://ffmpeg.org" },
];

export const activeModel = (task: ModelTask) => AI_MODELS.find((m) => m.task === task && m.status === "ready");

export const modelsFor = (task: ModelTask) => AI_MODELS.filter((m) => m.task === task);
