// Pluggable AI model registry. Self-hosted entries connect to the owner's own
// inference server (URL saved per model in `model_endpoints`). The UI only
// reads from this list, so swapping or adding models never requires a rebuild.

export type ModelTask = "chat" | "image" | "image_edit" | "docs" | "slides" | "tts" | "enhance" | "avatar" | "transcribe" | "translate" | "compose";

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
  /** One-line install command (Docker or Ollama) shown in the guide. */
  setup?: string;
}

export const TASK_LABELS: Record<ModelTask, string> = {
  chat: "مساعد الكتابة والأعمال العامة",
  image: "توليد صور احترافية من نص",
  image_edit: "تعديل الصور",
  docs: "تحويل المستندات بين الصيغ",
  slides: "العروض التقديمية",
  tts: "تحويل النص إلى صوت واستنساخ الصوت",
  enhance: "تنقية وتحسين الصوت",
  avatar: "تحريك الوجه ومزامنة الشفاه",
  transcribe: "تفريغ الصوت إلى نص",
  translate: "الترجمة",
  compose: "تركيب الفيديو",
};

const S = { status: "planned" as const, selfHosted: true };

export const AI_MODELS: AiModel[] = [
  { id: "openai/gpt-6-astra", task: "chat", name: "مساعد عبقرينو", description: "إجابة الأسئلة وكتابة السكربتات والإعلانات والمقالات", source: "Lovable AI", status: "ready" },
  { id: "qwen3-8b", task: "chat", name: "Qwen3-8B", description: "مساعد قوي بالعربية والإنجليزية للكتابة والتسويق", source: "Qwen", ...S, defaultUrl: "http://localhost:11434", vram: "8GB", repo: "https://ollama.com/library/qwen3", setup: "ollama run qwen3:8b" },
  { id: "qwen3-32b", task: "chat", name: "Qwen3-32B", description: "نسخة أقوى للتحليل والخطط وكتابة التقارير الطويلة", source: "Qwen", ...S, defaultUrl: "http://localhost:11434", vram: "24GB", repo: "https://ollama.com/library/qwen3", setup: "ollama run qwen3:32b" },
  { id: "llama3.3-70b", task: "chat", name: "Llama 3.3 70B", description: "نموذج عام قوي جدًا للأعمال والبحث", source: "Meta", ...S, defaultUrl: "http://localhost:11434", vram: "48GB", repo: "https://ollama.com/library/llama3.3", setup: "ollama run llama3.3" },
  { id: "deepseek-r1", task: "chat", name: "DeepSeek-R1 14B", description: "تفكير منطقي، حسابات، برمجة وحل المشكلات", source: "DeepSeek", ...S, defaultUrl: "http://localhost:11434", vram: "12GB", repo: "https://ollama.com/library/deepseek-r1", setup: "ollama run deepseek-r1:14b" },
  { id: "gemma3-12b", task: "chat", name: "Gemma 3 12B", description: "يفهم الصور والنصوص، ممتاز لقراءة الفواتير والمستندات المصورة", source: "Google", ...S, defaultUrl: "http://localhost:11434", vram: "10GB", repo: "https://ollama.com/library/gemma3", setup: "ollama run gemma3:12b" },
  { id: "flux-schnell", task: "image", name: "FLUX.1 schnell", description: "صور احترافية واقعية بسرعة عالية من وصف نصي", source: "Black Forest Labs", ...S, defaultUrl: "http://localhost:8188", vram: "12GB", repo: "https://github.com/comfyanonymous/ComfyUI", setup: "docker run --gpus all -p 8188:8188 yanwk/comfyui-boot:cu124" },
  { id: "sdxl", task: "image", name: "Stable Diffusion XL", description: "صور فنية وإعلانية بأنماط لا حصر لها", source: "Stability AI", ...S, defaultUrl: "http://localhost:7862", vram: "8GB", repo: "https://github.com/AUTOMATIC1111/stable-diffusion-webui" },
  { id: "qwen-image", task: "image", name: "Qwen-Image", description: "توليد صور تحتوي كتابة عربية وإنجليزية واضحة (بوسترات وإعلانات)", source: "Qwen", ...S, defaultUrl: "http://localhost:8188", vram: "24GB", repo: "https://github.com/QwenLM/Qwen-Image" },
  { id: "qwen-image-edit", task: "image_edit", name: "Qwen-Image-Edit", description: "عدّل الصورة بكلمات: غيّر الخلفية، أضف نصًا، بدّل الألوان", source: "Qwen", ...S, defaultUrl: "http://localhost:8188", vram: "24GB", repo: "https://github.com/QwenLM/Qwen-Image" },
  { id: "flux-kontext", task: "image_edit", name: "FLUX.1 Kontext", description: "تعديل احترافي مع الحفاظ على ملامح الشخص", source: "Black Forest Labs", ...S, defaultUrl: "http://localhost:8188", vram: "16GB", repo: "https://github.com/comfyanonymous/ComfyUI" },
  { id: "rembg", task: "image_edit", name: "Rembg", description: "إزالة خلفية الصور بضغطة", source: "danielgatis", ...S, defaultUrl: "http://localhost:7000", vram: "بدون GPU", repo: "https://github.com/danielgatis/rembg", setup: "docker run -p 7000:7000 danielgatis/rembg s" },
  { id: "real-esrgan", task: "image_edit", name: "Real-ESRGAN", description: "رفع دقة الصور القديمة أو الضعيفة 4 أضعاف", source: "xinntao", ...S, defaultUrl: "http://localhost:7001", vram: "2GB", repo: "https://github.com/xinntao/Real-ESRGAN" },
  { id: "gotenberg", task: "docs", name: "Gotenberg (LibreOffice)", description: "تحويل Word وExcel وPowerPoint وHTML إلى PDF", source: "Gotenberg", ...S, defaultUrl: "http://localhost:3000", vram: "بدون GPU", repo: "https://gotenberg.dev", setup: "docker run -p 3000:3000 gotenberg/gotenberg:8" },
  { id: "docling", task: "docs", name: "Docling", description: "تحويل PDF والصور إلى Word أو نص قابل للتعديل مع الجداول", source: "IBM", ...S, defaultUrl: "http://localhost:5001", vram: "بدون GPU", repo: "https://github.com/docling-project/docling-serve", setup: "docker run -p 5001:5001 quay.io/docling-project/docling-serve" },
  { id: "stirling-pdf", task: "docs", name: "Stirling PDF", description: "دمج وتقسيم وضغط وتوقيع PDF وأكثر من 50 أداة", source: "Stirling", ...S, defaultUrl: "http://localhost:8080", vram: "بدون GPU", repo: "https://github.com/Stirling-Tools/Stirling-PDF", setup: "docker run -p 8080:8080 frooodle/s-pdf" },
  { id: "presenton", task: "slides", name: "Presenton", description: "عرض تقديمي كامل بالتصميم من موضوع واحد، يصدّر PowerPoint وPDF", source: "Presenton", ...S, defaultUrl: "http://localhost:5000", vram: "يستخدم Qwen", repo: "https://github.com/presenton/presenton", setup: "docker run -p 5000:80 ghcr.io/presenton/presenton:latest" },
  { id: "marp", task: "slides", name: "Marp", description: "تحويل نص منسق إلى شرائح أنيقة بسرعة", source: "Marp", ...S, defaultUrl: "http://localhost:5050", vram: "بدون GPU", repo: "https://github.com/marp-team/marp-cli" },
  { id: "xtts-v2", task: "tts", name: "XTTS-v2", description: "استنساخ صوتك من عينة 10 ثوانٍ وتوليد كلام عربي طبيعي", source: "Coqui", ...S, defaultUrl: "http://localhost:8020", vram: "6GB", repo: "https://github.com/daswer123/xtts-api-server" },
  { id: "resemble-enhance", task: "enhance", name: "Resemble Enhance", description: "إزالة الضوضاء ورفع جودة التسجيل إلى مستوى بودكاست مع الحفاظ على هوية الصوت", source: "Resemble AI", ...S, defaultUrl: "http://localhost:8030", vram: "4GB", repo: "https://github.com/resemble-ai/resemble-enhance" },
  { id: "sadtalker", task: "avatar", name: "SadTalker", description: "تحريك صورة ثابتة لتتكلم بتزامن مع الصوت", source: "OpenTalker", ...S, defaultUrl: "http://localhost:7860", vram: "6GB", repo: "https://github.com/OpenTalker/SadTalker" },
  { id: "wav2lip", task: "avatar", name: "Wav2Lip", description: "مزامنة دقيقة لحركة الشفاه", source: "Rudrabha", ...S, defaultUrl: "http://localhost:7861", vram: "4GB", repo: "https://github.com/Rudrabha/Wav2Lip" },
  { id: "whisper", task: "transcribe", name: "Whisper large-v3", description: "تفريغ الصوت إلى ترجمة نصية بتوقيت كل كلمة", source: "OpenAI (مفتوح)", ...S, defaultUrl: "http://localhost:9000", vram: "6GB", repo: "https://github.com/ahmetoner/whisper-asr-webservice", setup: "docker run --gpus all -p 9000:9000 onerahmet/openai-whisper-asr-webservice:latest-gpu" },
  { id: "nllb", task: "translate", name: "NLLB-200", description: "ترجمة بين أكثر من 200 لغة منها العربية", source: "Meta", ...S, defaultUrl: "http://localhost:6060", vram: "4GB", repo: "https://github.com/facebookresearch/fairseq/tree/nllb" },
  { id: "libretranslate", task: "translate", name: "LibreTranslate", description: "ترجمة خفيفة تعمل بدون كرت شاشة", source: "LibreTranslate", ...S, defaultUrl: "http://localhost:5002", vram: "بدون GPU", repo: "https://github.com/LibreTranslate/LibreTranslate", setup: "docker run -p 5002:5000 libretranslate/libretranslate" },
  { id: "ffmpeg", task: "compose", name: "FFmpeg", description: "دمج الصوت والفيديو وحرق الترجمة بالخطوط والألوان", source: "FFmpeg", ...S, defaultUrl: "http://localhost:8090", vram: "بدون GPU", repo: "https://ffmpeg.org" },
];

export const activeModel = (task: ModelTask) => AI_MODELS.find((m) => m.task === task && m.status === "ready");

export const modelsFor = (task: ModelTask) => AI_MODELS.filter((m) => m.task === task);
