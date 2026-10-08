import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { TRANSITION_LIST, txFx } from "@/lib/editor/transitions";

// Grid of transitions, each with a small looping animated preview.
export function TransitionPicker({ value, onPick, onAll, onClose }: { value: string; onPick: (id: string) => void; onAll: (id: string) => void; onClose: () => void }) {
  const groups = [...new Set(TRANSITION_LIST.map((t) => t.group))];
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-background/70 sm:items-center" onClick={onClose}>
      <div dir="rtl" className="glass max-h-[75dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl p-3 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between"><b className="text-gold">اختر الانتقال</b>
          <div className="flex items-center gap-2"><button type="button" className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => onAll(value)}>طبّق الحالي على الكل</button>
            <button type="button" aria-label="إغلاق" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-secondary"><X className="size-5" /></button></div>
        </div>
        {groups.map((g) => (
          <div key={g} className="mb-3"><p className="mb-1 text-xs text-muted-foreground">{g}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {TRANSITION_LIST.filter((t) => t.group === g).map((t) => (
                <button type="button" key={t.id} onClick={() => onPick(t.id)} className={`overflow-hidden rounded-lg border-2 text-[11px] ${value === t.id ? "border-gold" : "border-border"}`}>
                  <Preview id={t.id} /><span className="block p-1">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Preview({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; const ctx = c?.getContext("2d"); if (!c || !ctx) return;
    const W = c.width, H = c.height; let raf = 0; const t0 = performance.now();
    const scene = (color: string, label: string) => { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, color); g.addColorStop(1, "#0b1530"); ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3); ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, W / 2, H / 2); };
    const tick = () => {
      const k = ((performance.now() - t0) / 1600) % 1; const p = Math.min(1, k * 1.4); const e = 1 - Math.pow(1 - p, 3);
      const f = txFx(id, e, W, H);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = "none"; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = f.prevAlpha ?? 1; ctx.translate(W / 2 + (f.prevTx ?? 0), H / 2 + (f.prevTy ?? 0)); ctx.scale(f.prevScale ?? 1, f.prevScale ?? 1); ctx.translate(-W / 2, -H / 2); scene("#1E3A8A", "A"); ctx.restore();
      if (id === "none" && p < 1) { raf = requestAnimationFrame(tick); return; }
      ctx.save(); if (f.clip) { ctx.beginPath(); f.clip(ctx, W, H); ctx.clip(); }
      ctx.globalAlpha = Math.max(0, Math.min(1, f.alpha)); ctx.translate(W / 2 + f.tx, H / 2 + f.ty); ctx.rotate(f.rot); ctx.scale(f.scale * f.sx, f.scale * f.sy); ctx.translate(-W / 2, -H / 2);
      if (f.blur) ctx.filter = `blur(${f.blur / 6}px)`; scene("#C9A227", "B"); ctx.restore();
      f.overlay?.(ctx, W, H);
      raf = requestAnimationFrame(tick);
    };
    tick(); return () => cancelAnimationFrame(raf);
  }, [id]);
  return <canvas ref={ref} width={120} height={68} className="block h-auto w-full" />;
}
