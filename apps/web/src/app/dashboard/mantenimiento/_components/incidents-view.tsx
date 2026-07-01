"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FilterX,
  ImageIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  UserRoundCheck,
  Wrench,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";

import { updateMaintenanceAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { badgeClass, formatLocation, statusLabel } from "@/lib/supabase/format";
import type { MaintenanceIncident, Technician } from "@/lib/supabase/types";

type Option = readonly [string, string];
type DueFilter = "all" | "overdue" | "today" | "none";
type DueState = "scheduled" | "overdue" | "today" | "none";
type AssignmentFilter = "all" | "assigned" | "unassigned";
type SortMode = "priority" | "newest" | "oldest" | "due";

type IncidentsViewProps = {
  incidents: MaintenanceIncident[];
  technicians: Technician[];
  renderedAt: string;
};

type IncidentListItem = {
  incident: MaintenanceIncident;
  technician: string;
  location: string;
  status: string;
  haystack: string;
  dueState: DueState;
  priority: number;
};

const statusOptions = [
  ["classified", "Clasificado"],
  ["assigned", "Asignado"],
  ["in_progress", "En progreso"],
  ["resolved", "Resuelto"],
  ["closed", "Cerrado"],
  ["cancelled", "Cancelado"],
] satisfies Option[];

const urgencyOptions = [
  ["low", "Baja"],
  ["medium", "Media"],
  ["high", "Alta"],
  ["critical", "Crítica"],
] satisfies Option[];

const categoryOptions = [
  ["electrical", "Eléctrico"],
  ["plumbing", "Gasfitería"],
  ["cleaning", "Limpieza"],
  ["hvac", "Climatización"],
  ["infrastructure", "Infraestructura"],
  ["security", "Seguridad"],
  ["other", "Otro"],
] satisfies Option[];

const closedStatuses = new Set(["resolved", "closed", "cancelled"]);
const openStatuses = new Set(["classified", "assigned", "in_progress", "new"]);
const spanishMonths = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];

export function IncidentsView({ incidents, technicians, renderedAt }: IncidentsViewProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [urgency, setUrgency] = useState("all");
  const [category, setCategory] = useState("all");
  const [assignment, setAssignment] = useState<AssignmentFilter>("all");
  const [due, setDue] = useState<DueFilter>("all");
  const [sort, setSort] = useState<SortMode>("priority");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const now = useMemo(() => new Date(renderedAt), [renderedAt]);
  const activeTechnicians = useMemo(() => technicians.filter((technician) => technician.active), [technicians]);
  const normalizedQuery = normalize(query);

  const enrichedIncidents = useMemo<IncidentListItem[]>(
    () =>
      incidents.map((incident) => {
        const technician = technicianLabel(activeTechnicians, incident.assigned_to);
        const location = formatLocation(incident.reports);
        const statusValue = incident.reports?.status ?? "classified";
        const haystack = normalize(
          [
            incident.report_id,
            incident.reports?.title,
            incident.reports?.description,
            statusValue,
            incident.category,
            categoryLabel(incident.category),
            incident.urgency,
            location,
            technician,
            incident.reports?.classification_reason,
          ].join(" "),
        );

        return {
          incident,
          technician,
          location,
          status: statusValue,
          haystack,
          dueState: dueState(incident.due_at, now),
          priority: incidentPriority(incident, now),
        };
      }),
    [activeTechnicians, incidents, now],
  );

  const filteredIncidents = useMemo(() => {
    return enrichedIncidents
      .filter((item) => {
        if (normalizedQuery && !item.haystack.includes(normalizedQuery)) return false;
        if (status !== "all" && item.status !== status) return false;
        if (urgency !== "all" && item.incident.urgency !== urgency) return false;
        if (category !== "all" && item.incident.category !== category) return false;
        if (assignment === "assigned" && !item.incident.assigned_to) return false;
        if (assignment === "unassigned" && item.incident.assigned_to) return false;
        if (due !== "all" && item.dueState !== due) return false;
        return true;
      })
      .sort((left, right) => sortIncidents(left, right, sort));
  }, [assignment, category, due, enrichedIncidents, normalizedQuery, sort, status, urgency]);

  const selectedItem = filteredIncidents.find((item) => item.incident.report_id === selectedReportId) ?? filteredIncidents[0];
  const selectedId = selectedItem?.incident.report_id;
  const openIncidents = incidents.filter((incident) => openStatuses.has(incident.reports?.status ?? "classified"));
  const criticalIncidents = openIncidents.filter((incident) => incident.urgency === "critical");
  const unassignedIncidents = openIncidents.filter((incident) => !incident.assigned_to);
  const overdueIncidents = openIncidents.filter((incident) => dueState(incident.due_at, now) === "overdue");
  const hasFilters = Boolean(
    query ||
      status !== "all" ||
      urgency !== "all" ||
      category !== "all" ||
      assignment !== "all" ||
      due !== "all" ||
      sort !== "priority",
  );

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setUrgency("all");
    setCategory("all");
    setAssignment("all");
    setDue("all");
    setSort("priority");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Incidencias</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            CRM operativo para revisar, filtrar y actualizar reportes de mantenimiento desde el detalle.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Abiertas" value={openIncidents.length} icon={AlertTriangle} />
          <MetricCard label="Críticas" value={criticalIncidents.length} icon={Clock3} />
          <MetricCard label="Sin técnico" value={unassignedIncidents.length} icon={Wrench} />
          <MetricCard label="Vencidas" value={overdueIncidents.length} icon={CalendarClock} />
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título, ubicación, técnico, categoría o ID..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <SelectControl value={status} onChange={setStatus} options={[["all", "Estado"], ...statusOptions]} />
            <SelectControl value={urgency} onChange={setUrgency} options={[["all", "Urgencia"], ...urgencyOptions]} />
            <SelectControl value={category} onChange={setCategory} options={[["all", "Categoría"], ...categoryOptions]} />
            <SelectControl
              value={assignment}
              onChange={(value) => setAssignment(value as AssignmentFilter)}
              options={[
                ["all", "Asignación"],
                ["assigned", "Asignadas"],
                ["unassigned", "Sin técnico"],
              ]}
            />
            <SelectControl
              value={due}
              onChange={(value) => setDue(value as DueFilter)}
              options={[
                ["all", "SLA"],
                ["overdue", "Vencidas"],
                ["today", "Por vencer"],
                ["none", "Sin fecha"],
              ]}
            />
            <SelectControl
              value={sort}
              onChange={(value) => setSort(value as SortMode)}
              options={[
                ["priority", "Prioridad"],
                ["newest", "Recientes"],
                ["oldest", "Antiguas"],
                ["due", "SLA próximo"],
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="size-4" />
            <span>
              {filteredIncidents.length} de {incidents.length} incidencias visibles
            </span>
          </div>
          {hasFilters && (
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              <FilterX className="size-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </section>

      {filteredIncidents.length === 0 ? (
        <section className="overflow-hidden rounded-[1.75rem] border border-[#e7f0f2] bg-white/90">
          <EmptyState hasIncidents={incidents.length > 0} onClear={clearFilters} />
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-[1.75rem] border border-[#e7f0f2] bg-white/90">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Lista de incidencias</h2>
                <p className="mt-1 text-xs text-muted-foreground">Tabla informativa. Selecciona una fila para editar en el detalle.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-muted-foreground">
                {filteredIncidents.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2.5">Reporte</th>
                    <th className="px-2.5 py-2.5">Incidencia</th>
                    <th className="px-2.5 py-2.5">Ubicación</th>
                    <th className="px-2.5 py-2.5">Estado</th>
                    <th className="px-2.5 py-2.5">Urgencia</th>
                    <th className="px-2.5 py-2.5">Categoría</th>
                    <th className="px-2.5 py-2.5">Técnico</th>
                    <th className="px-2.5 py-2.5">SLA</th>
                    <th className="px-2.5 py-2.5">IA</th>
                    <th className="px-4 py-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIncidents.map((item) => (
                    <IncidentRow
                      key={item.incident.report_id}
                      item={item}
                      now={now}
                      selected={item.incident.report_id === selectedId}
                      onSelect={() => setSelectedReportId(item.incident.report_id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selectedItem && (
            <IncidentDetail item={selectedItem} technicians={activeTechnicians} now={now} />
          )}
        </div>
      )}
    </div>
  );
}

function IncidentRow({
  item,
  now,
  selected,
  onSelect,
}: {
  item: IncidentListItem;
  now: Date;
  selected: boolean;
  onSelect: () => void;
}) {
  const { incident, technician, location, status, dueState: due } = item;
  const confidence = Math.round(Number(incident.reports?.ai_confidence ?? 0) * 100);

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer bg-white transition hover:bg-slate-50/90 ${selected ? "bg-primary/5" : ""}`}
    >
      <td className="px-4 py-2.5 align-middle">
        <button type="button" onClick={onSelect} className="text-left font-mono text-xs font-medium text-slate-500 hover:text-primary">
          {shortId(incident.report_id)}
        </button>
        <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(incident.created_at)}</div>
      </td>
      <td className="max-w-[300px] px-2.5 py-2.5 align-middle">
        <div className="flex items-start gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-muted-foreground">
            {incident.reports?.photo_url ? <ImageIcon className="size-5" /> : <AlertTriangle className="size-5" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{incident.reports?.title ?? "Incidencia sin título"}</p>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {incident.reports?.description || "Sin descripción registrada."}
            </p>
          </div>
        </div>
      </td>
      <td className="max-w-[180px] px-2.5 py-2.5 align-middle">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      </td>
      <td className="px-2.5 py-2.5 align-middle">
        <Badge value={status} />
      </td>
      <td className="px-2.5 py-2.5 align-middle">
        <Badge value={incident.urgency} />
      </td>
      <td className="px-2.5 py-2.5 align-middle text-sm text-muted-foreground">{categoryLabel(incident.category)}</td>
      <td className="max-w-[160px] px-2.5 py-2.5 align-middle">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <UserRoundCheck className="size-3.5 shrink-0" />
          <span className="truncate">{technician}</span>
        </div>
      </td>
      <td className="px-2.5 py-2.5 align-middle">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${dueBadgeClass(due)}`}>
          {dueLabel(due)}{incident.due_at ? `, ${relativeDueLabel(incident.due_at, now)}` : ""}
        </span>
      </td>
      <td className="px-2.5 py-2.5 align-middle">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span className="font-medium tabular-nums">{confidence}%</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right align-middle">
        <Button type="button" variant={selected ? "default" : "outline"} size="sm" onClick={onSelect}>
          Detalle
        </Button>
      </td>
    </tr>
  );
}

function IncidentDetail({ item, technicians, now }: { item: IncidentListItem; technicians: Technician[]; now: Date }) {
  const { incident, technician, location, status, dueState: due } = item;
  const confidence = Math.round(Number(incident.reports?.ai_confidence ?? 0) * 100);

  return (
    <aside className="rounded-[1.75rem] border border-[#e7f0f2] bg-white/90 xl:sticky xl:top-6 xl:self-start">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Detalle editable</p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">{incident.reports?.title ?? "Incidencia sin título"}</h2>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{incident.report_id}</p>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-3 text-sm">
          <InfoLine label="Descripción" value={incident.reports?.description || "Sin descripción registrada."} />
          <InfoLine label="Ubicación" value={location} />
          <InfoLine label="Técnico actual" value={technician} />
          <InfoLine label="Clasificación" value={incident.reports?.classification_reason ?? "Sin clasificación"} />
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Estado" value={statusLabel(status)} />
            <MiniStat label="Urgencia" value={statusLabel(incident.urgency)} />
            <MiniStat label="SLA" value={dueLabel(due)} />
            <MiniStat label="IA" value={`${confidence}%`} />
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <p>Creado: {formatDateTime(incident.created_at)}</p>
            <p>Actualizado: {formatDateTime(incident.updated_at)}</p>
            <p>Completado: {incident.completed_at ? formatDateTime(incident.completed_at) : "Pendiente"}</p>
            {incident.due_at && <p>Vence: {formatDateTime(incident.due_at)} ({relativeDueLabel(incident.due_at, now)})</p>}
          </div>
          {incident.reports?.photo_url && (
            <a
              href={incident.reports.photo_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ImageIcon className="size-4" />
              Ver foto del reporte
            </a>
          )}
        </div>

        <form action={updateMaintenanceAction} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <input type="hidden" name="report_id" value={incident.report_id} />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Editar incidencia</p>
              <p className="mt-1 text-xs text-muted-foreground">Los cambios se guardan solo para este reporte.</p>
            </div>
            <Wrench className="size-4 text-muted-foreground" />
          </div>

          <FieldSelect label="Estado" name="status" defaultValue={status} options={statusOptions} />
          <FieldSelect label="Urgencia" name="urgency" defaultValue={incident.urgency} options={urgencyOptions} />
          <FieldSelect label="Categoría" name="category" defaultValue={incident.category} options={categoryOptions} />
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            Técnico
            <select
              name="assigned_to"
              defaultValue={incident.assigned_to ?? ""}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              <option value="">Sin asignar</option>
              {technicians.map((item) => (
                <option key={item.id} value={item.id}>
                  {technicianName(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            Vence
            <input
              type="datetime-local"
              name="due_at"
              defaultValue={dateTimeLocalValue(incident.due_at)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <Button type="submit" className="w-full">
            Guardar cambios
          </Button>
        </form>
      </div>
    </aside>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="min-w-28 px-1 py-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-4 text-primary" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function SelectControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

function FieldSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Option[];
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
      >
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 leading-6 text-foreground">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function EmptyState({ hasIncidents, onClear }: { hasIncidents: boolean; onClear: () => void }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-muted-foreground">
        <Search className="size-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasIncidents ? "No encontramos incidencias" : "No hay incidencias de mantenimiento"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasIncidents
          ? "Prueba con otro texto o limpia los filtros para volver a ver toda la tabla."
          : "Cuando se registren reportes de mantenimiento aparecerán en este tablero."}
      </p>
      {hasIncidents && (
        <Button type="button" variant="outline" className="mt-4" onClick={onClear}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${badgeClass(value)}`}>{statusLabel(value)}</span>;
}

function technicianLabel(technicians: Technician[], technicianId: string | null) {
  if (!technicianId) return "Sin asignar";
  const technician = technicians.find((item) => item.id === technicianId);
  return technician ? technicianName(technician) : technicianId;
}

function technicianName(technician: Technician) {
  return technician.profiles?.full_name || technician.profiles?.email || technician.id;
}

function categoryLabel(value: string) {
  return categoryOptions.find(([optionValue]) => optionValue === value)?.[1] ?? value;
}

function formatDateTime(value: string) {
  const parts = datePartsInLima(value);
  const hour12 = parts.hour % 12 || 12;
  const period = parts.hour >= 12 ? "p. m." : "a. m.";
  return `${parts.day} ${spanishMonths[parts.month - 1]} ${parts.year}, ${hour12}:${String(parts.minute).padStart(2, "0")} ${period}`;
}

function datePartsInLima(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function dateTimeLocalValue(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function dueState(value: string | null, now: Date): DueState {
  if (!value) return "none";
  const dueAt = new Date(value).getTime();
  const diff = dueAt - now.getTime();
  if (diff < 0) return "overdue";
  if (diff <= 24 * 60 * 60 * 1000) return "today";
  return "scheduled";
}

function dueLabel(value: DueState) {
  if (value === "overdue") return "Vencida";
  if (value === "today") return "Por vencer";
  if (value === "none") return "Sin SLA";
  return "En plazo";
}

function dueBadgeClass(value: DueState) {
  if (value === "overdue") return "bg-destructive/10 text-destructive";
  if (value === "today") return "bg-amber-500/10 text-amber-700";
  if (value === "none") return "bg-slate-100 text-muted-foreground";
  return "bg-emerald-500/10 text-emerald-700";
}

function relativeDueLabel(value: string, now: Date) {
  const diff = new Date(value).getTime() - now.getTime();
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 1) return "ahora";
  if (Math.abs(minutes) < 60) return relativeLabel(minutes, "minuto");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeLabel(hours, "hora");
  return relativeLabel(Math.round(hours / 24), "día");
}

function relativeLabel(value: number, unit: "minuto" | "hora" | "día") {
  const amount = Math.abs(value);
  const plural = amount === 1 ? unit : unit === "día" ? "días" : `${unit}s`;
  return value > 0 ? `en ${amount} ${plural}` : `hace ${amount} ${plural}`;
}

function incidentPriority(incident: MaintenanceIncident, now: Date) {
  let score = 0;
  if (!incident.assigned_to) score += 30;
  if (incident.urgency === "critical") score += 100;
  if (incident.urgency === "high") score += 70;
  if (dueState(incident.due_at, now) === "overdue") score += 120;
  if (dueState(incident.due_at, now) === "today") score += 45;
  if (closedStatuses.has(incident.reports?.status ?? "")) score -= 100;
  return score;
}

function sortIncidents(
  left: { incident: MaintenanceIncident; priority: number },
  right: { incident: MaintenanceIncident; priority: number },
  sort: SortMode,
) {
  if (sort === "newest") {
    return new Date(right.incident.created_at).getTime() - new Date(left.incident.created_at).getTime();
  }
  if (sort === "oldest") {
    return new Date(left.incident.created_at).getTime() - new Date(right.incident.created_at).getTime();
  }
  if (sort === "due") {
    return dueSortValue(left.incident.due_at) - dueSortValue(right.incident.due_at);
  }
  return right.priority - left.priority || new Date(right.incident.created_at).getTime() - new Date(left.incident.created_at).getTime();
}

function dueSortValue(value: string | null) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function shortId(value: string) {
  return value.length > 10 ? value.slice(0, 10) : value;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
