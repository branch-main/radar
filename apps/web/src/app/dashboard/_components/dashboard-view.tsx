import { formatLocation } from "@/lib/supabase/format";

import type { DashboardModel } from "./types";
import { ActivitySection } from "./activity-section";
import { CrmLists } from "./crm-lists";
import { DashboardHero } from "./dashboard-hero";
import { dueBadgeClass, dueLabel } from "./dashboard-calculations";
import { LostFoundSection } from "./lost-found-section";
import { MaintenanceSignals } from "./maintenance-section";
import { Panel, PanelTitle } from "./shared";
import { OperationalMap, TeamLoad } from "./team-section";

export function DashboardView({ model }: { model: DashboardModel }) {
  return (
    <div className="space-y-4 xl:grid xl:h-[calc(100svh-3rem)] xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-4 xl:space-y-0 xl:overflow-hidden">
      <div className="no-scrollbar space-y-4 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
        <DashboardHero model={model} />
        <CrmLists incidents={model.crmIncidents} lostItems={model.crmLostItems} />

        <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
          <MaintenanceSignals
            urgencyBuckets={model.maintenanceByUrgency}
            categoryBuckets={model.maintenanceByCategory}
          />
          <LostFoundSection
            pipeline={model.lostFoundPipeline}
            catalogResolutionRate={model.totals.catalogResolutionRate}
            matchConfirmationRate={model.totals.matchConfirmationRate}
            actionMatches={model.actionMatchesCount}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
          <TeamLoad technicianLoads={model.technicianLoads} />
          <OperationalMap points={model.mapPoints} />
        </section>
      </div>

      <DashboardSideColumn model={model} />
    </div>
  );
}

function DashboardSideColumn({ model }: { model: DashboardModel }) {
  const nextDueIncident = model.nextDueIncident;
  const nextDueLabel = nextDueIncident?.due_at
    ? dueLabel(nextDueIncident.due_at, model.now)
    : "Sin SLA";

  return (
    <aside className="no-scrollbar space-y-4 xl:min-h-0 xl:overflow-y-auto">
      <Panel className="h-fit border border-[#e7f0f2]">
        <PanelTitle title="SLA operativo" />
        <div className="rounded-lg bg-muted/45 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Siguiente SLA
              </p>
              <p className="mt-2 truncate text-sm font-medium">
                {nextDueIncident?.reports?.title ?? "No hay vencimientos programados"}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {nextDueIncident ? formatLocation(nextDueIncident.reports) : "La cola no tiene fechas pendientes."}
              </p>
            </div>
            <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium ${dueBadgeClass(nextDueIncident?.due_at ?? null, model.now)}`}>
              {nextDueLabel}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniStat label="Riesgo" value={model.totals.riskCount} />
          <MiniStat label="Carga" value={model.totals.openWorkload} />
        </div>
      </Panel>

      <ActivitySection activity={model.activity} now={model.now} />
    </aside>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
