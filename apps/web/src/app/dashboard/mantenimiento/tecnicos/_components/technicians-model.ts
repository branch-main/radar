import type {
  MaintenanceCategory,
  MaintenanceIncident,
  Profile,
  Technician,
} from "@/lib/supabase/types";

export type Option = readonly [string, string];
export type Workload = {
  total: number;
  open: number;
  critical: number;
  overdue: number;
  resolved: number;
};

export const specialtyOptions = [
  ["", "General"],
  ["electrical", "Eléctrico"],
  ["plumbing", "Gasfitería"],
  ["cleaning", "Limpieza"],
  ["hvac", "Climatización"],
  ["infrastructure", "Infraestructura"],
  ["security", "Seguridad"],
  ["other", "Otro"],
] satisfies Array<readonly [MaintenanceCategory | "", string]>;

const specialtyLabels = Object.fromEntries(specialtyOptions) as Record<string, string>;
const closedStatuses = new Set(["resolved", "closed", "cancelled"]);

export function createWorkloadMap(incidents: MaintenanceIncident[], now: Date) {
  const map = new Map<string, Workload>();

  for (const incident of incidents) {
    if (!incident.assigned_to) continue;

    const workload = map.get(incident.assigned_to) ?? emptyWorkload();
    const status = incident.reports?.status ?? "classified";
    const isClosed = closedStatuses.has(status);

    workload.total += 1;
    if (isClosed) {
      workload.resolved += 1;
    } else {
      workload.open += 1;
      if (incident.urgency === "critical") workload.critical += 1;
      if (isOverdue(incident.due_at, now)) workload.overdue += 1;
    }

    map.set(incident.assigned_to, workload);
  }

  return map;
}

export function emptyWorkload(): Workload {
  return { total: 0, open: 0, critical: 0, overdue: 0, resolved: 0 };
}

export function isOverdue(value: string | null, now: Date) {
  if (!value) return false;
  return new Date(value).getTime() < now.getTime();
}

export function technicianName(technician: Technician) {
  return technician.profiles?.full_name || technician.profiles?.email || technician.id;
}

export function profileLabel(profile: Profile) {
  const name = profile.full_name || profile.email;
  return `${name} · ${roleLabel(profile.role)}`;
}

export function roleLabel(role?: string) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    technician: "Técnico",
    student: "Estudiante",
  };
  return labels[role ?? ""] ?? "Sin rol";
}

export function specialtyLabel(value: string | null) {
  return specialtyLabels[value ?? ""] ?? value ?? "General";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
