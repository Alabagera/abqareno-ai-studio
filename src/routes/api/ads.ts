import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authVoice, linkedEndpoint } from "@/lib/voice-backend.server";
import { AI_MODELS } from "@/lib/ai/registry";

const schema = z.object({
  action: z.enum(["text", "image", "video"]), idea: z.string().trim().min(1).max(12000), modelId: z.string().max(100),
  width: z.number().int().min(256).max(4096), height: z.number().int().min(256).max(4096), duration: z.number().int().min(3).max(180),
  workflow: z.record(z.unknown()).optional(),
  previous: z.string().max(60000).optional(), revision: z.string().trim().max(4000).optional(),
});

// Strongest-first order used when the client asks for automatic model choice.
const PRIORITY: Record<string, string[]> = {
  chat: ["llama3.3-70b", "qwen3-32b", "gpt-oss-20b", "mistral-small-3.1", "qwen3-coder-30b", "gemma3-12b", "deepseek-r1", "qwen3-8b", "phi4", "devstral-small"],
  image: ["qwen-image", "flux-schnell", "sd3.5", "sdxl"],
  video: ["wan2.2", "hunyuan-video", "skyreels-v2", "ltx-video", "cogvideox", "framepack", "animatediff", "svd"],
};

export const Route = createFileRoute("/api/ads")({ server: { handlers: { POST: async ({ request }) => {
  const auth = await authVoice(request);
  if (!auth) return new Response("يلزم تسجيل الدخول", { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("أدخل فكرة ومقاسات صحيحة", { status: 400 });
  const data = parsed.data;
  const task = data.action === "text" ? "chat" : data.action;
  const { data: access, error: accessError } = await auth.sb.rpc("my_workspace_access");
  const permissions = access as Record<string, unknown> | null;
  if (accessError || !(permissions?.["ads"] === true || (permissions?.["ads"] === undefined && permissions?.["studio"] === true))) return new Response("لا تملك صلاحية الإعلانات", { status: 403 });
  const allowed = (id: string) => !Array.isArray(permissions["allowed_models"]) || permissions["allowed_models"].includes(id);
  let model = AI_MODELS.find((m) => m.id === data.modelId && m.task === task && m.selfHosted);
  let endpoint: Awaited<ReturnType<typeof linkedEndpoint>> = null;
  if (data.modelId === "auto") {
    const ids = [...(PRIORITY[task] ?? []), ...AI_MODELS.filter((m) => m.task === task && m.selfHosted).map((m) => m.id)];
    // Without an uploaded graph only SDXL can draw images directly.
    const order = data.action === "image" && !data.workflow ? ["sdxl"] : [...new Set(ids)];
    for (const id of order) {
      const candidate = AI_MODELS.find((m) => m.id === id && m.task === task && m.selfHosted);
      if (!candidate || !allowed(id)) continue;
      const linked = await linkedEndpoint(auth.sb, auth.userId, id);
      if (linked) { model = candidate; endpoint = linked; break; }
    }
    if (!model) return new Response(data.action === "image" && !data.workflow ? "اربط Stable Diffusion XL أو أرفق مخطط صورة لنموذج مربوط. لم تُستخدم خدمة مدفوعة." : "لا يوجد نموذج مربوط بسيرفرك لهذا النوع. لم تُستخدم خدمة مدفوعة.", { status: 409 });
  }
  if (!model) return new Response("اختر نموذجًا مفتوحًا مناسبًا", { status: 400 });
  if (!allowed(model.id)) return new Response("النموذج غير مسموح لحسابك", { status: 403 });
  endpoint ??= await linkedEndpoint(auth.sb, auth.userId, model.id);
  if (data.revision && data.action !== "text") data.idea = `${data.idea}\nالتعديل المطلوب: ${data.revision}`;
  if (!endpoint) return new Response("اربط هذا النموذج بسيرفرك من صفحة النماذج أولًا. لم تُستخدم خدمة مدفوعة.", { status: 409 });
  if (data.action === "image" && model.id !== "sdxl" && !data.workflow) return new Response("أرفق مخطط ComfyUI بصيغة API لتوليد الصورة بهذا النموذج.", { status: 409 });
  if (data.action === "video" && !data.workflow) return new Response("أرفق مخطط الفيديو من ComfyUI بصيغة API أولًا؛ يجب أن يدعم المدة المختارة.", { status: 409 });
  const headers: Record<string, string> = endpoint.token ? { Authorization: `Bearer ${endpoint.token}` } : {};
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({ start: async (controller) => {
    let closed = false;
    const emit = (event: Record<string, unknown>) => { if (!closed) { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`)); } catch { closed = true; } } };
    try {
      if (data.action === "text") {
        const response = await fetch(`${endpoint.url}/v1/chat/completions`, { method: "POST", signal: request.signal, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ model: model.setup?.split(" ").pop() ?? model.id, stream: true, messages: [
          { role: "system", content: "أنت متخصص إعلانات. اكتب بالعربية أو لغة الفكرة: نص إعلان جاهز، عنوان، دعوة للفعل، سيناريو فيديو بالثواني، وصف صورة، تحليل وضوح العرض وقوة الرسالة، الجمهور المحتمل والمنصات المناسبة مع أسباب، اختبارات A/B ونصائح ومقاييس نجاح. لا تختلق فوائد أو أسعارًا أو بيانات سوق أو نتائج مضمونة؛ صرّح بالافتراضات، واطلب المعلومات الناقصة. لا تذكر أسماء النماذج." },
          { role: "user", content: `${data.idea}\nمدة الفيديو: ${data.duration} ثانية. المقاس: ${data.width}×${data.height}.` },
          ...(data.revision && data.previous ? [{ role: "assistant", content: data.previous }, { role: "user", content: `عدّل الإعلان السابق حسب الطلب التالي وأعد كتابته كاملًا: ${data.revision}` }] : []),
        ] }) });
        if (!response.ok || !response.body) throw new Error(`سيرفر المساعد أعاد خطأ ${response.status}؛ لم تُستخدم خدمة مدفوعة.`);
        const reader = response.body.getReader(); const dec = new TextDecoder(); let buffer = "", answer = "";
        for (;;) {
          const chunk = await reader.read(); if (chunk.done) break;
          buffer += dec.decode(chunk.value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim(); if (!raw || raw === "[DONE]") continue;
            const event = JSON.parse(raw) as { choices?: { delta?: { content?: string } }[] };
            const text = event.choices?.[0]?.delta?.content;
            if (text) { answer += text; emit({ type: "text", text }); }
          }
        }
        if (!answer.trim()) throw new Error("لم يصل نص من النموذج");
      } else {
        let blob: Blob;
        if (data.action === "image" && model.id === "sdxl" && !data.workflow) {
          emit({ type: "progress", text: "جارٍ تصميم الصورة…" });
          const result = await fetch(`${endpoint.url}/sdapi/v1/txt2img`, { method: "POST", signal: request.signal, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: data.idea, width: data.width, height: data.height, steps: 25, batch_size: 1 }) });
          if (!result.ok) throw new Error(`سيرفر الصورة أعاد خطأ ${result.status}`);
          const json = await result.json() as { images?: string[] }; const image = json.images?.[0];
          if (!image) throw new Error("لم ينتج السيرفر صورة");
          const bytes = Uint8Array.from(atob(image.replace(/^data:[^,]+,/, "")), (c) => c.charCodeAt(0));
          blob = new Blob([bytes], { type: "image/png" });
        } else {
          // Use an owner-supplied API graph, not guessed model-specific nodes.
          const replace = (value: unknown): unknown => {
            if (value === "{{width}}") return data.width;
            if (value === "{{height}}") return data.height;
            if (value === "{{seconds}}") return data.duration;
            if (value === "{{frames}}") return data.duration * 24 + 1;
            if (typeof value === "string") return value.replaceAll("{{idea}}", data.idea);
            if (Array.isArray(value)) return value.map(replace);
            if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, replace(v)]));
            return value;
          };
          const submit = await fetch(`${endpoint.url}/prompt`, { method: "POST", signal: request.signal, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: replace(data.workflow) }) });
          if (!submit.ok) throw new Error(`مخطط ComfyUI غير صالح أو السيرفر أعاد ${submit.status}`);
          const { prompt_id: id } = await submit.json() as { prompt_id?: string };
          if (!id) throw new Error("لم يبدأ النموذج عملية التوليد");
          emit({ type: "progress", text: "جارٍ التوليد على سيرفرك…" });
          type OutputFile = { filename: string; subfolder?: string; type?: string };
          let file: OutputFile | undefined;
          while (!file && !request.signal.aborted && !closed) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const historyResponse = await fetch(`${endpoint.url}/history/${encodeURIComponent(id)}`, { headers, signal: request.signal });
            if (!historyResponse.ok) throw new Error("تعذر متابعة عملية التوليد");
            const history = await historyResponse.json() as Record<string, { status?: { status_str?: string }; outputs?: Record<string, { images?: OutputFile[]; gifs?: OutputFile[]; videos?: OutputFile[] }> }>;
            const job = history[id];
            if (job?.status?.status_str === "error") throw new Error("فشل المخطط على سيرفرك؛ راجع الذاكرة وإعدادات النموذج");
            for (const output of Object.values(job?.outputs ?? {})) {
              const files = data.action === "image" ? output.images : [...(output.videos ?? []), ...(output.gifs ?? [])];
              file = files?.find((f) => f && (data.action === "image" || /\.(mp4|webm)$/i.test(f.filename)));
              if (file) break;
            }
            if (job?.status?.status_str === "success" && !file) throw new Error("المخطط انتهى دون ملف مناسب؛ أضف عقدة حفظ صورة أو MP4 للفيديو.");
            emit({ type: "progress", text: "التوليد مستمر على سيرفرك…" });
          }
          if (!file) return;
          const query = new URLSearchParams({ filename: file.filename, subfolder: file.subfolder ?? "", type: file.type ?? "output" });
          const result = await fetch(`${endpoint.url}/view?${query}`, { signal: request.signal, headers });
          if (!result.ok) throw new Error("تعذر تنزيل الناتج من سيرفرك");
          blob = await result.blob();
        }
        if (blob.size > 20 * 1024 * 1024) throw new Error("الناتج أكبر من حد المكتبة 20 ميجابايت؛ نزّله مباشرة من سيرفرك أو قلّل الجودة.");
        const { data: ownerId } = await auth.sb.rpc("workspace_owner_id", { _user_id: auth.userId });
        if (!ownerId) throw new Error("تعذر تحديد مساحة العمل");
        const ext = data.action === "image" ? "png" : blob.type.includes("webm") ? "webm" : "mp4";
        const name = `إعلان-${Date.now()}.${ext}`; const path = `${ownerId}/${data.action}/${crypto.randomUUID()}.${ext}`;
        const uploaded = await auth.sb.storage.from("media").upload(path, blob, { contentType: data.action === "image" ? "image/png" : `video/${ext}` });
        if (uploaded.error) throw uploaded.error;
        const saved = await auth.sb.from("media_assets").insert({ name, kind: data.action, storage_path: path, mime_type: data.action === "image" ? "image/png" : `video/${ext}`, size_bytes: blob.size });
        if (saved.error) throw saved.error;
        const signed = await auth.sb.storage.from("media").createSignedUrl(path, 3600);
        if (!signed.data?.signedUrl) throw new Error("تم الحفظ لكن تعذر فتح الناتج");
        emit({ type: "asset", kind: data.action, path, name, url: signed.data.signedUrl });
      }
      emit({ type: "done", model: model.id });
    } catch (error) { if (!request.signal.aborted) emit({ type: "error", message: error instanceof Error ? error.message : "تعذر إنشاء الإعلان" }); }
    finally { if (!closed) { try { controller.close(); } catch { /* browser closed */ } } }
  } });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
} } } });