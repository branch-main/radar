import type { Metadata } from "next";
import { getMaintenanceIncidents, getTechnicians } from "@/lib/supabase/dashboard";
import { formatLocation, statusLabel } from "@/lib/supabase/format";
import type { MaintenanceIncident, Technician } from "@/lib/supabase/types";

import {
  IncidentsView,
  type AssignmentFilter,
  type DueFilter,
  type IncidentFiltersState,
  type SortMode,
} from "../_components/incidents-view";

export const metadata: Metadata = {
  title: "Incidencias",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const pageSize = 12;
const closedStatuses = new Set(["resolved", "closed", "cancelled"]);

export default async function MantenimientoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const [incidents, technicians] = await Promise.all([
    getMaintenanceIncidents(),
    getTechnicians(),
  ]);
  const renderedAt = new Date().toISOString();
  const initialFilters: IncidentFiltersState = {
    query: paramValue(params, "q"),
    status: paramValue(params, "status", "all"),
    urgency: paramValue(params, "urgency", "all"),
    category: paramValue(params, "category", "all"),
    assignment: assignmentFilter(paramValue(params, "assignment", "all")),
    due: dueFilter(paramValue(params, "due", "all")),
    dateFrom: paramValue(params, "from"),
    dateTo: paramValue(params, "to"),
    sort: sortMode(paramValue(params, "sort", "priority")),
    page: positiveInteger(paramValue(params, "page"), 1),
  };
  const filteredIncidents = filterIncidents(incidents, technicians, initialFilters, new Date(renderedAt));
  const pageCount = Math.max(1, Math.ceil(filteredIncidents.length / pageSize));
  const activePage = Math.min(initialFilters.page, pageCount);
  const paginatedIncidents = filteredIncidents.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );

  return (
    <IncidentsView
      incidents={paginatedIncidents}
      technicians={technicians}
      renderedAt={renderedAt}
      initialFilters={{ ...initialFilters, page: activePage }}
      totalItems={filteredIncidents.length}
      allItemsCount={incidents.length}
      pageCount={pageCount}
    />
  );
}

function paramValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback = "",
) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function positiveInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function assignmentFilter(value: string): AssignmentFilter {
  if (value === "assigned" || value === "unassigned") return value;
  return "all";
}

function dueFilter(value: string): DueFilter {
  if (value === "overdue" || value === "today" || value === "none") return value;
  return "all";
}

function sortMode(value: string): SortMode {
  if (value === "newest" || value === "oldest" || value === "due") return value;
  return "priority";
}

function filterIncidents(
  incidents: MaintenanceIncident[],
  technicians: Technician[],
  filters: IncidentFiltersState,
  now: Date,
) {
  const normalizedQuery = normalize(filters.query);

  return incidents
    .filter((incident) => {
      const status = incident.reports?.status ?? "classified";
      const due = dueState(incident.due_at, now);
      const createdDate = dateKeyInLima(incident.created_at);
      const technician = technicianLabel(technicians, incident.assigned_to);
      const haystack = normalize(
        [
          incident.report_id,
          incident.reports?.title,
          incident.reports?.description,
          status,
          incident.category,
          categoryLabel(incident.category),
          incident.urgency,
          statusLabel(incident.urgency),
          formatLocation(incident.reports),
          technician,
          incident.reports?.classification_reason,
        ].join(" "),
      );

      if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
      if (filters.status !== "all" && status !== filters.status) return false;
      if (filters.urgency !== "all" && incident.urgency !== filters.urgency) return false;
      if (filters.category !== "all" && incident.category !== filters.category) return false;
      if (filters.assignment === "assigned" && !incident.assigned_to) return false;
      if (filters.assignment === "unassigned" && incident.assigned_to) return false;
      if (filters.due !== "all" && due !== filters.due) return false;
      if (filters.dateFrom && createdDate < filters.dateFrom) return false;
      if (filters.dateTo && createdDate > filters.dateTo) return false;
      return true;
    })
    .sort((left, right) => sortIncidents(left, right, filters.sort, now));
}

function technicianLabel(technicians: Technician[], technicianId: string | null) {
  if (!technicianId) return "Sin asignar";
  const technician = technicians.find((item) => item.id === technicianId);
  return technician?.profiles?.full_name || technician?.profiles?.email || technicianId;
}

function categoryLabel(value: string) {
  const labels: Record<string, string> = {
    electrical: "Eléctrico",
    plumbing: "Gasfitería",
    cleaning: "Limpieza",
    hvac: "Climatización",
    infrastructure: "Infraestructura",
    security: "Seguridad",
    other: "Otro",
  };
  return labels[value] ?? value;
}

function dueState(value: string | null, now: Date) {
  if (!value) return "none";
  const dueTime = new Date(value).getTime();
  const diffHours = (dueTime - now.getTime()) / 36e5;
  if (diffHours < 0) return "overdue";
  if (diffHours <= 24) return "today";
  return "scheduled";
}

function dateKeyInLima(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function sortIncidents(
  left: MaintenanceIncident,
  right: MaintenanceIncident,
  sort: SortMode,
  now: Date,
) {
  if (sort === "newest") {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  }
  if (sort === "oldest") {
    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  }
  if (sort === "due") {
    return dueSortValue(left.due_at) - dueSortValue(right.due_at);
  }
  return incidentPriority(right, now) - incidentPriority(left, now) || new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
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

function dueSortValue(value: string | null) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
