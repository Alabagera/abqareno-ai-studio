import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const bodySchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().trim().min(1).max(50000),
  mode: z.enum(["general", "translate", "code", "course", "documents"]),
  assetIds: z.array(z.string().uuid()).max(8).default([]),
});

const MODE_SYSTEM = {
  general: "أنت مساعد عبقرينو للأعمال والكتابة. قدّم إجابات عملية، دقيقة ومنظمة بالعربية ما لم يطلب المستخدم لغة أخرى.",
  translate: "أنت مترجم محترف للنصوص الطويلة. استنتج لغة المصدر، اسأل عن اللغة المستهدفة إن لم يحددها المستخدم، واحفظ المعنى والتنسيق والأسماء والمصطلحات. لا تختصر النص.",
  code: "أنت مهندس برمجيات خبير يبني تطبيقات ومواقع وألعاب من الوصف. أعط خطة ملفات واضحة ثم كودًا كاملًا قابلًا للنسخ، واذكر طريقة التشغيل والاختبار. لا تدّع تشغيل ما لم تشغله.",
  course: "أنت مصمم تعليمي محترف. أنشئ كورسات كاملة من الصفر تشمل الجمهور، الأهداف، الوحدات، الدروس، نصوص الشرح، الأنشطة، التمارين، الاختبارات، مفاتيح الإجابة وخطة التقديم.",
  documents: "أنت محلل مستندات دقيق. استخرج الحقائق، لخّص بوضوح، أنشئ جداول وتقارير، واذكر ما لم تتمكن من قراءته بدل التخمين.",
} as const;

function safeGatewayMessage(status: number, raw: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
    return parsed.error?.message || parsed.message || raw;
  } catch {
    return raw;
  }
}

export const Route = createFileRoute("/api/assistant")({
  server: { handlers: { POST: async ({ request }) => {
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!url || !key || !apiKey) return new Response("الخدمة غير مهيأة", { status: 500 });
    if (token.split(".").length !== 3) return new Response("يلزم تسجيل الدخول", { status: 401 });
    const sb = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await sb.auth.getUser(token);
    if (authError || !authData.user) return new Response("يلزم تسجيل الدخول", { status: 401 });
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return new Response("الطلب أو المرفقات غير صالحة", { status: 400 });
    const { threadId, content, mode, assetIds } = parsed.data;
    const { data: thread, error: threadError } = await sb.from("assistant_threads").select("id, title").eq("id", threadId).single();
    if (threadError || !thread) return new Response("المحادثة غير موجودة أو غير مسموحة", { status: 404 });

    const { data: userMessage, error: insertError } = await sb.from("assistant_messages").insert({ thread_id: threadId, role: "user", content, parts: [{ type: "text", text: content }] }).select("id").single();
    if (insertError || !userMessage) return new Response(insertError?.message ?? "تعذر حفظ الرسالة", { status: 500 });

    let assets: Array<{ id: string; name: string; mime_type: string | null; storage_path: string }> = [];
    if (assetIds.length) {
      const result = await sb.from("media_assets").select("id,name,mime_type,storage_path").in("id", assetIds);
      if (result.error) return new Response(result.error.message, { status: 400 });
      assets = result.data ?? [];
      const links = assets.map((asset) => ({ thread_id: threadId, message_id: userMessage.id, asset_id: asset.id }));
      const linked = await sb.from("assistant_attachments").insert(links);
      if (linked.error) return new Response(linked.error.message, { status: 400 });
    }

    const { data: history, error: historyError } = await sb.from("assistant_messages").select("role,content,id").eq("thread_id", threadId).order("created_at");
    if (historyError) return new Response(historyError.message, { status: 500 });
    const input: Array<Record<string, unknown>> = (history ?? []).slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
    const latestContent: Array<Record<string, unknown>> = [{ type: "input_text", text: content }];
    for (const asset of assets) {
      const signed = await sb.storage.from("media").createSignedUrl(asset.storage_path, 900);
      const signedUrl = signed.data?.signedUrl;
      if (!signedUrl) continue;
      if (asset.mime_type?.startsWith("image/")) latestContent.push({ type: "input_image", image_url: signedUrl });
      else if (asset.mime_type === "application/pdf") latestContent.push({ type: "input_file", filename: asset.name, file_url: signedUrl });
      else latestContent.push({ type: "input_text", text: `مرفق محفوظ في المكتبة: ${asset.name} (${asset.mime_type ?? "نوع غير معروف"}). أخبر المستخدم بوضوح إن كان محتواه غير قابل للقراءة مباشرة.` });
    }
    input.push({ role: "user", content: latestContent });

    try {
      const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST", signal: request.signal,
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({ model: "openai/gpt-6-astra", input: [{ role: "system", content: `${MODE_SYSTEM[mode]}\nادعم العربية والإنجليزية والنص المختلط. استخدم Markdown للعناوين والقوائم والجداول والأكواد.` }, ...input], stream: true, store: false, reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"] }),
      });
      if (!upstream.ok || !upstream.body) {
        const raw = await upstream.text();
        console.error("assistant gateway error", upstream.status, raw.slice(0, 500));
        return new Response(safeGatewayMessage(upstream.status, raw) || "تعذر الوصول إلى المساعد", { status: upstream.status });
      }
      let answer = "";
      let buffer = "";
      const decoder = new TextDecoder();
      const tap = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          controller.enqueue(chunk);
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            try { const event = JSON.parse(line.slice(5).trim()) as { type?: string; delta?: string }; if (event.type === "response.output_text.delta") answer += event.delta ?? ""; } catch { /* partial event */ }
          }
        },
        async flush() {
          if (answer.trim()) {
            const saved = await sb.from("assistant_messages").insert({ thread_id: threadId, role: "assistant", content: answer, parts: [{ type: "text", text: answer }] });
            if (saved.error) console.error("assistant persistence error", saved.error.message);
            const title = thread.title === "محادثة جديدة" ? content.slice(0, 55) : thread.title;
            await sb.from("assistant_threads").update({ title, mode, updated_at: new Date().toISOString() }).eq("id", threadId);
          }
        },
      });
      return new Response(upstream.body.pipeThrough(tap), { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
    } catch (error) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      throw error;
    }
  } } },
});