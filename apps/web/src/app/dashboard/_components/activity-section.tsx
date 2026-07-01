import { Clock, GitCompareArrows, Package, Search, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";

import { relativeTime } from "./dashboard-calculations";
import { Badge, EmptyState, Panel, PanelTitle, SoftRow } from "./shared";
import type { ActivityItem } from "./types";

export function ActivitySection({ activity, now }: { activity: ActivityItem[]; now: Date }) {
  return (
    <Panel className="border border-[#e7f0f2]">
      <PanelTitle title="Actividad reciente" />
      {activity.length === 0 ? (
        <EmptyState icon={Clock} title="Sin actividad" detail="Todavía no hay movimientos para mostrar." />
      ) : (
        <div className="space-y-2">
          {activity.map((item) => (
            <Link key={item.id} href={item.href} className="block">
              <SoftRow className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <item.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.detail}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">{relativeTime(item.date, now)}</span>
                </span>
                <Badge value={item.status} />
              </SoftRow>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function SystemPulse({
  resolutionRate,
  reports,
  openIncidents,
  activeItems,
  pendingClaims,
  matches,
}: {
  resolutionRate: number;
  reports: number;
  openIncidents: number;
  activeItems: number;
  pendingClaims: number;
  matches: number;
}) {
  const signals = [
    { label: "Incidencias", value: openIncidents, icon: Wrench },
    { label: "Objetos", value: activeItems, icon: Package },
    { label: "Reclamos", value: pendingClaims, icon: ShieldCheck },
    { label: "Matches", value: matches, icon: GitCompareArrows },
  ];

  return (
    <Panel>
      <PanelTitle
        eyebrow="Pulso del sistema"
        title="Cobertura"
        action={<Search className="size-4 text-primary" />}
      />
      <div className="rounded-lg bg-muted/45 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">{resolutionRate}%</p>
            <p className="mt-1 text-xs text-muted-foreground">resolución global</p>
          </div>
          <p className="max-w-44 text-right text-xs leading-5 text-muted-foreground">
            {reports} reportes registrados en el sistema.
          </p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/80">
          <div className="h-full rounded-full bg-primary" style={{ width: `${resolutionRate}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {signals.map((signal) => (
          <div key={signal.label} className="rounded-lg bg-muted/45 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <signal.icon className="size-3.5" />
              {signal.label}
            </div>
            <p className="mt-2 text-xl font-semibold tabular-nums">{signal.value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
