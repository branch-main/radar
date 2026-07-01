import { formatLocation } from "@/lib/supabase/format";

import { ActionQueue } from "./action-queue";
import { ActivitySection, SystemPulse } from "./activity-section";
import type { DashboardModel } from "./types";
import { CrmLists } from "./crm-lists";
import { DashboardHero } from "./dashboard-hero";
import { dueBadgeClass, dueLabel } from "./dashboard-calculations";
import { LostFoundSection } from "./lost-found-section";
import { MaintenanceSignals } from "./maintenance-section";
import { OperationalHealth } from "./operational-health";
import { PriorityIncidents } from "./priority-incidents";
import { Panel, PanelTitle } from "./shared";
import { Hotspots, OperationalMap, TeamLoad } from "./team-section";

export function DashboardView({ model }: { model: DashboardModel }) {
  return (
    <div className="space-y-6 xl:flex xl:h-[calc(100svh-4rem)] xl:min-h-0 xl:flex-col xl:space-y-0 xl:overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between xl:shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vista operativa para priorizar incidencias, SLA, objetos perdidos y carga del equipo.
          </p>
        </div>
      </div>

      <div className="space-y-4 xl:mt-6 xl:grid xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-4 xl:space-y-0 xl:overflow-hidden">
        <div className="no-scrollbar space-y-4 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          <DashboardHero model={model} />

          <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
            <ActionQueue queue={model.actionQueue} />
            <OperationalHealth
              healthScore={model.totals.healthScore}
              riskCount={model.totals.riskCount}
              resolutionRate={model.totals.resolutionRate}
            />
          </section>

          <PriorityIncidents incidents={model.priorityIncidents} now={model.now} />

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

          <CrmLists incidents={model.crmIncidents} lostItems={model.crmLostItems} />
        </div>

        <DashboardSideColumn model={model} />
      </div>
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
          <MiniStat label="Vencidas" value={model.totals.overdueIncidents} />
          <MiniStat label="Por vencer" value={model.totals.dueSoonIncidents} />
          <MiniStat label="Sin técnico" value={model.totals.unassignedIncidents} />
          <MiniStat label="Cola máx." value={`${model.totals.oldestOpenDays}d`} />
        </div>
      </Panel>

      <SystemPulse
        resolutionRate={model.totals.resolutionRate}
        reports={model.totals.reports}
        openIncidents={model.totals.openIncidents}
        activeItems={model.totals.activeItems}
        pendingClaims={model.totals.pendingClaims}
        matches={model.totals.actionMatches}
      />

      <Hotspots hotspots={model.buildingHotspots} reportStatusBuckets={model.reportStatusBuckets} />
      <ActivitySection activity={model.activity} now={model.now} />
    </aside>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-muted/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
