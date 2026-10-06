import { useState } from "react";
import { Play, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DEFAULT_FX, FX_PRESETS, decodeAudio, renderFx, toWav, type VoiceFx } from "@/lib/voice-fx";

const SLIDERS: { k: keyof VoiceFx; l: string; min: number; max: number }[] = [
  { k: "noise", l: "إزالة الضجيج", min: 0, max: 100 },
  { k: "bass", l: "العمق والقوة", min: -10, max: 10 },
  { k: "warmth", l: "الدفء", min: -10, max: 10 },
  { k: "clarity", l: "الوضوح", min: -10, max: 10 },
  { k: "air", l: "اللمعان", min: -10, max: 10 },
  { k: "compression", l: "قوة الحضور (إذاعي)", min: 0, max: 100 },
  { k: "reverb", l: "صدى القاعة", min: 0, max: 100 },
  { k: "gain", l: "مستوى الصوت", min: -6, max: 12 },
  { k: "hum", l: "إزالة الهمهمة الكهربائية", min: 0, max: 100 },
  { k: "deEss", l: "تقليل صفير السين والشين", min: 0, max: 100 },
  { k: "speechFocus", l: "تركيز ووضوح الكلام", min: 0, max: 100 },
  { k: "limiter", l: "منع التشويش والقمم", min: 0, max: 100 },
];

export function VoiceEnhancer({ sourceUrl, value, onChange, onSaveFile }: { sourceUrl: string | null; value: VoiceFx; onChange: (fx: VoiceFx) => void; onSaveFile?: (file: File) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  async function preview() {
    if (!sourceUrl) { toast.error("سجّل أو اختر عينة صوتية أولًا"); return; }
    setBusy(true);
    try {
      const b = toWav(await renderFx(await decodeAudio(sourceUrl), value));
      setBlob(b); setOut(URL.createObjectURL(b));
    } catch { toast.error("تعذرت معالجة هذا الملف الصوتي"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FX_PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => onChange(p.fx)} className={`rounded-xl p-3 text-start transition ${JSON.stringify(p.fx) === JSON.stringify(value) ? "bg-secondary ring-1 ring-primary" : "bg-muted/50"}`}>
            <div className="text-sm font-bold">{p.label}</div><div className="text-[11px] text-muted-foreground">{p.desc}</div>
          </button>
        ))}
      </div>
      <details className="rounded-xl bg-muted/40 p-3">
        <summary className="cursor-pointer text-sm font-medium">إعدادات يدوية متقدمة</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SLIDERS.map((s) => (
            <label key={s.k} className="text-xs text-muted-foreground">{s.l}: {value[s.k]}
              <input type="range" min={s.min} max={s.max} value={value[s.k]} onChange={(e) => onChange({ ...value, [s.k]: +e.target.value })} className="w-full accent-[var(--gold)]" />
            </label>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => onChange(DEFAULT_FX)}>إعادة الضبط</Button>
      </details>
      <p className="text-xs leading-5 text-muted-foreground">التحسين يحافظ على هوية الصوت ويعالج الضجيج والتوازن والوضوح. التسجيل شديد التلف قد يتحسن كثيرًا، لكن لا يمكن استعادة تفاصيل لم يلتقطها الميكروفون أصلًا.</p>
      <div className="flex flex-wrap gap-2">
        {sourceUrl && <audio controls src={sourceUrl} className="h-10 w-full" />}
        <Button type="button" variant="gold" disabled={busy} onClick={preview}><Wand2 />{busy ? "جارٍ المعالجة…" : "استمع للصوت المحسّن"}</Button>
      </div>
      {out && <div className="space-y-2 rounded-xl bg-secondary/60 p-3"><p className="flex items-center gap-1 text-xs text-gold-soft"><Play className="size-3" />بعد التحسين</p><audio controls autoPlay src={out} className="h-10 w-full" />
        {onSaveFile && blob && <Button type="button" variant="glass" size="sm" onClick={() => onSaveFile(new File([blob], `صوت-محسن-${Date.now()}.wav`, { type: "audio/wav" }))}><Save />حفظ النسخة المحسّنة في المكتبة</Button>}</div>}
    </div>
  );
}
