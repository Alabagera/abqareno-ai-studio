import { AlabageraPortrait } from "@/components/AlabageraPortrait";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-10 overflow-hidden rounded-full border-2 border-gold shadow-gold">
        <AlabageraPortrait className="size-full" eager />
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
