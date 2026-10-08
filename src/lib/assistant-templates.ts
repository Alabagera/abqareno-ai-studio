import type { AssistantMode } from "@/lib/assistant";

// Ready-made prompts. `modelId` is the best model for the job; the assistant
// switches to it automatically when the user is allowed to use it.
export interface AssistantTemplate { label: string; mode: AssistantMode; modelId: string; prompt: string }

const G = "openai/gpt-6-astra";

export const ASSISTANT_TEMPLATES: AssistantTemplate[] = [
  { label: "ملف PDF احترافي", mode: "general", modelId: G, prompt: "أنشئ مستند PDF احترافيًا بألوان أزرق داكن وذهبي عن: " },
  { label: "عرض PowerPoint", mode: "general", modelId: G, prompt: "أنشئ عرض PowerPoint من 8 شرائح بألوان (اكتب الألوان) عن: " },
  { label: "ملف Word رسمي", mode: "general", modelId: G, prompt: "اكتب خطابًا/تقريرًا رسميًا بصيغة Word منسقًا عن: " },
  { label: "جدول Excel", mode: "documents", modelId: G, prompt: "أنشئ جدول Excel منظمًا بالأعمدة والبيانات لـ: " },
  { label: "سكربت فيديو قصير", mode: "general", modelId: G, prompt: "اكتب سكربت فيديو قصير (60 ثانية) جذاب عن: " },
  { label: "إعلان سوشيال", mode: "general", modelId: G, prompt: "اكتب 3 نسخ إعلانية قصيرة لإنستجرام وتيك توك لمنتج: " },
  { label: "مقال احترافي", mode: "general", modelId: "qwen3-32b", prompt: "اكتب مقالًا احترافيًا منظمًا بعناوين عن: " },
  { label: "خطة عمل", mode: "general", modelId: "llama3.3-70b", prompt: "أعد خطة عمل كاملة (السوق، المنافسين، التكاليف، التسويق) لمشروع: " },
  { label: "خطة تسويق شهرية", mode: "general", modelId: "qwen3-8b", prompt: "ضع خطة محتوى تسويقي لمدة 30 يومًا لـ: " },
  { label: "حل مسألة / حساب", mode: "general", modelId: "deepseek-r1", prompt: "حل هذه المسألة خطوة بخطوة مع الشرح: " },
  { label: "قراءة فاتورة أو صورة", mode: "documents", modelId: "gemma3-12b", prompt: "اقرأ الصورة المرفقة واستخرج كل البيانات في جدول." },
  { label: "تلخيص مستند", mode: "documents", modelId: "mistral-small-3.1", prompt: "لخّص المستند المرفق في نقاط واضحة مع أهم الأرقام." },
  { label: "تقرير من ملف Excel", mode: "documents", modelId: G, prompt: "حلّل الملف المرفق وأنشئ تقريرًا بالنتائج والتوصيات." },
  { label: "ترجمة نص طويل", mode: "translate", modelId: "qwen3-32b", prompt: "ترجم النص التالي إلى الإنجليزية مع الحفاظ على التنسيق:\n" },
  { label: "ترجمة إلى العربية", mode: "translate", modelId: G, prompt: "ترجم النص التالي إلى العربية الفصحى بأسلوب طبيعي:\n" },
  { label: "ترجمة ترجمات فيديو", mode: "translate", modelId: G, prompt: "ترجم ملف الترجمة المرفق (SRT) إلى العربية مع حفظ التوقيتات." },
  { label: "موقع ويب كامل", mode: "code", modelId: "qwen3-coder-30b", prompt: "ابنِ موقعًا كاملًا (HTML/CSS/JS) متجاوبًا لـ: " },
  { label: "تطبيق جوال", mode: "code", modelId: "devstral-small", prompt: "صمم وابنِ تطبيق جوال (React Native) لـ: " },
  { label: "لعبة متصفح", mode: "code", modelId: "qwen3-coder-30b", prompt: "اصنع لعبة متصفح كاملة بملف HTML واحد فكرتها: " },
  { label: "إصلاح كود", mode: "code", modelId: "deepseek-r1", prompt: "اكتشف الخطأ في هذا الكود وأصلحه مع الشرح:\n" },
  { label: "كورس تدريبي كامل", mode: "course", modelId: "qwen3-32b", prompt: "أنشئ كورسًا تدريبيًا كاملًا من الصفر عن: " },
  { label: "اختبار وأسئلة", mode: "course", modelId: G, prompt: "أنشئ اختبارًا من 20 سؤالًا مع الإجابات عن: " },
  { label: "وصف صورة احترافي", mode: "general", modelId: G, prompt: "اكتب وصفًا (prompt) احترافيًا بالإنجليزية لتوليد صورة إعلانية عن: " },
  { label: "بوستر بنص عربي", mode: "general", modelId: G, prompt: "اكتب فكرة ونص بوستر إعلاني عربي جذاب ووصفًا لتصميمه عن: " },
  { label: "تعديل صورة", mode: "general", modelId: G, prompt: "اقترح تعديلات احترافية على الصورة المرفقة (الخلفية، الألوان، النص)." },
  { label: "عرض تقديمي", mode: "general", modelId: "qwen3-32b", prompt: "أنشئ محتوى عرض تقديمي من 10 شرائح (عنوان ونقاط وملاحظات) عن: " },
  { label: "تفريغ وتلخيص اجتماع", mode: "documents", modelId: G, prompt: "لخّص نص الاجتماع التالي واستخرج المهام والمسؤوليات:\n" },
  { label: "تعليق صوتي بلهجة", mode: "general", modelId: G, prompt: "اكتب نص تعليق صوتي باللهجة السودانية لفيديو عن: " },
];
