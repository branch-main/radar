import { Package } from "lucide-react";
import Link from "next/link";

import type { PipelineItem } from "./types";
import { Panel, PanelTitle } from "./shared";

export function LostFoundSection({
  pipeline,
  catalogResolutionRate,
  matchConfirmationRate,
  actionMatches,
}: {
  pipeline: PipelineItem[];
  catalogResolutionRate: number;
  matchConfirmationRate: number;
  actionMatches: number;
}) {
  return (
    <Panel>
      <PanelTitle
        title="Objetos perdidos"
        action={<Package className="size-4 text-primary" />}
      />

      <div className="grid grid-cols-2 gap-3">
        <PipelineMetric label="Entrega" value={catalogResolutionRate} suffix="%" />
        <PipelineMetric label="Matches" value={matchConfirmationRate} suffix="%" />
      </div>

      <div className="mt-4 space-y-2">
        {pipeline.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between rounded-lg bg-muted/45 p-3 transition-colors hover:bg-muted/65"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-4" />
              </span>
              <span className="truncate text-sm text-muted-foreground">{item.label}</span>
            </span>
            <span className="text-lg font-semibold tabular-nums">{item.value}</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-muted/45 p-4">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Matching</p>
        <p className="mt-2 text-sm leading-6">
          {actionMatches > 0
            ? `${actionMatches} coincidencias necesitan decisión del equipo.`
            : "No hay coincidencias pendientes de revisión."}
        </p>
      </div>
    </Panel>
  );
}

function PipelineMetric({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-lg bg-muted/45 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-sm text-muted-foreground">{suffix}</span>
      </p>
    </div>
  );
}
