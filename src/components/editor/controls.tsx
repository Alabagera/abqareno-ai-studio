import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AUDIO_PRESETS, MICS, NO_FILTERS, PRESETS, type AudioFx, type Filters, type Keying } from "@/lib/editor/types";
import { segmenterState, loadSegmenter } from "@/lib/editor/keying";

export function Section({ title, icon, open, onToggle, children, badge }: { title: string; icon: ReactNode; open: boolean; onToggle: () => void; children: ReactNode; badge?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/50">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 p-3 text-start text-sm font-bold">
        <span className="text-gold">{icon}</span><span className="flex-1">{title}</span>{badge}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-3 border-t border-border p-3 text-xs">{children}</div>}
    </div>
  );
}

export function Range({ label, min, max, step = 1, value, onChange, suffix = "" }: { label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="flex justify-between"><span>{label}</span><span className="font-mono text-gold-soft" dir="ltr">{Number.isInteger(step) ? Math.round(value) : value.toFixed(1)}{suffix}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-[var(--gold)]" />
    </label>
  );
}

export function Sel<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <label className="block">{label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[var(--gold)]" />{label}</label>;
}

export function ColorIn({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return <label className="flex items-center justify-between gap-2">{label}<input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-8 w-12 rounded" /></label>;
}

export const BG_OPTIONS = [
  { id: "transparent", label: "بدون" }, { id: "rgba(0,0,0,0.55)", label: "داكنة شفافة" }, { id: "#000000", label: "سوداء" }, { id: "#FFD700", label: "ذهبية" },
  { id: "#FFFFFF", label: "بيضاء" }, { id: "#DC143C", label: "حمراء" }, { id: "#1E3A8A", label: "زرقاء" }, { id: "#00C853", label: "خضراء" },
];

export function FiltersEditor({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">{PRESETS.map((p) => <button type="button" key={p.label} onClick={() => onChange({ ...NO_FILTERS, ...p.f })} className="rounded-md border border-border px-2 py-1 hover:border-gold">{p.label}</button>)}</div>
      <div className="grid grid-cols-2 gap-2">
        {([["brightness", "السطوع", 0, 200], ["contrast", "التباين", 0, 200], ["saturate", "التشبع", 0, 250], ["hue", "درجة اللون", -180, 180], ["grayscale", "رمادي", 0, 100], ["sepia", "دافئ قديم", 0, 100], ["blur", "تمويه", 0, 10]] as const).map(([k, l, mn, mx]) => (
          <Range key={k} label={l} min={mn} max={mx} value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })} />
        ))}
      </div>
    </div>
  );
}

export function AudioFxEditor({ value, onChange }: { value: AudioFx; onChange: (f: AudioFx) => void }) {
  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-2">
      <div className="flex flex-wrap gap-1">{AUDIO_PRESETS.map((p) => <button type="button" key={p.label} onClick={() => onChange(p.fx)} className="rounded-md border border-border px-2 py-1 hover:border-gold">{p.label}</button>)}</div>
      <Sel label="محاكاة مايك عالمي" value={value.mic} onChange={(mic) => onChange({ ...value, mic })} options={MICS.map((m) => ({ id: m.id, label: m.label }))} />
      <Range label="تضخيم الصوت (حتى 1000% مع حماية من التشويش)" min={0} max={1000} step={5} value={value.gain} suffix="%" onChange={(gain) => onChange({ ...value, gain })} />
      <div className="grid grid-cols-2 gap-2">
        <Range label="العمق" min={-12} max={12} step={0.5} value={value.bass} suffix="dB" onChange={(bass) => onChange({ ...value, bass })} />
        <Range label="الحضور والوضوح" min={-12} max={12} step={0.5} value={value.presence} suffix="dB" onChange={(presence) => onChange({ ...value, presence })} />
        <Range label="اللمعان" min={-12} max={12} step={0.5} value={value.air} suffix="dB" onChange={(air) => onChange({ ...value, air })} />
        <Range label="الضغط الإذاعي" min={0} max={100} value={value.comp} onChange={(comp) => onChange({ ...value, comp })} />
        <Range label="تنظيف الهمهمة المنخفضة" min={0} max={100} value={value.clean} onChange={(clean) => onChange({ ...value, clean })} />
      </div>
    </div>
  );
}

export function KeyEditor({ value, onChange }: { value: Keying; onChange: (k: Keying) => void }) {
  const [, force] = useState(0);
  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-2">
      <Sel label="حذف الخلفية" value={value.mode} onChange={(mode) => { onChange({ ...value, mode }); if (mode === "ai") void loadSegmenter().then(() => force((n) => n + 1)); }} options={[{ id: "none", label: "بدون" }, { id: "ai", label: "ذكي بدون شاشة خضراء (للأشخاص)" }, { id: "chroma", label: "شاشة خضراء / زرقاء / أي لون" }]} />
      {value.mode === "ai" && <p className="text-muted-foreground">{segmenterState === "ready" ? "✓ أداة الحذف الذكي جاهزة" : segmenterState === "failed" ? "تعذر تحميل أداة الحذف الذكي على هذا المتصفح" : "جارٍ تحميل أداة الحذف الذكي…"}</p>}
      {value.mode === "chroma" && <div className="flex flex-wrap gap-2">{["#00FF00", "#00B140", "#0047BB", "#FFFFFF", "#000000"].map((c) => <button type="button" key={c} onClick={() => onChange({ ...value, color: c })} className={`size-7 rounded-full border-2 ${value.color === c ? "border-gold" : "border-border"}`} style={{ background: c }} aria-label={c} />)}<input type="color" value={value.color} onChange={(e) => onChange({ ...value, color: e.target.value })} className="h-7 w-10" /></div>}
      {value.mode !== "none" && <div className="grid grid-cols-2 gap-2">
        <Range label={value.mode === "ai" ? "دقة القص" : "مدى اللون"} min={0} max={100} value={value.tolerance} onChange={(tolerance) => onChange({ ...value, tolerance })} />
        <Range label="نعومة الحواف" min={0} max={60} value={value.softness} onChange={(softness) => onChange({ ...value, softness })} />
      </div>}
    </div>
  );
}
