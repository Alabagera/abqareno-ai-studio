import { createFileRoute } from "@tanstack/react-router";
import { authVoice, linkedEndpoint } from "@/lib/voice-backend.server";

// Speech to text. Uses the owner's self-hosted Whisper when linked, otherwise Lovable AI.
export const Route = createFileRoute("/api/stt")({
  server: { handlers: { POST: async ({ request }) => {
    const auth = await authVoice(request);
    if (!auth) return new Response("يلزم تسجيل الدخول", { status: 401 });
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || !file.size || file.size > 20 * 1024 * 1024) return new Response("ملف صوت غير صالح", { status: 400 });
    const audio = new File([file], "speech.webm", { type: file.type.startsWith("audio/") ? file.type : "audio/webm" });
    const lang = String(form?.get("language") ?? "");
    try {
      const whisper = await linkedEndpoint(auth.sb, auth.userId, "whisper");
      if (whisper) {
        const f = new FormData(); f.append("audio_file", audio);
        const q = new URLSearchParams({ task: "transcribe", output: "json", encode: "true", ...(lang ? { language: lang } : {}) });
        const r = await fetch(`${whisper.url}/asr?${q}`, { method: "POST", body: f, headers: whisper.token ? { Authorization: `Bearer ${whisper.token}` } : {} }).catch(() => null);
        if (r?.ok) { const j = (await r.json()) as { text?: string }; return Response.json({ text: (j.text ?? "").trim(), engine: "whisper" }); }
        console.error("whisper failed", r?.status);
      }
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!apiKey) return new Response("الخدمة غير مهيأة", { status: 500 });
      const f = new FormData();
      f.append("model", "openai/gpt-transcribe");
      f.append("file", audio, audio.name);
      f.append("response_format", "json");
      f.append("stream", "true");
      for (const l of lang ? [lang] : ["ar", "en"]) f.append("languages[]", l);
      f.append("prompt", "تسجيل بالعربية والإنجليزية وقد يخلط المتحدث بينهما. اكتب العربية بإملاء صحيح وعلامات ترقيم، والإنجليزية بحروف لاتينية.");
      const up = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", { method: "POST", signal: request.signal, headers: { Authorization: `Bearer ${apiKey}` }, body: f });
      if (!up.ok || !up.body) { const raw = await up.text(); console.error("stt error", up.status, raw.slice(0, 300)); return new Response(raw || "تعذر تحويل الصوت", { status: up.status }); }
      const reader = up.body.getReader(); const dec = new TextDecoder(); let buf = "", text = "", done = "";
      for (;;) {
        const { value, done: end } = await reader.read(); if (end) break;
        buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try { const e = JSON.parse(line.slice(5).trim()) as { type?: string; delta?: string; text?: string }; if (e.type === "transcript.text.delta") text += e.delta ?? ""; if (e.type === "transcript.text.done") done = e.text ?? ""; } catch { /* partial */ }
        }
      }
      return Response.json({ text: (done || text).trim(), engine: "lovable" });
    } catch (e) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      throw e;
    }
  } } },
});
