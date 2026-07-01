import type { ComponentProps, ComponentType, ReactNode } from "react";

import { badgeClass, statusLabel } from "@/lib/supabase/format";
import { cn } from "@/lib/utils";

import { barToneClass, barWidth } from "./dashboard-calculations";

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#e7f0f2] bg-white/90 p-4 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function PanelTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium ${badgeClass(value)}`}>
      {statusLabel(value)}
    </span>
  );
}

export function BarRow({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
        <div className={`h-full rounded-full ${barToneClass(tone)}`} style={{ width: `${barWidth(value, max)}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) {
  return (
    <div className="py-6 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

export function EmptyInline({ text }: { text: string }) {
  return <p className="rounded-lg bg-muted/45 p-4 text-sm text-muted-foreground">{text}</p>;
}

export function SectionLabel({ label }: { label: string }) {
  return <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</p>;
}

export function SoftRow({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg bg-muted/45 p-2.5 transition-colors hover:bg-muted/65", className)}
      {...props}
    />
  );
}
