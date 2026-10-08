import { createFileRoute } from "@tanstack/react-router";
import { authVoice, linkedEndpoint } from "@/lib/voice-backend.server";
import { AI_MODELS } from "@/lib/ai/registry";

// Editor AI: create a new video or edit the selected one from text, using the
// owner's self-hosted ComfyUI video models only (never a paid service).
const PRIORITY = ["wan2.2", "hunyuan-video", "skyreels-v2", "ltx-video", "cogvideox", "framepack", "animatediff", "svd"];

export const Route = createFileRoute("/api/editor-ai")({ server: { handlers: { POST: async ({ request }) => {
  const auth = await authVoice(request);
  if (!auth) return new Response("يلزم تسجيل الدخول", { status: 401 });
  const form = await request.formData().catch(() => null);
  const prompt = String(form?.get("prompt") ?? "").trim().slice(0, 6000);
  const mode = form?.get("mode") === "edit" ? "edit" : "create";
  const history = String(form?.get("history") ?? "").slice(0, 8000);
  const width = Math.min(4096, Math.max(256, Number(form?.get("width")) || 1280));
  const height = Math.min(4096, Math.max(256, Number(form?.get("height")) || 720));
  const seconds = Math.min(60, Math.max(2, Number(form?.get("seconds")) || 5));
  const source = form?.get("video");
  let workflow: unknown;
  try { workflow = JSON.parse(String(form?.get("workflow") ?? "")); } catch { workflow = null; }
  if (!prompt) return new Response("اكتب ما تريد", { status: 400 });
  if (!workflow || typeof workflow !== "object") return new Response("أرفق مخطط فيديو ComfyUI بصيغة API أولًا. لم تُستخدم خدمة مدفوعة.", { status: 409 });
  if (mode === "edit" && !(source instanceof File && source.size)) return new Response("حدد مقطع فيديو لتعديله", { status: 400 });
  if (source instanceof File && source.size > 20 * 1024 * 1024) return new Response("المقطع أكبر من 20 ميجابايت؛ قصّه أولًا", { status: 400 });

  const { data: access } = await auth.sb.rpc("my_workspace_access");
  const perms = access as Record<string, unknown> | null;
  if (!(perms?.["editor"] === true || (perms?.["editor"] === undefined && perms?.["studio"] === true))) return new Response("لا تملك صلاحية المحرر", { status: 403 });
  const allowed = (id: string) => !Array.isArray(perms?.["allowed_models"]) || (perms["allowed_models"] as string[]).includes(id);
  const ids = [...new Set([...PRIORITY, ...AI_MODELS.filter((m) => (m.task === "video" || m.task === "video_edit") && m.selfHosted).map((m) => m.id)])];
  let endpoint: Awaited<ReturnType<typeof linkedEndpoint>> = null; let modelId = "";
  for (const id of ids) {
    if (!allowed(id) || !AI_MODELS.some((m) => m.id === id && m.selfHosted)) continue;
    const linked = await linkedEndpoint(auth.sb, auth.userId, id);
    if (linked) { endpoint = linked; modelId = id; break; }
  }
  if (!endpoint) return new Response("لا يوجد نموذج فيديو مربوط بسيرفرك بعد. اربطه من صفحة النماذج. لم تُستخدم خدمة مدفوعة.", { status: 409 });
  const ep = endpoint;
  const headers: Record<string, string> = ep.token ? { Authorization: `Bearer ${ep.token}` } : {};
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({ start: async (controller) => {
    const emit = (e: Record<string, unknown>) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch { /* closed */ } };
    try {
      let videoName = "";
      if (source instanceof File && source.size) {
        emit({ type: "progress", text: "جارٍ رفع المقطع إلى سيرفرك…" });
        const up = new FormData(); up.append("image", source, `abq-${Date.now()}.mp4`); up.append("overwrite", "true");
        const r = await fetch(`${ep.url}/upload/image`, { method: "POST", body: up, headers, signal: request.signal });
        if (!r.ok) throw new Error(`تعذر رفع المقطع إلى ComfyUI (${r.status})`);
        const j = (await r.json()) as { name?: string; subfolder?: string };
        videoName = j.subfolder ? `${j.subfolder}/${j.name}` : (j.name ?? "");
      }
      const idea = history ? `${history}\nالطلب الجديد: ${prompt}` : prompt;
      const replace = (v: unknown): unknown => {
        if (v === "{{width}}") return width; if (v === "{{height}}") return height; if (v === "{{seconds}}") return seconds; if (v === "{{frames}}") return seconds * 24 + 1;
        if (typeof v === "string") return v.replaceAll("{{idea}}", idea).replaceAll("{{video}}", videoName);
        if (Array.isArray(v)) return v.map(replace);
        if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replace(x)]));
        return v;
      };
      const submit = await fetch(`${ep.url}/prompt`, { method: "POST", signal: request.signal, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: replace(workflow) }) });
      if (!submit.ok) throw new Error(`المخطط غير صالح أو السيرفر أعاد ${submit.status}`);
      const { prompt_id: id } = (await submit.json()) as { prompt_id?: string };
      if (!id) throw new Error("لم تبدأ عملية التوليد");
      type F = { filename: string; subfolder?: string; type?: string };
      let file: F | undefined;
      while (!file && !request.signal.aborted) {
        await new Promise((r) => setTimeout(r, 2500));
        emit({ type: "progress", text: "التوليد مستمر على سيرفرك…" });
        const h = await fetch(`${ep.url}/history/${encodeURIComponent(id)}`, { headers, signal: request.signal });
        if (!h.ok) throw new Error("تعذر متابعة التوليد");
        const job = ((await h.json()) as Record<string, { status?: { status_str?: string }; outputs?: Record<string, { videos?: F[]; gifs?: F[] }> }>)[id];
        if (job?.status?.status_str === "error") throw new Error("فشل المخطط على سيرفرك");
        for (const o of Object.values(job?.outputs ?? {})) { file = [...(o.videos ?? []), ...(o.gifs ?? [])].find((f) => /\.(mp4|webm)$/i.test(f.filename)); if (file) break; }
        if (job?.status?.status_str === "success" && !file) throw new Error("انتهى المخطط دون ملف MP4");
      }
      if (!file) return;
      const res = await fetch(`${ep.url}/view?${new URLSearchParams({ filename: file.filename, subfolder: file.subfolder ?? "", type: file.type ?? "output" })}`, { headers, signal: request.signal });
      if (!res.ok) throw new Error("تعذر تنزيل الناتج");
      const blob = await res.blob();
      if (blob.size > 20 * 1024 * 1024) throw new Error("الناتج أكبر من 20 ميجابايت");
      const { data: ownerId } = await auth.sb.rpc("workspace_owner_id", { _user_id: auth.userId });
      const ext = /webm/i.test(file.filename) ? "webm" : "mp4";
      const path = `${ownerId}/video/${crypto.randomUUID()}.${ext}`; const name = `فيديو-ذكاء-${Date.now()}.${ext}`;
      const upl = await auth.sb.storage.from("media").upload(path, blob, { contentType: `video/${ext}` }); if (upl.error) throw upl.error;
      await auth.sb.from("media_assets").insert({ name, kind: "video", storage_path: path, mime_type: `video/${ext}`, size_bytes: blob.size });
      const signed = await auth.sb.storage.from("media").createSignedUrl(path, 3600);
      emit({ type: "asset", path, name, url: signed.data?.signedUrl ?? "", model: modelId });
    } catch (e) { if (!request.signal.aborted) emit({ type: "error", message: e instanceof Error ? e.message : "تعذر التوليد" }); }
    finally { try { controller.close(); } catch { /* closed */ } }
  } });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
} } } });
