import { Sparkles } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-xl bg-gold-gradient shadow-gold">
        <Sparkles className="size-5 text-primary-foreground" />
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold leading-none">
          <span className="text-gold-gradient">عبقرينو</span>{" "}
          <span className="text-muted-foreground text-sm">AI Studio</span>
        </span>
      )}
    </div>
  );
}
