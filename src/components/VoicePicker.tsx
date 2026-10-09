import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PRESET_VOICES, getVoiceChoice, setVoiceChoice } from "@/lib/abq-voice";

export function useVoiceChoice() {
  const [v, setV] = useState("Charon");
  useEffect(() => { setV(getVoiceChoice()); const f = () => setV(getVoiceChoice()); window.addEventListener("abq-voice-change", f); return () => window.removeEventListener("abq-voice-change", f); }, []);
  return v;
}

export function VoicePicker({ className = "" }: { className?: string }) {
  const value = useVoiceChoice();
  const { data: profiles = [] } = useQuery({ queryKey: ["voice-profiles-pick"], queryFn: async () => (await supabase.from("voice_profiles").select("id,name").order("created_at", { ascending: false })).data ?? [] });
  return (
    <select value={value} onChange={(e) => setVoiceChoice(e.target.value)} aria-label="صوت عبقرينو" className={`rounded-full bg-secondary px-2 py-1.5 text-xs ${className}`}>
      {profiles.length > 0 && <optgroup label="أصوات هويتي">{profiles.map((p) => <option key={p.id} value={`profile:${p.id}`}>🎙️ {p.name}</option>)}</optgroup>}
      <optgroup label="أصوات جاهزة">{PRESET_VOICES.map((p) => <option key={p.id} value={p.id}>{p.l}</option>)}</optgroup>
    </select>
  );
}
