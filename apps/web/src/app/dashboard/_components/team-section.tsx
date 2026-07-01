import { Building2, MapPin, Package, Users, Wrench } from "lucide-react";
import Link from "next/link";

import { statusLabel } from "@/lib/supabase/format";

import { barWidth, maxValue } from "./dashboard-calculations";
import { categoryLabels } from "./dashboard-constants";
import { BarRow, EmptyInline, Panel, PanelTitle, SectionLabel } from "./shared";
import type { Bucket, Hotspot, MapPoint, TechnicianLoad } from "./types";

export function TeamLoad({ technicianLoads }: { technicianLoads: TechnicianLoad[] }) {
  const maxAssigned = maxValue(technicianLoads.map((load) => load.assigned));

  return (
    <Panel>
      <PanelTitle title="Capacidad del equipo" action={<Users className="size-4 text-primary" />} />
      <div className="space-y-3">
        {technicianLoads.length === 0 ? (
          <EmptyInline text="No hay técnicos activos o asignaciones abiertas." />
        ) : (
          technicianLoads.map((item) => (
            <div key={item.technician.id} className="rounded-lg bg-muted/45 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.technician.profiles?.full_name || item.technician.profiles?.email || item.technician.id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.technician.specialty ? categoryLabels[item.technician.specialty] : "General"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold tabular-nums">{item.assigned}</p>
                  <p className="text-[11px] text-muted-foreground">asignadas</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/80">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${barWidth(item.assigned, maxAssigned)}%` }}
                />
              </div>
              {item.critical > 0 && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  {item.critical} de alta prioridad
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

export function OperationalMap({ points }: { points: MapPoint[] }) {
  const incidentCount = points.filter((point) => point.type === "incident").length;
  const itemCount = points.filter((point) => point.type === "item").length;

  return (
    <Panel>
      <PanelTitle title="Mapa operativo" action={<MapPin className="size-4 text-primary" />} />
      <div className="relative min-h-[280px] overflow-hidden rounded-xl border bg-[#e8f1f0]">
        <MapArtwork />
        <div className="absolute left-4 top-4 z-10 rounded-lg bg-white/80 px-3 py-2 text-xs text-slate-600 backdrop-blur">
          <p className="font-semibold text-slate-800">Incidencias y objetos activos</p>
          <p className="mt-1">{incidentCount} incidencias, {itemCount} objetos</p>
        </div>

        {points.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center p-5 text-center">
            <div className="rounded-lg bg-white/90 p-4 text-sm text-muted-foreground">
              No hay señales activas para ubicar.
            </div>
          </div>
        ) : (
          points.map((point) => (
            <Link
              key={point.id}
              href={point.href}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 outline-none transition hover:z-30 hover:scale-105 focus:z-30 focus:scale-105"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              title={`${point.title} · ${point.detail}`}
            >
              <span className={`relative flex size-8 items-center justify-center rounded-lg ${point.type === "incident" ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"}`}>
                <span className={`absolute inset-[-5px] rounded-full ${point.type === "incident" ? "bg-amber-500/18" : "bg-primary/16"}`} />
                {point.type === "incident" ? <Wrench className="relative size-4" /> : <Package className="relative size-4" />}
              </span>
            </Link>
          ))
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/45 p-2.5">
          <div className="flex items-center gap-2 text-muted-foreground"><Wrench className="size-3.5" />Incidencias</div>
          <p className="mt-1 text-base font-semibold tabular-nums">{incidentCount}</p>
        </div>
        <div className="rounded-lg bg-muted/45 p-2.5">
          <div className="flex items-center gap-2 text-muted-foreground"><Package className="size-3.5" />Objetos</div>
          <p className="mt-1 text-base font-semibold tabular-nums">{itemCount}</p>
        </div>
      </div>
    </Panel>
  );
}

function MapArtwork() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,144,184,0.16),transparent_26%),radial-gradient(circle_at_74%_76%,rgba(15,23,42,0.12),transparent_28%)]" />
      <div className="absolute left-[8%] top-[18%] h-[16%] w-[30%] rounded-lg border border-slate-400/25 bg-white/35 rotate-[-8deg]" />
      <div className="absolute right-[12%] top-[16%] h-[22%] w-[24%] rounded-lg border border-slate-400/25 bg-white/40 rotate-[7deg]" />
      <div className="absolute bottom-[14%] left-[18%] h-[24%] w-[28%] rounded-lg border border-slate-400/25 bg-white/35 rotate-[6deg]" />
      <div className="absolute bottom-[20%] right-[18%] h-[18%] w-[26%] rounded-lg border border-slate-400/25 bg-white/35 rotate-[-6deg]" />
      <div className="absolute left-[6%] right-[8%] top-1/2 h-8 -translate-y-1/2 rounded-full bg-white/45 rotate-[-5deg]" />
      <div className="absolute bottom-[8%] left-1/2 top-[8%] w-8 -translate-x-1/2 rounded-full bg-white/40 rotate-[12deg]" />
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(15,23,42,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.18)_1px,transparent_1px)] [background-size:36px_36px]" />
    </div>
  );
}

export function Hotspots({
  hotspots,
  reportStatusBuckets,
}: {
  hotspots: Hotspot[];
  reportStatusBuckets: Bucket[];
}) {
  return (
    <Panel>
      <PanelTitle title="Mapa de señales" action={<Building2 className="size-4 text-primary" />} />
      <div>
        <SectionLabel label="Hotspots" />
        <div className="mt-3 space-y-3">
          {hotspots.length === 0 ? (
            <EmptyInline text="Sin reportes por edificio." />
          ) : (
            hotspots.map((item) => (
              <BarRow
                key={item.building}
                label={item.building}
                value={item.count}
                max={maxValue(hotspots.map((building) => building.count))}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-5">
        <SectionLabel label="Estados" />
        <div className="mt-3 flex flex-wrap gap-2">
          {reportStatusBuckets.length === 0 ? (
            <span className="text-sm text-muted-foreground">Sin estados registrados.</span>
          ) : (
            reportStatusBuckets.map((item) => (
              <span key={item.label} className="rounded-lg bg-muted/45 px-3 py-1.5 text-xs text-muted-foreground">
                {statusLabel(item.label)} · {item.value}
              </span>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
