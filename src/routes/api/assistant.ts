import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { activeModel } from "@/lib/ai/registry";

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(20000) })).min(1).max(40),
});

const SYSTEM = `أنت "مساعد عبقرينو"، مساعد ذكي محترف داخل استوديو عبقرينو AI لصناعة المحتوى.
تجيب بالعربية الفصحى الواضحة ما لم يطلب المستخدم لغة أخرى. تساعد في: الإجابة عن الأسئلة، كتابة سكربتات فيديو قصيرة ومناسبة للنطق،
الإعلانات، المقالات، منشورات التواصل، العناوين والهاشتاقات، والأفكار. نسّق الإجابة بفقرات وعناوين قصيرة وقوائم عند الحاجة.
عند كتابة سكربت للنطق، اكتب النص المنطوق فقط دون إرشادات إخراج إلا إذا طُلبت.`;

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "");
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!url || !key || !apiKey) return new Response("Server not configured", { status: 500 });
        if (token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });
        const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: claims, error } = await sb.auth.getClaims(token);
        if (error || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const model = activeModel("chat")?.id ?? "openai/gpt-6-astra";

        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
            method: "POST",
            signal: request.signal,
            headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
            body: JSON.stringify({
              model,
              input: [{ role: "system", content: SYSTEM }, ...parsed.data.messages],
              stream: true,
              store: false,
              reasoning: { effort: "low", summary: "auto" },
              include: ["reasoning.encrypted_content"],
            }),
          });
          if (!res.ok) {
            const text = await res.text();
            console.error("assistant gateway error", res.status, text.slice(0, 500));
            const msg = res.status === 429 ? "طلبات كثيرة، حاول بعد قليل" : res.status === 402 ? "نفد رصيد الذكاء الاصطناعي في مساحة العمل" : "تعذر الوصول إلى المساعد حاليًا";
            return new Response(msg, { status: res.status });
          }
          return new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw e;
        }
      },
    },
  },
});
