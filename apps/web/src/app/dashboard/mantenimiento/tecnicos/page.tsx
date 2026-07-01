import type { Metadata } from "next";
import { getMaintenanceIncidents, getTechnicians } from "@/lib/supabase/dashboard";
import type { MaintenanceIncident, Technician } from "@/lib/supabase/types";

import {
  createWorkloadMap,
  normalize,
  roleLabel,
  specialtyLabel,
  technicianName,
  type Workload,
} from "./_components/technicians-model";
import {
  TechniciansView,
  type SortMode,
  type StatusFilter,
  type TechnicianFiltersState,
} from "./_components/technicians-view";

export const metadata: Metadata = {
  title: "Técnicos",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const pageSize = 12;

export default async function TecnicosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const renderedAt = new Date().toISOString();
  const [technicians, incidents] = await Promise.all([
    getTechnicians(),
    getMaintenanceIncidents(),
  ]);
  const initialFilters: TechnicianFiltersState = {
    query: paramValue(params, "q"),
    status: statusFilter(paramValue(params, "status", "all")),
    specialty: paramValue(params, "specialty", "all"),
    sort: sortMode(paramValue(params, "sort", "workload")),
    page: positiveInteger(paramValue(params, "page"), 1),
  };
  const filteredTechnicians = filterTechnicians(
    technicians,
    incidents,
    initialFilters,
    new Date(renderedAt),
  );
  const pageCount = Math.max(1, Math.ceil(filteredTechnicians.length / pageSize));
  const activePage = Math.min(initialFilters.page, pageCount);
  const paginatedTechnicians = filteredTechnicians.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );

  return (
    <TechniciansView
      technicians={paginatedTechnicians}
      incidents={incidents}
      renderedAt={renderedAt}
      initialFilters={{ ...initialFilters, page: activePage }}
      totalItems={filteredTechnicians.length}
      counts={{
        all: technicians.length,
        active: technicians.filter((technician) => technician.active).length,
        inactive: technicians.filter((technician) => !technician.active).length,
      }}
      pageCount={pageCount}
    />
  );
}

function filterTechnicians(
  technicians: Technician[],
  incidents: MaintenanceIncident[],
  filters: TechnicianFiltersState,
  now: Date,
) {
  const workloadByTechnician = createWorkloadMap(incidents, now);
  const normalizedQuery = normalize(filters.query);

  return technicians
    .filter((technician) => {
      const name = technicianName(technician);
      const email = technician.profiles?.email ?? "Sin correo";
      const role = roleLabel(technician.profiles?.role);
      const specialtyText = specialtyLabel(technician.specialty);
      const haystack = normalize(
        [
          technician.id,
          name,
          email,
          role,
          specialtyText,
          technician.active ? "activo" : "inactivo",
        ].join(" "),
      );

      if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
      if (filters.status === "active" && !technician.active) return false;
      if (filters.status === "inactive" && technician.active) return false;
      if (filters.specialty !== "all" && (technician.specialty ?? "") !== filters.specialty) return false;
      return true;
    })
    .sort((left, right) => sortTechnicians(left, right, filters.sort, workloadByTechnician));
}

function sortTechnicians(
  left: Technician,
  right: Technician,
  sort: SortMode,
  workloadByTechnician: Map<string, Workload>,
) {
  const leftName = technicianName(left);
  const rightName = technicianName(right);

  if (sort === "workload") {
    return (workloadByTechnician.get(right.id)?.open ?? 0) - (workloadByTechnician.get(left.id)?.open ?? 0) || leftName.localeCompare(rightName, "es");
  }
  if (sort === "newest") {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  }
  if (sort === "specialty") {
    return specialtyLabel(left.specialty).localeCompare(specialtyLabel(right.specialty), "es") || leftName.localeCompare(rightName, "es");
  }
  return leftName.localeCompare(rightName, "es");
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

function statusFilter(value: string): StatusFilter {
  if (value === "active" || value === "inactive") return value;
  return "all";
}

function sortMode(value: string): SortMode {
  if (value === "name" || value === "newest" || value === "specialty") return value;
  return "workload";
}
