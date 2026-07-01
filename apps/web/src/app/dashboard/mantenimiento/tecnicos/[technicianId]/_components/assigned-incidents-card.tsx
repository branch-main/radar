"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Wrench, X } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { badgeClass, formatDateTime, formatLocation, statusLabel } from "@/lib/supabase/format";
import type { MaintenanceIncident } from "@/lib/supabase/types";

const categoryLabels: Record<string, string> = {
  electrical: "Eléctrico",
  plumbing: "Gasfitería",
  cleaning: "Limpieza",
  hvac: "Climatización",
  infrastructure: "Infraestructura",
  security: "Seguridad",
  other: "Otro",
};

export function AssignedIncidentsCard({
  incidents,
  now,
}: {
  incidents: MaintenanceIncident[];
  now: string;
}) {
  const currentDate = new Date(now);

  return (
    <Card className="gap-0 py-0">
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-base leading-snug font-semibold tracking-tight">Incidencias</h2>
      </div>
      <CardContent className="px-0 pt-0">
        {incidents.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Wrench className="size-5" />
            </div>
            <p className="text-sm font-medium">Sin incidencias asignadas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Este técnico no tiene historial de incidencias en el panel.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {incidents.map((incident) => (
              <IncidentDialogRow key={incident.report_id} incident={incident} now={currentDate} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IncidentDialogRow({ incident, now }: { incident: MaintenanceIncident; now: Date }) {
  const status = incident.reports?.status ?? "classified";
  const title = incident.reports?.title ?? "Incidencia sin título";

  return (
    <Dialog.Root>
      <Dialog.Trigger
        render={
          <button
            type="button"
            className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none md:grid-cols-[minmax(0,1fr)_auto]"
          />
        }
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{title}</span>
            <Badge value={status} />
            <Badge value={incident.urgency} />
          </span>
          <span className="mt-1 block line-clamp-1 text-sm text-muted-foreground">
            {incident.reports?.description || "Sin descripción registrada."}
          </span>
          <span className="mt-2 block text-xs text-muted-foreground">
            {formatLocation(incident.reports)} · Actualizada {formatDateTime(incident.updated_at)}
          </span>
        </span>
        <span className="flex items-start justify-end md:min-w-36">
          <span className={`rounded-lg px-2 py-1 text-[11px] font-medium ${dueBadgeClass(incident.due_at, now)}`}>
            {dueLabel(incident.due_at, now)}
          </span>
        </span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/15 backdrop-blur-[1px] transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[min(720px,calc(100vh-2rem))] w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <IncidentReadonlyDetail incident={incident} now={now} />
          <Dialog.Close
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-3 top-3"
              />
            }
          >
            <X className="size-4" />
            <span className="sr-only">Cerrar</span>
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function IncidentReadonlyDetail({ incident, now }: { incident: MaintenanceIncident; now: Date }) {
  const report = incident.reports;
  const status = report?.status ?? "classified";
  const title = report?.title ?? "Incidencia sin título";
  const confidence = Math.round(Number(report?.ai_confidence ?? 0) * 100);
  const location = formatLocation(report);
  const zone = report?.campus_zones;

  return (
    <div>
      <div className="border-b border-border px-4 py-4 pr-12">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Dialog.Title className="text-xs font-medium text-muted-foreground">Detalle</Dialog.Title>
            <h2 className="mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight">
              {title}
            </h2>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge value={status} />
            <Badge value={incident.urgency} />
          </div>
        </div>
        <Dialog.Description className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {report?.description || "Sin descripción registrada."}
        </Dialog.Description>
      </div>

      <div className="space-y-4 p-4">
        {report?.photo_url && (
          <a
            href={report.photo_url}
            target="_blank"
            rel="noreferrer"
            className="relative block aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted"
          >
            <Image
              src={report.photo_url}
              alt={title}
              fill
              sizes="560px"
              className="object-cover"
            />
          </a>
        )}

        <DetailSection title="Resumen">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-muted/25 p-3">
            <DetailField label="Estado" value={statusLabel(status)} />
            <DetailField label="Urgencia" value={statusLabel(incident.urgency)} />
            <DetailField label="Categoría" value={categoryLabel(incident.category)} />
            <DetailField label="SLA" value={dueLabel(incident.due_at, now)} />
            <DetailField label="Confianza" value={`${confidence}%`} />
            <DetailField label="Reporte" value={shortReportId(incident.report_id)} />
          </div>
        </DetailSection>

        <DetailSection title="Ubicación">
          <div className="divide-y divide-border rounded-xl border border-border bg-muted/25">
            <DetailRow label="Ubicación" value={location} />
            {zone && <DetailRow label="Edificio" value={zone.building} />}
            {zone?.floor && <DetailRow label="Piso" value={zone.floor} />}
          </div>
        </DetailSection>

        <DetailSection title="Notas">
          <div className="space-y-3 rounded-xl border border-border bg-muted/25 p-3">
            <DetailNote label="Descripción" value={report?.description || "Sin descripción registrada."} />
            <DetailNote label="Clasificación" value={report?.classification_reason || "Sin clasificación registrada."} />
          </div>
        </DetailSection>

        <DetailSection title="Actividad">
          <div className="divide-y divide-border rounded-xl border border-border bg-muted/25">
            <DetailRow label="Creado" value={formatDateTime(incident.created_at)} />
            <DetailRow label="Actualizado" value={formatDateTime(incident.updated_at)} />
            <DetailRow label="Vence" value={incident.due_at ? formatDateTime(incident.due_at) : "Sin fecha definida"} />
            <DetailRow label="Cierre" value={incident.completed_at ? formatDateTime(incident.completed_at) : "Pendiente"} />
          </div>
        </DetailSection>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 px-3 py-2.5 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-foreground">{value}</span>
    </div>
  );
}

function DetailNote({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium ${badgeClass(value)}`}>
      {statusLabel(value)}
    </span>
  );
}

function categoryLabel(value: string) {
  return categoryLabels[value] ?? value;
}

function dueLabel(value: string | null, now: Date) {
  if (!value) return "Sin SLA";
  const dueAt = new Date(value).getTime();
  const diff = dueAt - now.getTime();
  if (diff < 0) return "Vencida";
  if (diff <= 24 * 60 * 60 * 1000) return "Por vencer";
  return formatDateTime(value);
}

function dueBadgeClass(value: string | null, now: Date) {
  if (!value) return "bg-muted text-muted-foreground";
  const dueAt = new Date(value).getTime();
  const diff = dueAt - now.getTime();
  if (diff < 0) return "bg-destructive/10 text-destructive";
  if (diff <= 24 * 60 * 60 * 1000) return "bg-amber-500/10 text-amber-700";
  return "bg-emerald-500/10 text-emerald-700";
}

function shortReportId(value: string) {
  return value.slice(0, 8);
}
