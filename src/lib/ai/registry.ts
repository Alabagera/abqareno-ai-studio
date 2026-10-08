// Pluggable AI model registry. Self-hosted entries connect to the owner's own
// inference server (URL saved per model in `model_endpoints`). The UI only
// reads from this list, so swapping or adding models never requires a rebuild.

export type ModelTask = "chat" | "image" | "image_edit" | "video" | "video_edit" | "docs" | "slides" | "tts" | "enhance" | "avatar" | "transcribe" | "translate" | "music" | "vision" | "ocr" | "3d" | "compose";

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
  video: "صناعة فيديو بالذكاء الاصطناعي",
  video_edit: "تعديل وتحسين الفيديو",
  docs: "تحويل المستندات بين الصيغ",
  slides: "العروض التقديمية",
  tts: "تحويل النص إلى صوت واستنساخ الصوت",
  enhance: "تنقية وتحسين الصوت",
  avatar: "تحريك الوجه ومزامنة الشفاه",
  transcribe: "تفريغ الصوت إلى نص",
  translate: "الترجمة",
  music: "الموسيقى والمؤثرات الصوتية",
  vision: "فهم الصور وتحليلها",
  ocr: "قراءة النصوص من الصور والمستندات",
  "3d": "مجسمات ثلاثية الأبعاد",
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
  { id: "qwen3-coder-30b", task: "chat", name: "Qwen3-Coder 30B", description: "وكيل برمجة مفتوح لبناء التطبيقات والمواقع والألعاب وإصلاحها", source: "Qwen", ...S, defaultUrl: "http://localhost:11434", vram: "24GB", repo: "https://ollama.com/library/qwen3-coder", setup: "ollama run qwen3-coder:30b" },
  { id: "devstral-small", task: "chat", name: "Devstral Small", description: "برمجة المشاريع متعددة الملفات وفهم مستودعات الكود الكبيرة", source: "Mistral AI", ...S, defaultUrl: "http://localhost:11434", vram: "16GB", repo: "https://ollama.com/library/devstral", setup: "ollama run devstral:24b" },
  { id: "mistral-small-3.1", task: "chat", name: "Mistral Small 3.1", description: "كتابة وتحليل مستندات وصور وأعمال متعددة اللغات", source: "Mistral AI", ...S, defaultUrl: "http://localhost:11434", vram: "16GB", repo: "https://ollama.com/library/mistral-small3.1", setup: "ollama run mistral-small3.1" },
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
  { id: "madlad400", task: "translate", name: "MADLAD-400 10B", description: "ترجمة احترافية للنصوص الطويلة بين مئات اللغات مع تقسيم ذكي", source: "Google", ...S, defaultUrl: "http://localhost:6061", vram: "16GB", repo: "https://huggingface.co/google/madlad400-10b-mt" },
  { id: "seamless-m4t-v2", task: "translate", name: "SeamlessM4T v2", description: "ترجمة النص والصوت متعددة اللغات مع دعم العربية", source: "Meta", ...S, defaultUrl: "http://localhost:6062", vram: "12GB", repo: "https://github.com/facebookresearch/seamless_communication" },
  { id: "libretranslate", task: "translate", name: "LibreTranslate", description: "ترجمة خفيفة تعمل بدون كرت شاشة", source: "LibreTranslate", ...S, defaultUrl: "http://localhost:5002", vram: "بدون GPU", repo: "https://github.com/LibreTranslate/LibreTranslate", setup: "docker run -p 5002:5000 libretranslate/libretranslate" },
  { id: "wan2.2", task: "video", name: "Wan 2.2", description: "فيديو سينمائي واقعي من نص أو صورة بجودة 720p", source: "Alibaba Wan", ...S, defaultUrl: "http://localhost:8188", vram: "24GB", repo: "https://github.com/Wan-Video/Wan2.2" },
  { id: "hunyuan-video", task: "video", name: "HunyuanVideo", description: "فيديو عالي الجودة بحركة طبيعية من وصف نصي", source: "Tencent", ...S, defaultUrl: "http://localhost:8188", vram: "45GB", repo: "https://github.com/Tencent/HunyuanVideo" },
  { id: "ltx-video", task: "video", name: "LTX-Video", description: "أسرع نموذج فيديو مفتوح، مناسب للإعلانات القصيرة", source: "Lightricks", ...S, defaultUrl: "http://localhost:8188", vram: "12GB", repo: "https://github.com/Lightricks/LTX-Video" },
  { id: "cogvideox", task: "video", name: "CogVideoX-5B", description: "مقاطع فيديو من نص أو تحريك صورة", source: "THUDM", ...S, defaultUrl: "http://localhost:8188", vram: "12GB", repo: "https://github.com/THUDM/CogVideo" },
  { id: "framepack", task: "video", name: "FramePack", description: "تحريك صورة إلى فيديو طويل على كرت شاشة متوسط", source: "lllyasviel", ...S, defaultUrl: "http://localhost:7870", vram: "6GB", repo: "https://github.com/lllyasviel/FramePack" },
  { id: "svd", task: "video", name: "Stable Video Diffusion", description: "تحويل صورة ثابتة إلى مشهد متحرك قصير", source: "Stability AI", ...S, defaultUrl: "http://localhost:8188", vram: "12GB", repo: "https://github.com/Stability-AI/generative-models" },
  { id: "animatediff", task: "video", name: "AnimateDiff", description: "رسوم متحركة وأنماط فنية من نص", source: "guoyww", ...S, defaultUrl: "http://localhost:8188", vram: "8GB", repo: "https://github.com/guoyww/AnimateDiff" },
  { id: "skyreels-v2", task: "video", name: "SkyReels V2", description: "فيديوهات طويلة بأسلوب الأفلام والقصص", source: "Skywork", ...S, defaultUrl: "http://localhost:8188", vram: "24GB", repo: "https://github.com/SkyworkAI/SkyReels-V2" },
  { id: "rife", task: "video_edit", name: "RIFE", description: "تنعيم الحركة ورفع الفيديو إلى 60 إطارًا وتصوير بطيء", source: "hzwer", ...S, defaultUrl: "http://localhost:7002", vram: "2GB", repo: "https://github.com/hzwer/ECCV2022-RIFE" },
  { id: "video2x", task: "video_edit", name: "Video2X", description: "رفع دقة الفيديو القديم أو الضعيف حتى 4K", source: "k4yt3x", ...S, defaultUrl: "http://localhost:7003", vram: "4GB", repo: "https://github.com/k4yt3x/video2x" },
  { id: "rvm", task: "video_edit", name: "Robust Video Matting", description: "إزالة خلفية الفيديو بدون شاشة خضراء", source: "PeterL1n", ...S, defaultUrl: "http://localhost:7004", vram: "2GB", repo: "https://github.com/PeterL1n/RobustVideoMatting" },
  { id: "propainter", task: "video_edit", name: "ProPainter", description: "حذف الأشخاص والأشياء والعلامات المائية من الفيديو", source: "sczhou", ...S, defaultUrl: "http://localhost:7005", vram: "12GB", repo: "https://github.com/sczhou/ProPainter" },
  { id: "auto-editor", task: "video_edit", name: "Auto-Editor", description: "قص فترات الصمت تلقائيًا وتسريع المونتاج", source: "WyattBlue", ...S, defaultUrl: "http://localhost:7006", vram: "بدون GPU", repo: "https://github.com/WyattBlue/auto-editor" },
  { id: "liveportrait", task: "avatar", name: "LivePortrait", description: "تحريك تعابير الوجه بواقعية عالية", source: "Kuaishou", ...S, defaultUrl: "http://localhost:7863", vram: "6GB", repo: "https://github.com/KwaiVGI/LivePortrait" },
  { id: "latentsync", task: "avatar", name: "LatentSync", description: "مزامنة شفاه حديثة بجودة عالية", source: "ByteDance", ...S, defaultUrl: "http://localhost:7864", vram: "8GB", repo: "https://github.com/bytedance/LatentSync" },
  { id: "f5-tts", task: "tts", name: "F5-TTS", description: "استنساخ صوت سريع وطبيعي من عينة قصيرة", source: "SWivid", ...S, defaultUrl: "http://localhost:8021", vram: "4GB", repo: "https://github.com/SWivid/F5-TTS" },
  { id: "kokoro", task: "tts", name: "Kokoro", description: "نطق خفيف وواضح يعمل بدون كرت شاشة", source: "hexgrad", ...S, defaultUrl: "http://localhost:8880", vram: "بدون GPU", repo: "https://github.com/remsky/Kokoro-FastAPI", setup: "docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu" },
  { id: "musicgen", task: "music", name: "MusicGen", description: "موسيقى خلفية من وصف نصي", source: "Meta", ...S, defaultUrl: "http://localhost:7010", vram: "8GB", repo: "https://github.com/facebookresearch/audiocraft" },
  { id: "ace-step", task: "music", name: "ACE-Step", description: "أغانٍ كاملة بالكلمات واللحن", source: "ACE Studio", ...S, defaultUrl: "http://localhost:7011", vram: "8GB", repo: "https://github.com/ace-step/ACE-Step" },
  { id: "stable-audio-open", task: "music", name: "Stable Audio Open", description: "مؤثرات صوتية وأصوات بيئية للفيديو", source: "Stability AI", ...S, defaultUrl: "http://localhost:7012", vram: "8GB", repo: "https://huggingface.co/stabilityai/stable-audio-open-1.0" },
  { id: "demucs", task: "music", name: "Demucs", description: "فصل الصوت عن الموسيقى في أي مقطع", source: "Meta", ...S, defaultUrl: "http://localhost:7013", vram: "بدون GPU", repo: "https://github.com/facebookresearch/demucs" },
  { id: "qwen2.5-vl", task: "vision", name: "Qwen2.5-VL 7B", description: "يفهم الصور والفيديو ويصفها بالعربية", source: "Qwen", ...S, defaultUrl: "http://localhost:11434", vram: "8GB", repo: "https://ollama.com/library/qwen2.5vl", setup: "ollama run qwen2.5vl:7b" },
  { id: "florence-2", task: "vision", name: "Florence-2", description: "وصف الصور وتحديد الأشياء بخفة", source: "Microsoft", ...S, defaultUrl: "http://localhost:7020", vram: "2GB", repo: "https://huggingface.co/microsoft/Florence-2-large" },
  { id: "sam2", task: "vision", name: "SAM 2", description: "قص وتحديد أي عنصر في الصور والفيديو", source: "Meta", ...S, defaultUrl: "http://localhost:7021", vram: "4GB", repo: "https://github.com/facebookresearch/sam2" },
  { id: "paddleocr", task: "ocr", name: "PaddleOCR", description: "قراءة النصوص العربية والإنجليزية من الصور", source: "Baidu", ...S, defaultUrl: "http://localhost:7030", vram: "بدون GPU", repo: "https://github.com/PaddlePaddle/PaddleOCR" },
  { id: "surya", task: "ocr", name: "Surya OCR", description: "قراءة المستندات بتنسيقها والجداول بأكثر من 90 لغة", source: "datalab", ...S, defaultUrl: "http://localhost:7031", vram: "4GB", repo: "https://github.com/datalab-to/surya" },
  { id: "marker", task: "docs", name: "Marker", description: "تحويل PDF إلى نص منسق بدقة عالية", source: "datalab", ...S, defaultUrl: "http://localhost:7032", vram: "4GB", repo: "https://github.com/datalab-to/marker" },
  { id: "hunyuan3d-2", task: "3d", name: "Hunyuan3D-2", description: "مجسم ثلاثي الأبعاد ملوّن من صورة واحدة", source: "Tencent", ...S, defaultUrl: "http://localhost:7040", vram: "16GB", repo: "https://github.com/Tencent/Hunyuan3D-2" },
  { id: "triposr", task: "3d", name: "TripoSR", description: "مجسم سريع من صورة في ثوانٍ", source: "Stability AI", ...S, defaultUrl: "http://localhost:7041", vram: "6GB", repo: "https://github.com/VAST-AI-Research/TripoSR" },
  { id: "gpt-oss-20b", task: "chat", name: "gpt-oss 20B", description: "نموذج مفتوح قوي للتفكير والكتابة والأدوات", source: "OpenAI (مفتوح)", ...S, defaultUrl: "http://localhost:11434", vram: "16GB", repo: "https://ollama.com/library/gpt-oss", setup: "ollama run gpt-oss:20b" },
  { id: "phi4", task: "chat", name: "Phi-4 14B", description: "صغير وذكي في الرياضيات والمنطق", source: "Microsoft", ...S, defaultUrl: "http://localhost:11434", vram: "10GB", repo: "https://ollama.com/library/phi4", setup: "ollama run phi4" },
  { id: "sd3.5", task: "image", name: "Stable Diffusion 3.5", description: "صور عالية التفاصيل والتزام دقيق بالوصف", source: "Stability AI", ...S, defaultUrl: "http://localhost:8188", vram: "12GB", repo: "https://huggingface.co/stabilityai/stable-diffusion-3.5-large" },
  { id: "ffmpeg", task: "compose", name: "FFmpeg", description: "دمج الصوت والفيديو وحرق الترجمة بالخطوط والألوان", source: "FFmpeg", ...S, defaultUrl: "http://localhost:8090", vram: "بدون GPU", repo: "https://ffmpeg.org" },
];

export const activeModel = (task: ModelTask) => AI_MODELS.find((m) => m.task === task && m.status === "ready");

export const modelsFor = (task: ModelTask) => AI_MODELS.filter((m) => m.task === task);
