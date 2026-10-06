import portrait from "@/assets/alabagera-character.jpeg.asset.json";
import { cn } from "@/lib/utils";

export function AlabageraPortrait({ className, eager = false }: { className?: string; eager?: boolean }) {
  return (
    <img
      src={portrait.url}
      alt="عبقرينو، الهوية البصرية لاستوديو عبقرينو"
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("object-cover object-[center_22%]", className)}
    />
  );
}