import { createFileRoute } from "@tanstack/react-router";
import { authVoice, linkedEndpoint, selfHostedOnly } from "@/lib/voice-backend.server";
import { z } from "zod";

// Professional spoken replies for the voice chat. Returns a complete WAV clip.
const body = z.object({ text: z.string().trim().min(1).max(1500), voice: z.string().max(30).default("Charon"), voiceProfileId: z.string().uuid().optional() });

export const Route = createFileRoute("/api/tts")({
  server: { handlers: { POST: async ({ request }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    const auth = await authVoice(request);
    if (!auth) return new Response("يلزم تسجيل الدخول", { status: 401 });
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return new Response("نص غير صالح", { status: 400 });
    const isAr = /[\u0600-\u06FF]/.test(parsed.data.text);
    // Self-hosted XTTS-v2 replaces the paid voice automatically once linked.
    const xtts = await linkedEndpoint(auth.sb, auth.userId, "xtts-v2");
    // Avatar voice from «هويتي»: cloned by XTTS from the saved sample (RLS-scoped read).
    let speaker = "abqarino";
    if (parsed.data.voiceProfileId) {
      if (!xtts) return new Response("صوت الأفاتار المحفوظ يحتاج ربط نموذج XTTS بسيرفرك؛ يُستخدم صوت جاهز مؤقتًا.", { status: 424 });
      const { data: prof } = await auth.sb.from("voice_profiles").select("primary_sample_asset_id,sample_asset_ids").eq("id", parsed.data.voiceProfileId).maybeSingle();
      const assetId = prof?.primary_sample_asset_id ?? prof?.sample_asset_ids?.[0];
      const { data: asset } = assetId ? await auth.sb.from("media_assets").select("storage_path").eq("id", assetId).maybeSingle() : { data: null };
      const signed = asset ? (await auth.sb.storage.from("media").createSignedUrl(asset.storage_path, 600)).data?.signedUrl : null;
      if (!signed) return new Response("لم أجد عينة صوت لهذا الأفاتار في هويتي", { status: 404 });
      speaker = signed;
    }
    if (xtts) {
      const r = await fetch(`${xtts.url}/tts_to_audio/`, { method: "POST", headers: { "Content-Type": "application/json", ...(xtts.token ? { Authorization: `Bearer ${xtts.token}` } : {}) }, body: JSON.stringify({ text: parsed.data.text, speaker_wav: speaker, language: isAr ? "ar" : "en" }) }).catch(() => null);
      if (r?.ok && r.body) return new Response(r.body, { headers: { "Content-Type": r.headers.get("content-type") ?? "audio/wav", "Cache-Control": "no-cache", "X-Voice-Engine": "xtts" } });
      console.error("xtts failed", r?.status);
      return new Response("تعذر تشغيل صوت سيرفرك؛ لم تُستخدم خدمة مدفوعة. تحقق من XTTS.", { status: 502 });
    }
    if (await selfHostedOnly(auth.sb, auth.userId)) return new Response("اربط نموذج الصوت المفتوح أولًا؛ الخدمات المدفوعة متوقفة لمساحة عملك.", { status: 409 });
    if (!apiKey) return new Response("الخدمة غير مهيأة", { status: 500 });
    const styled = isAr
      ? `اقرأ النص التالي بصوت إذاعي واضح وقوي ودافئ، بنطق عربي فصيح وسليم وإيقاع طبيعي: ${parsed.data.text}`
      : `Say in a clear, warm, confident studio narrator voice: ${parsed.data.text}`;
    try {
      const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
        method: "POST", signal: request.signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-tts-preview",
          contents: [{ role: "user", parts: [{ text: styled }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: parsed.data.voice } } } },
          stream_format: "audio",
        }),
      });
      if (!upstream.ok) {
        const raw = await upstream.text();
        console.error("tts error", upstream.status, raw.slice(0, 300));
        return new Response(raw || "تعذر توليد الصوت", { status: upstream.status });
      }
      return new Response(upstream.body, { status: 200, headers: { "Content-Type": upstream.headers.get("content-type") ?? "audio/wav", "Cache-Control": "no-cache" } });
    } catch (e) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      throw e;
    }
  } } },
});
