import { Building2, Timer, Wrench } from "lucide-react";
import type { ComponentType } from "react";

import { statusLabel } from "@/lib/supabase/format";
import type { MaintenanceIncident } from "@/lib/supabase/types";

import type { Bucket, Hotspot } from "./types";
import { categoryLabels } from "./dashboard-constants";
import { barWidth, dueLabel, healthScoreLabel, maxValue } from "./dashboard-calculations";
import { BarRow, EmptyInline, Panel, PanelTitle, SectionLabel } from "./shared";

export function ShiftFocus({
  healthScore,
  openWorkload,
  riskCount,
  nextDueIncident,
  topBuilding,
  title = "Lectura rápida",
}: {
  healthScore: number;
  openWorkload: number;
  riskCount: number;
  nextDueIncident?: MaintenanceIncident;
  topBuilding?: Hotspot;
  title?: string;
}) {
  return (
    <Panel>
      <PanelTitle title={title} />
      <div className="rounded-lg bg-muted/45 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{healthScoreLabel(healthScore)}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {openWorkload} tareas abiertas y {riskCount} señales de riesgo.
            </p>
          </div>
          <span className="text-3xl font-semibold tabular-nums tracking-tight">{healthScore}</span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <FocusTile
          icon={Timer}
          label="Siguiente SLA"
          value={nextDueIncident?.due_at ? dueLabel(nextDueIncident.due_at, new Date()) : "Sin fecha"}
          detail={nextDueIncident?.reports?.title ?? "No hay vencimientos programados"}
        />
        <FocusTile
          icon={Building2}
          label="Hotspot principal"
          value={topBuilding?.building ?? "Sin datos"}
          detail={topBuilding ? `${topBuilding.count} reportes acumulados` : "Sin reportes por edificio"}
        />
      </div>
    </Panel>
  );
}

function FocusTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg bg-muted/45 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <p className="mt-3 truncate text-sm font-medium">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

export function MaintenanceSignals({
  urgencyBuckets,
  categoryBuckets,
}: {
  urgencyBuckets: Bucket[];
  categoryBuckets: Bucket[];
}) {
  return (
    <Panel>
      <PanelTitle
        title="Señales de mantenimiento"
        action={<Wrench className="size-4 text-primary" />}
      />
      <div>
        <SectionLabel label="Urgencia" />
        <div className="mt-3 space-y-3">
          {urgencyBuckets.length === 0 ? (
            <EmptyInline text="Sin incidentes por urgencia." />
          ) : (
            urgencyBuckets.map((item) => (
              <BarRow
                key={item.label}
                label={statusLabel(item.label)}
                value={item.value}
                max={maxValue(urgencyBuckets.map((bucket) => bucket.value))}
                tone={item.label}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-5">
        <SectionLabel label="Categoría" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {categoryBuckets.length === 0 ? (
            <EmptyInline text="Sin categorías reportadas." />
          ) : (
            categoryBuckets.map((item) => (
              <div key={item.label} className="rounded-lg bg-muted/45 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">{categoryLabels[item.label] ?? item.label}</span>
                  <span className="font-semibold tabular-nums">{item.value}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/80">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${barWidth(item.value, maxValue(categoryBuckets.map((bucket) => bucket.value)))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
