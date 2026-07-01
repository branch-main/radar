"use client";

import {
  FilterX,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";

import {
  Avatar as UiAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MaintenanceIncident, Technician } from "@/lib/supabase/types";

import {
  createWorkloadMap,
  emptyWorkload,
  roleLabel,
  specialtyLabel,
  specialtyOptions,
  technicianName,
  type Option,
  type Workload,
} from "./technicians-model";

export type StatusFilter = "all" | "active" | "inactive";
export type SortMode = "workload" | "name" | "newest" | "specialty";
export type TechnicianFiltersState = {
  query: string;
  status: StatusFilter;
  specialty: string;
  sort: SortMode;
  page: number;
};
type TechnicianRow = {
  technician: Technician;
  name: string;
  email: string;
  role: string;
  specialty: string;
  workload: Workload;
};

type TechniciansViewProps = {
  technicians: Technician[];
  incidents: MaintenanceIncident[];
  renderedAt: string;
  initialFilters: TechnicianFiltersState;
  totalItems: number;
  counts: Record<StatusFilter, number>;
  pageCount: number;
};

const pageSize = 12;

export function TechniciansView({
  technicians,
  incidents,
  renderedAt,
  initialFilters,
  totalItems,
  counts,
  pageCount,
}: TechniciansViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialFilters.query);
  const [status, setStatus] = useState<StatusFilter>(initialFilters.status);
  const [specialty, setSpecialty] = useState(initialFilters.specialty);
  const [sort, setSort] = useState<SortMode>(initialFilters.sort);
  const [page, setPage] = useState(initialFilters.page);

  const now = useMemo(() => new Date(renderedAt), [renderedAt]);
  const workloadByTechnician = useMemo(
    () => createWorkloadMap(incidents, now),
    [incidents, now],
  );
  const maxOpenLoad = Math.max(
    ...Array.from(workloadByTechnician.values()).map((workload) => workload.open),
    1,
  );

  const rows = useMemo<TechnicianRow[]>(
    () =>
      technicians.map((technician) => {
        const name = technicianName(technician);
        const email = technician.profiles?.email ?? "Sin correo";
        const role = roleLabel(technician.profiles?.role);
        const specialtyText = specialtyLabel(technician.specialty);
        const workload = workloadByTechnician.get(technician.id) ?? emptyWorkload();

        return {
          technician,
          name,
          email,
          role,
          specialty: specialtyText,
          workload,
        };
      }),
    [technicians, workloadByTechnician],
  );

  const currentPage = Math.min(page, pageCount);
  const hasFilters = Boolean(query || status !== "all" || specialty !== "all" || sort !== "workload");

  useEffect(() => {
    const cleanQuery = query.trim();
    if (cleanQuery === initialFilters.query.trim()) return;

    const timeout = window.setTimeout(() => {
      setPage(1);
      router.replace(
        technicianHref({
          query: cleanQuery,
          status,
          specialty,
          sort,
          page: 1,
        }),
        { scroll: false },
      );
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [initialFilters.query, query, router, sort, specialty, status]);

  function currentFilters(nextPage = page): TechnicianFiltersState {
    return { query, status, specialty, sort, page: nextPage };
  }

  function applyFilters(patch: Partial<TechnicianFiltersState>, nextPage = 1) {
    const nextFilters = { ...currentFilters(), ...patch, page: nextPage };
    setQuery(nextFilters.query);
    setStatus(nextFilters.status);
    setSpecialty(nextFilters.specialty);
    setSort(nextFilters.sort);
    setPage(nextFilters.page);
    router.replace(technicianHref(nextFilters), { scroll: false });
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters({ query });
  }

  function clearFilters() {
    applyFilters({ query: "", status: "all", specialty: "all", sort: "workload" });
  }

  function changePage(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), pageCount);
    setPage(safePage);
    router.replace(technicianHref(currentFilters(safePage)), { scroll: false });
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Técnicos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Consulta disponibilidad, especialidades y carga activa del equipo de mantenimiento.
          </p>
        </div>
        <Link
          href="/dashboard/mantenimiento/tecnicos/nuevo"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          Agregar técnico
        </Link>
      </div>

      <div className="space-y-3">
        <section className="space-y-3">
          <StatusTabs
          activeStatus={status}
          onStatusChange={(value) => applyFilters({ status: value })}
          counts={counts}
        />

        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="lg:w-[460px] xl:w-[520px]">
            <SearchControl
              value={query}
              onChange={setQuery}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-[132px_132px_auto] lg:justify-end">
            <SelectControl
              label="Especialidad"
              value={specialty}
              onChange={(value) => applyFilters({ specialty: value })}
              options={[["all", "Especialidad"], ...specialtyOptions]}
            />
            <SelectControl
              label="Orden"
              value={sort}
              onChange={(value) => applyFilters({ sort: value as SortMode })}
              inactiveValue="workload"
              options={[
                ["workload", "Más carga"],
                ["name", "Nombre"],
                ["newest", "Más recientes"],
                ["specialty", "Especialidad"],
              ]}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="h-9 border-border bg-secondary hover:bg-secondary/80 [&:disabled]:cursor-default [&:disabled]:pointer-events-auto"
            >
              <FilterX className="size-3.5" />
              Limpiar
            </Button>
          </div>
        </form>
        </section>

        <Card className="gap-0 border-border py-0">
        <CardContent className="px-0 pt-0">
          {totalItems === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Sin técnicos encontrados"
              description="Ajusta la búsqueda o limpia los filtros para volver a ver el directorio."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-border bg-muted/45 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Técnico</th>
                    <th className="px-3 py-2.5 font-medium">Especialidad</th>
                    <th className="px-3 py-2.5 font-medium">Estado</th>
                    <th className="px-3 py-2.5 font-medium">Incidencias asignadas</th>
                    <th className="px-3 py-2.5 font-medium">Atención requerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <TechnicianTableRow
                      key={row.technician.id}
                      row={row}
                      maxOpenLoad={maxOpenLoad}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls
            page={currentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={changePage}
          />
        </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PaginationControls({
  page,
  pageCount,
  pageSize,
  totalItems,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Mostrando {firstItem}-{lastItem} de {totalItems}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 min-w-8 border-border bg-secondary hover:bg-secondary/80"
        >
          {"<"}
        </Button>
        {paginationPages(page, pageCount).map((pageItem, index) =>
          pageItem === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="inline-flex h-8 min-w-8 items-center justify-center text-sm font-medium text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={pageItem}
              type="button"
              variant="secondary"
              onClick={() => onPageChange(pageItem)}
              className={`h-8 min-w-8 ${pageItem === page ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15" : "border-border bg-secondary hover:bg-secondary/80"}`}
            >
              {pageItem}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="h-8 min-w-8 border-border bg-secondary hover:bg-secondary/80"
        >
          {">"}
        </Button>
      </div>
    </div>
  );
}

function paginationPages(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = new Set([1, 2, page, pageCount - 1, pageCount]);
  const visiblePages = Array.from(pages)
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= pageCount)
    .sort((left, right) => left - right);

  return visiblePages.flatMap((pageNumber, index) => {
    const previous = visiblePages[index - 1];
    return previous && pageNumber - previous > 1 ? ["ellipsis", pageNumber] : [pageNumber];
  });
}

function StatusTabs({
  activeStatus,
  onStatusChange,
  counts,
}: {
  activeStatus: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}) {
  const tabs: Array<{ value: StatusFilter; label: string }> = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Inactivos" },
  ];

  return (
    <nav aria-label="Filtro de técnicos" className="w-fit max-w-full overflow-x-auto">
      <div className="inline-flex min-w-max gap-1 rounded-lg border border-border bg-white p-1 dark:bg-background">
        {tabs.map((tab) => {
          const selected = activeStatus === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => onStatusChange(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 text-xs ${
                  selected ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {counts[tab.value]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SearchControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">Buscar técnicos</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar nombre, correo o especialidad"
        className="h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15 dark:bg-background"
      />
    </label>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  options,
  inactiveValue = "all",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  inactiveValue?: string;
}) {
  const active = value !== inactiveValue;

  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15 dark:bg-background ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={`${label}-${optionValue || optionLabel}`} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function TechnicianTableRow({
  row,
  maxOpenLoad,
}: {
  row: TechnicianRow;
  maxOpenLoad: number;
}) {
  const loadPercent = row.workload.open === 0
    ? 0
    : Math.max(8, Math.round((row.workload.open / maxOpenLoad) * 100));
  const detailHref = `/dashboard/mantenimiento/tecnicos/${row.technician.id}`;

  return (
    <tr className="bg-white transition hover:bg-muted/50 dark:bg-card">
      <td className="px-4 py-3 align-middle">
        <Link
          href={detailHref}
          className="flex min-w-0 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-primary/20"
        >
          <Avatar
            name={row.name}
            avatarUrl={row.technician.profiles?.avatar_url}
          />
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{row.name}</span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {row.email}
            </span>
          </span>
        </Link>
      </td>
      <td className="px-3 py-3 align-middle">
        <span className="inline-flex rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {row.specialty}
        </span>
      </td>
      <td className="px-3 py-3 align-middle">
        <StatusBadge active={row.technician.active} />
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="min-w-36">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{row.workload.open} abiertas</span>
            <span>{row.workload.total} total</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/70">
            <div className="h-full rounded-full bg-primary" style={{ width: `${loadPercent}%` }} />
          </div>
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex flex-wrap gap-1.5">
          <RiskBadge label={`${row.workload.critical} críticas`} active={row.workload.critical > 0} tone="amber" />
          <RiskBadge label={`${row.workload.overdue} vencidas`} active={row.workload.overdue > 0} tone="red" />
        </div>
      </td>
    </tr>
  );
}

function Avatar({
  name,
  avatarUrl,
  large = false,
}: {
  name: string;
  avatarUrl?: string | null;
  large?: boolean;
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "T";

  return (
    <UiAvatar className={large ? "size-12" : "size-9"}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className={`${large ? "text-sm" : "text-xs"} font-semibold text-primary`}>
        {initials}
      </AvatarFallback>
    </UiAvatar>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${
        active
          ? "bg-emerald-500/10 text-emerald-700"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function RiskBadge({
  label,
  active,
  tone,
}: {
  label: string;
  active: boolean;
  tone: "amber" | "red";
}) {
  const activeClass = tone === "amber"
    ? "bg-amber-500/10 text-amber-700"
    : "bg-destructive/10 text-destructive";

  return (
    <span
      className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${
        active ? activeClass : "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function technicianHref(filters: TechnicianFiltersState) {
  const params = new URLSearchParams();
  const cleanQuery = filters.query.trim();

  if (cleanQuery) params.set("q", cleanQuery);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.specialty !== "all") params.set("specialty", filters.specialty);
  if (filters.sort !== "workload") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  const search = params.toString();
  return search ? `/dashboard/mantenimiento/tecnicos?${search}` : "/dashboard/mantenimiento/tecnicos";
}
