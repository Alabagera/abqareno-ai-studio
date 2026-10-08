import { useEffect, useRef, useState, type ReactNode } from "react";

// Horizontal clip strip. Tap = select. Press and hold for 2 seconds, then drag
// left/right to move the clip before or after another one.
const HOLD_MS = 2000;

export function LongPressStrip<T extends { id: string }>({ items, selectedId, onSelect, onReorder, width, render }: {
  items: T[]; selectedId: string | null; onSelect: (id: string) => void; onReorder: (from: number, to: number) => void; width: (item: T) => number; render: (item: T, index: number) => ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ x: 0, y: 0, index: -1, moved: false });
  const [holding, setHolding] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ from: number; to: number; dx: number } | null>(null);
  const dragRef = useRef(drag); dragRef.current = drag;

  // Block page scrolling on touch screens while a clip is being dragged.
  useEffect(() => {
    const el = box.current; if (!el) return;
    const stop = (e: TouchEvent) => { if (dragRef.current) e.preventDefault(); };
    el.addEventListener("touchmove", stop, { passive: false });
    return () => el.removeEventListener("touchmove", stop);
  }, []);

  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; setHolding(null); };
  const targetIndex = (clientX: number) => {
    const kids = Array.from(box.current?.querySelectorAll<HTMLElement>("[data-strip-item]") ?? []);
    let best = start.current.index, bestD = Infinity;
    kids.forEach((k, i) => { const r = k.getBoundingClientRect(); const d = Math.abs(clientX - (r.left + r.width / 2)); if (d < bestD) { bestD = d; best = i; } });
    return best;
  };

  return (
    <div ref={box} dir="ltr" className="flex gap-1.5 overflow-x-auto pb-2" style={{ touchAction: drag ? "none" : "pan-x" }}>
      {items.map((it, i) => {
        const isDrag = drag?.from === i;
        return (
          <div key={it.id} data-strip-item
            onPointerDown={(e) => {
              start.current = { x: e.clientX, y: e.clientY, index: i, moved: false };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setHolding(i);
              timer.current = setTimeout(() => { setHolding(null); setDrag({ from: i, to: i, dx: 0 }); navigator.vibrate?.(40); }, HOLD_MS);
            }}
            onPointerMove={(e) => {
              const d = dragRef.current;
              if (d) { setDrag({ ...d, dx: e.clientX - start.current.x, to: targetIndex(e.clientX) }); return; }
              if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) { start.current.moved = true; clear(); }
            }}
            onPointerUp={() => {
              const d = dragRef.current;
              if (d) { if (d.to !== d.from) onReorder(d.from, d.to); setDrag(null); }
              else if (!start.current.moved) onSelect(it.id);
              clear();
            }}
            onPointerCancel={() => { clear(); setDrag(null); }}
            onContextMenu={(e) => e.preventDefault()}
            className={`relative shrink-0 select-none overflow-hidden rounded-lg border-2 bg-secondary/70 transition-[box-shadow] ${selectedId === it.id ? "border-gold" : "border-border"} ${isDrag ? "z-10 scale-105 shadow-2xl ring-2 ring-gold" : ""} ${drag && drag.to === i && !isDrag ? "outline outline-2 outline-dashed outline-gold" : ""}`}
            style={{ width: width(it), transform: isDrag ? `translateX(${drag.dx}px)` : undefined, WebkitTouchCallout: "none" }}>
            {render(it, i)}
            {holding === i && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left bg-gold" style={{ animation: `strip-hold ${HOLD_MS}ms linear forwards` }} />}
          </div>
        );
      })}
      <style>{"@keyframes strip-hold{from{transform:scaleX(0)}to{transform:scaleX(1)}}"}</style>
    </div>
  );
}
