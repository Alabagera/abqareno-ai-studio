import { supabase } from "@/integrations/supabase/client";

// One shared voice choice for Abqarino (voice commander + assistant voice chat).
// "profile:<uuid>" = a saved avatar voice from «هويتي»; otherwise a preset voice.
export const PRESET_VOICES = [
  { id: "Charon", l: "صوت رجالي عميق" },
  { id: "Orus", l: "صوت رجالي حازم" },
  { id: "Kore", l: "صوت نسائي واضح" },
  { id: "Aoede", l: "صوت نسائي دافئ" },
];
const KEY = "abq-voice-choice";
export const getVoiceChoice = () => (typeof window === "undefined" ? "Charon" : localStorage.getItem(KEY) || "Charon");
export function setVoiceChoice(v: string) { localStorage.setItem(KEY, v); window.dispatchEvent(new Event("abq-voice-change")); }

let warned = false;
/** Returns an object URL for spoken audio using the chosen voice. Falls back to a preset if the avatar voice is unavailable. */
export async function ttsUrl(text: string, choice: string, signal?: AbortSignal): Promise<string> {
  const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
  const call = (body: object) => fetch("/api/tts", { method: "POST", signal: signal ?? null, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text, ...body }) });
  let r: Response;
  if (choice.startsWith("profile:")) {
    r = await call({ voiceProfileId: choice.slice(8) });
    if (r.status === 424) {
      if (!warned) { warned = true; const { toast } = await import("sonner"); toast.message(await r.text()); }
      r = await call({ voice: "Charon" });
    }
  } else r = await call({ voice: choice });
  if (!r.ok) throw new Error((await r.text()) || "تعذر توليد الصوت");
  return URL.createObjectURL(await r.blob());
}
