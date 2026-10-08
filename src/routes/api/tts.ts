import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Professional spoken replies for the voice chat. Returns a complete WAV clip.
const body = z.object({ text: z.string().trim().min(1).max(1500), voice: z.string().max(30).default("Charon") });

export const Route = createFileRoute("/api/tts")({
  server: { handlers: { POST: async ({ request }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!apiKey || !url || !key) return new Response("الخدمة غير مهيأة", { status: 500 });
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (token.split(".").length !== 3) return new Response("يلزم تسجيل الدخول", { status: 401 });
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return new Response("يلزم تسجيل الدخول", { status: 401 });
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return new Response("نص غير صالح", { status: 400 });
    const isAr = /[\u0600-\u06FF]/.test(parsed.data.text);
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
