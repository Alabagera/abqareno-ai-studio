import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { COLORS, GRADIENTS } from "@/lib/studio-options";

export function ColorPicker({ label, value, onChange, gradients = false }: { label: string; value: string; onChange: (v: string) => void; gradients?: boolean }) {
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => { try { setFavs(JSON.parse(localStorage.getItem("fav-colors") ?? "[]")); } catch { /* ignore */ } }, []);
  function toggleFav() {
    const next = favs.includes(value) ? favs.filter((f) => f !== value) : [value, ...favs].slice(0, 12);
    setFavs(next); localStorage.setItem("fav-colors", JSON.stringify(next));
  }
  const swatch = (c: string) => (
    <button key={c} type="button" aria-label={`لون ${c}`} onClick={() => onChange(c)}
      className={`size-7 shrink-0 rounded-full border-2 ${value === c ? "border-foreground scale-110" : "border-border"}`} style={{ background: c }} />
  );
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleFav} aria-label="مفضلة" className={favs.includes(value) ? "text-gold" : "text-muted-foreground"}><Star className="size-4" /></button>
          <input type="color" aria-label="لون مخصص" value={value.startsWith("#") ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer rounded border-0 bg-transparent p-0" />
        </div>
      </div>
      {favs.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{favs.map(swatch)}</div>}
      <div className="flex flex-wrap gap-1.5">{COLORS.map(swatch)}{gradients && GRADIENTS.map(swatch)}</div>
    </div>
  );
}

export function FontSelect({ label, value, onChange, fonts }: { label: string; value: string; onChange: (v: string) => void; fonts: string[] }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" style={{ fontFamily: value }}>
        {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
    </div>
  );
}
