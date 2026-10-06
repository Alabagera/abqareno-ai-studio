import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  queued: "بانتظار المعالجة",
  processing: "قيد المعالجة",
  done: "جاهز",
  failed: "فشل",
};
