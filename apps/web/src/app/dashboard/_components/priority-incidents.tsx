import { ArrowRight, CheckCircle2, MapPin } from "lucide-react";
import Link from "next/link";

import { formatDateTime, formatLocation } from "@/lib/supabase/format";
import type { MaintenanceIncident } from "@/lib/supabase/types";

import { categoryLabels } from "./dashboard-constants";
import { dueBadgeClass, dueLabel, isDueSoon, isOverdue, urgencyDotClass } from "./dashboard-calculations";
import { Badge, EmptyState, Panel, PanelTitle, SoftRow } from "./shared";

export function PriorityIncidents({ incidents, now }: { incidents: MaintenanceIncident[]; now: Date }) {
  return (
    <Panel>
      <PanelTitle
        eyebrow="Mantenimiento"
        title="Cola crítica"
        action={
          <Link href="/dashboard/mantenimiento/incidencias" className="inline-flex items-center gap-1 rounded-lg bg-muted/45 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
            Ver todo
            <ArrowRight className="size-3.5" />
          </Link>
        }
      />

      {incidents.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No hay incidencias abiertas" detail="La cola de mantenimiento está limpia." />
      ) : (
        <div className="space-y-2">
          {incidents.map((incident) => (
            <Link key={incident.report_id} href="/dashboard/mantenimiento/incidencias" className="block">
              <SoftRow className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`size-2 rounded-full ${urgencyDotClass(incident.urgency)}`} />
                    <h3 className="truncate text-sm font-medium">
                      {incident.reports?.title ?? "Incidencia sin título"}
                    </h3>
                    <Badge value={incident.urgency} />
                    <Badge value={incident.reports?.status ?? "classified"} />
                    <span className="rounded-lg bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {priorityReason(incident, now)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {incident.reports?.description ?? "Sin descripción"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {formatLocation(incident.reports)}
                    </span>
                    <span>{categoryLabels[incident.category] ?? incident.category}</span>
                    <span>{incident.assigned_to ? "Asignada" : "Sin asignar"}</span>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1 lg:items-end">
                  <span className={`rounded-lg px-2 py-1 text-[11px] font-medium ${dueBadgeClass(incident.due_at, now)}`}>
                    {dueLabel(incident.due_at, now)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {incident.due_at ? formatDateTime(incident.due_at) : "Sin vencimiento"}
                  </span>
                </div>
              </SoftRow>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

function priorityReason(incident: MaintenanceIncident, now: Date) {
  if (isOverdue(incident.due_at, now)) return "SLA vencida";
  if (incident.urgency === "critical") return "Crítica";
  if (!incident.assigned_to) return "Sin técnico";
  if (isDueSoon(incident.due_at, now)) return "Por vencer";
  if (incident.urgency === "high") return "Alta";
  return "Seguimiento";
}
