import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authVoice } from "@/lib/voice-backend.server";

// Translates editor captions in one request (strict JSON output, streamed upstream).
const body = z.object({ texts: z.array(z.string().max(1000)).min(1).max(200), target: z.string().min(2).max(10) });
const NAMES: Record<string, string> = { en: "English", ar: "Arabic", fr: "French", es: "Spanish", tr: "Turkish", ur: "Urdu", hi: "Hindi", de: "German", zh: "Simplified Chinese", id: "Indonesian" };

export const Route = createFileRoute("/api/translate")({
  server: { handlers: { POST: async ({ request }) => {
    const auth = await authVoice(request);
    if (!auth) return new Response("يلزم تسجيل الدخول", { status: 401 });
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return new Response("طلب غير صالح", { status: 400 });
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return new Response("الخدمة غير مهيأة", { status: 500 });
    const lang = NAMES[parsed.data.target] ?? parsed.data.target;
    try {
      const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST", signal: request.signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra", stream: true, store: false, reasoning: { effort: "low" },
          input: [
            { role: "system", content: `You are a professional subtitle translator. Translate each caption into natural, concise ${lang} suitable for on-screen video subtitles. Keep the same order and count. Understand Arabic dialects (Sudanese, Egyptian, Gulf, Levantine). Return JSON.` },
            { role: "user", content: JSON.stringify(parsed.data.texts) },
          ],
          text: { format: { type: "json_schema", name: "captions", strict: true, schema: { type: "object", additionalProperties: false, required: ["translations"], properties: { translations: { type: "array", items: { type: "string" } } } } } },
        }),
      });
      if (!upstream.ok || !upstream.body) {
        const raw = await upstream.text();
        console.error("translate error", upstream.status, raw.slice(0, 300));
        return new Response(upstream.status === 402 ? "نفد رصيد الذكاء الاصطناعي" : "تعذرت الترجمة", { status: upstream.status });
      }
      const reader = upstream.body.getReader(); const dec = new TextDecoder(); let buf = ""; let out = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.startsWith("data:")) continue;
          try { const ev = JSON.parse(l.slice(5)) as { type?: string; delta?: string }; if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta; } catch { /* keep-alive */ }
        }
      }
      const result = JSON.parse(out) as { translations: string[] };
      return Response.json({ translations: result.translations });
    } catch (e) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      console.error("translate failed", e);
      return new Response("تعذرت الترجمة", { status: 500 });
    }
  } } },
});
