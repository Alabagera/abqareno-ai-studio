import { useState } from "react";
import type { TextItem } from "@/lib/editor/types";
import { SYMBOL_COUNT, SYMBOL_GROUPS, TEXT_BOX_COUNT, TEXT_BOX_GROUPS, TEXT_BOX_STYLES } from "@/lib/editor/stickers";

/** Picker for hundreds of symbols and ready-made text boxes. */
export function StickerLibrary({ onAdd }: { onAdd: (text: string, s?: Partial<TextItem>, symbol?: boolean) => void }) {
  const [tab, setTab] = useState<"sym" | "box" | null>(null);
  const [g, setG] = useState(0);
  const [st, setSt] = useState(0);
  const sel = "h-8 rounded-md border border-input bg-background px-1 text-xs";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={() => { setTab(tab === "sym" ? null : "sym"); setG(0); }} className={`rounded-md border px-2 py-1 text-xs ${tab === "sym" ? "border-gold text-gold" : "border-border"}`}>😀 الرموز ({SYMBOL_COUNT})</button>
        <button type="button" onClick={() => { setTab(tab === "box" ? null : "box"); setG(0); }} className={`rounded-md border px-2 py-1 text-xs ${tab === "box" ? "border-gold text-gold" : "border-border"}`}>▭ مربعات النص ({TEXT_BOX_COUNT})</button>
      </div>
      {tab === "sym" && <div className="space-y-2 rounded-lg border border-border p-2">
        <div className="flex flex-wrap gap-1">{SYMBOL_GROUPS.map((x, i) => <button type="button" key={x.id} onClick={() => setG(i)} className={`rounded-md border px-2 py-0.5 text-[11px] ${g === i ? "border-gold text-gold" : "border-border"}`}>{x.label}</button>)}</div>
        <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto sm:grid-cols-12">{SYMBOL_GROUPS[g]!.items.map((s, i) => <button type="button" key={i} onClick={() => onAdd(s, {}, true)} className="grid aspect-square place-items-center rounded-md text-xl hover:bg-secondary">{s}</button>)}</div>
      </div>}
      {tab === "box" && <div className="space-y-2 rounded-lg border border-border p-2">
        <div className="flex flex-wrap gap-2">
          <select className={sel} value={g} onChange={(e) => setG(+e.target.value)}>{TEXT_BOX_GROUPS.map((x, i) => <option key={x.label} value={i}>{x.label}</option>)}</select>
          <select className={sel} value={st} onChange={(e) => setSt(+e.target.value)}>{TEXT_BOX_STYLES.map((x, i) => <option key={x.id} value={i}>{x.label}</option>)}</select>
        </div>
        <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">{[...new Set(TEXT_BOX_GROUPS[g]!.items.map((x) => x.text))].map((t) => {
          const s = TEXT_BOX_STYLES[st]!.s;
          return <button type="button" key={t} dir="auto" onClick={() => onAdd(t, s)} className="rounded-md px-2 py-1 text-xs" style={{ color: s.color, background: s.bg === "transparent" ? "rgba(0,0,0,.6)" : s.bg, fontFamily: s.font, fontWeight: s.bold ? 700 : 400 }}>{t}</button>;
        })}</div>
      </div>}
    </div>
  );
}
