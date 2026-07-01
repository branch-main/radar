"use client";

import {
  AlertTriangle,
  FilterX,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type MouseEvent,
  type TransitionEvent,
} from "react";

import { updateMaintenanceAction } from "@/app/dashboard/actions";
import {
  Avatar as UiAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatLocation, statusLabel } from "@/lib/supabase/format";
import type { MaintenanceIncident, Technician } from "@/lib/supabase/types";

type Option = readonly [string, string];
export type DueFilter = "all" | "overdue" | "today" | "none";
type DueState = "scheduled" | "overdue" | "today" | "none";
export type AssignmentFilter = "all" | "assigned" | "unassigned";
export type SortMode = "priority" | "newest" | "oldest" | "due";
export type IncidentFiltersState = {
  query: string;
  status: string;
  urgency: string;
  category: string;
  assignment: AssignmentFilter;
  due: DueFilter;
  dateFrom: string;
  dateTo: string;
  sort: SortMode;
  page: number;
};

type IncidentsViewProps = {
  incidents: MaintenanceIncident[];
  technicians: Technician[];
  renderedAt: string;
  initialFilters: IncidentFiltersState;
  totalItems: number;
  allItemsCount: number;
  pageCount: number;
};

type IncidentListItem = {
  incident: MaintenanceIncident;
  assignedTechnician: Technician | null;
  technician: string;
  location: string;
  status: string;
  dueState: DueState;
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

const spanishMonths = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];
const pageSize = 12;

export function IncidentsView({
  incidents,
  technicians,
  renderedAt,
  initialFilters,
  totalItems,
  allItemsCount,
  pageCount,
}: IncidentsViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialFilters.query);
  const [status, setStatus] = useState(initialFilters.status);
  const [urgency, setUrgency] = useState(initialFilters.urgency);
  const [category, setCategory] = useState(initialFilters.category);
  const [assignment, setAssignment] = useState<AssignmentFilter>(initialFilters.assignment);
  const [due, setDue] = useState<DueFilter>(initialFilters.due);
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom);
  const [dateTo, setDateTo] = useState(initialFilters.dateTo);
  const [sort, setSort] = useState<SortMode>(initialFilters.sort);
  const [page, setPage] = useState(initialFilters.page);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailHeight, setDetailHeight] = useState<number | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [renderedReportId, setRenderedReportId] = useState<string | null>(null);

  const tableCardRef = useRef<HTMLDivElement>(null);
  const now = useMemo(() => new Date(renderedAt), [renderedAt]);

  const enrichedIncidents = useMemo<IncidentListItem[]>(
    () =>
      incidents.map((incident) => {
        const assignedTechnician = findTechnician(technicians, incident.assigned_to);
        const technician = assignedTechnician ? technicianName(assignedTechnician) : technicianLabel(technicians, incident.assigned_to);
        const location = formatLocation(incident.reports);
        const statusValue = incident.reports?.status ?? "classified";

        return {
          incident,
          assignedTechnician,
          technician,
          location,
          status: statusValue,
          dueState: dueState(incident.due_at, now),
        };
      }),
    [incidents, now, technicians],
  );

  const currentPage = Math.min(page, pageCount);
  const selectedItem = selectedReportId
    ? enrichedIncidents.find((item) => item.incident.report_id === selectedReportId) ?? null
    : null;
  const detailOpen = Boolean(selectedItem);
  const renderedItem = selectedItem ?? (renderedReportId
    ? enrichedIncidents.find((item) => item.incident.report_id === renderedReportId) ?? null
    : null);
  const selectedId = selectedItem?.incident.report_id ?? null;
  const filterCount = [
    status !== "all",
    urgency !== "all",
    category !== "all",
    assignment !== "all",
    due !== "all",
    Boolean(dateFrom),
    Boolean(dateTo),
    sort !== "priority",
  ].filter(Boolean).length;
  const hasFilters = Boolean(query || filterCount);

  useEffect(() => {
    const node = tableCardRef.current;
    if (!node) return;

    let frame = 0;
    const updateDetailHeight = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        const availableHeight = Math.max(0, window.innerHeight - rect.top - 32);
        const nextHeight = Math.max(rect.height, availableHeight);

        setDetailHeight((currentHeight) => {
          if (currentHeight !== null && Math.abs(currentHeight - nextHeight) < 1) {
            return currentHeight;
          }
          return nextHeight;
        });
      });
    };

    const observer = new ResizeObserver(updateDetailHeight);
    observer.observe(node);
    window.addEventListener("resize", updateDetailHeight);
    updateDetailHeight();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateDetailHeight);
    };
  }, []);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (cleanQuery === initialFilters.query.trim()) return;

    const timeout = window.setTimeout(() => {
      setPage(1);
      setSelectedReportId(null);
      router.replace(
        incidentHref({
          query: cleanQuery,
          status,
          urgency,
          category,
          assignment,
          due,
          dateFrom,
          dateTo,
          sort,
          page: 1,
        }),
        { scroll: false },
      );
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    assignment,
    category,
    dateFrom,
    dateTo,
    due,
    initialFilters.query,
    query,
    router,
    sort,
    status,
    urgency,
  ]);

  function currentFilters(nextPage = page): IncidentFiltersState {
    return { query, status, urgency, category, assignment, due, dateFrom, dateTo, sort, page: nextPage };
  }

  function applyFilters(patch: Partial<IncidentFiltersState>, nextPage = 1) {
    const nextFilters = { ...currentFilters(), ...patch, page: nextPage };
    setQuery(nextFilters.query);
    setStatus(nextFilters.status);
    setUrgency(nextFilters.urgency);
    setCategory(nextFilters.category);
    setAssignment(nextFilters.assignment);
    setDue(nextFilters.due);
    setDateFrom(nextFilters.dateFrom);
    setDateTo(nextFilters.dateTo);
    setSort(nextFilters.sort);
    setPage(nextFilters.page);
    setSelectedReportId(null);
    router.replace(incidentHref(nextFilters), { scroll: false });
    setFiltersOpen(true);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters({ query });
    setFiltersOpen(false);
  }

  function clearFilters() {
    applyFilters({
      query: "",
      status: "all",
      urgency: "all",
      category: "all",
      assignment: "all",
      due: "all",
      dateFrom: "",
      dateTo: "",
      sort: "priority",
    });
    setFiltersOpen(false);
  }

  function changePage(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), pageCount);
    setPage(safePage);
    setSelectedReportId(null);
    router.replace(incidentHref(currentFilters(safePage)), { scroll: false });
  }

  function toggleIncidentSelection(reportId: string) {
    if (selectedReportId === reportId) {
      setSelectedReportId(null);
      return;
    }

    setRenderedReportId(reportId);
    setSelectedReportId(reportId);
  }

  function handleResultsTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "grid-template-columns") return;
    if (!detailOpen) setRenderedReportId(null);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-semibold tracking-tight">Incidencias</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Revisa reportes de mantenimiento, selecciona una fila y actualiza el detalle técnico sin salir de la tabla.
        </p>
      </div>

      <div className="space-y-3">
        <section className="space-y-3">
          <form onSubmit={handleSearchSubmit} className="grid gap-2 lg:grid-cols-[minmax(320px,520px)_1fr_auto_auto] lg:items-center">
          <SearchControl
            value={query}
            onChange={setQuery}
          />

          <div className="hidden lg:block" />

          <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="secondary"
                  className={`h-9 border-border bg-secondary hover:bg-secondary/80 ${filterCount > 0 ? "text-foreground" : ""}`}
                />
              }
            >
              <SlidersHorizontal className="size-3.5" />
              Filtros
              {filterCount > 0 && (
                <span className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold leading-none text-primary-foreground">
                  {filterCount}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="!w-[440px] max-w-[calc(100vw_-_2rem)] p-4"
            >
              <div className="grid gap-4">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Filtros de incidencias</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajusta estado, prioridad, asignación, SLA y rango de fecha.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <SelectControl
                    value={status}
                    onChange={(value) => applyFilters({ status: value })}
                    options={[["all", "Estado"], ...statusOptions]}
                  />
                  <SelectControl
                    value={urgency}
                    onChange={(value) => applyFilters({ urgency: value })}
                    options={[["all", "Urgencia"], ...urgencyOptions]}
                  />
                  <SelectControl
                    value={category}
                    onChange={(value) => applyFilters({ category: value })}
                    options={[["all", "Categoría"], ...categoryOptions]}
                  />
                  <SelectControl
                    value={assignment}
                    onChange={(value) => applyFilters({ assignment: value as AssignmentFilter })}
                    options={[
                      ["all", "Asignación"],
                      ["assigned", "Asignadas"],
                      ["unassigned", "Sin técnico"],
                    ]}
                  />
                  <SelectControl
                    value={due}
                    onChange={(value) => applyFilters({ due: value as DueFilter })}
                    options={[
                      ["all", "SLA"],
                      ["overdue", "Vencidas"],
                      ["today", "Por vencer"],
                      ["none", "Sin fecha"],
                    ]}
                  />
                  <SelectControl
                    value={sort}
                    onChange={(value) => applyFilters({ sort: value as SortMode })}
                    inactiveValue="priority"
                    options={[
                      ["priority", "Prioridad"],
                      ["newest", "Recientes"],
                      ["oldest", "Antiguas"],
                      ["due", "SLA próximo"],
                    ]}
                  />
                  <DateControl
                    label="Desde"
                    value={dateFrom}
                    onChange={(value) => applyFilters({ dateFrom: value })}
                  />
                  <DateControl
                    label="Hasta"
                    value={dateTo}
                    onChange={(value) => applyFilters({ dateTo: value })}
                  />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

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
        </form>
        </section>

        {totalItems === 0 ? (
        <Card className="gap-0 border-border py-0">
          <CardContent className="px-0 pt-0">
            <EmptyState hasIncidents={allItemsCount > 0} />
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid items-start gap-y-4 transition-[grid-template-columns,column-gap] duration-200 ease-out xl:grid-cols-[minmax(0,1fr)_var(--incident-detail-width)] xl:[column-gap:var(--incident-detail-gap)]"
          onTransitionEnd={handleResultsTransitionEnd}
          style={
            {
              "--incident-detail-width": detailOpen ? "390px" : "0px",
              "--incident-detail-gap": detailOpen ? "1rem" : "0rem",
            } as CSSProperties
          }
        >
          <Card ref={tableCardRef} className="gap-0 border-border py-0 xl:self-start">
            <CardContent className="px-0 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[740px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/45 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Incidencia</th>
                      <th className="px-3 py-2.5 font-medium">Estado</th>
                      <th className="px-3 py-2.5 font-medium">Urgencia</th>
                      <th className="px-4 py-2.5 font-medium">Técnico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {enrichedIncidents.map((item) => (
                      <IncidentTableRow
                        key={item.incident.report_id}
                        item={item}
                        selected={item.incident.report_id === selectedId}
                        onSelect={() => toggleIncidentSelection(item.incident.report_id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={currentPage}
                pageCount={pageCount}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={changePage}
              />
            </CardContent>
          </Card>

          {renderedItem && (
            <div className="min-w-0 overflow-hidden xl:self-start">
              <div className="xl:w-[390px]">
                <IncidentDetail
                  key={renderedItem.incident.report_id}
                  item={renderedItem}
                  technicians={technicians}
                  now={now}
                  height={detailHeight}
                />
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

function IncidentTableRow({
  item,
  selected,
  onSelect,
}: {
  item: IncidentListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const { incident, assignedTechnician, technician, location, status } = item;

  function handleKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <tr
      tabIndex={0}
      aria-selected={selected}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer outline-none transition-colors ${
        selected
          ? "bg-primary/10 hover:bg-primary/10 focus-visible:bg-primary/10"
          : "bg-white hover:bg-muted/35 focus-visible:bg-muted/45"
      }`}
    >
      <td className="px-4 py-3 align-middle">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border ${urgencyIconClass(incident.urgency)}`}>
            {incident.reports?.photo_url ? (
              <Image
                src={incident.reports.photo_url}
                alt={incident.reports.title ?? "Foto de la incidencia"}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <AlertTriangle className="size-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{incident.reports?.title ?? "Incidencia sin título"}</p>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{location}</span>
            </div>

          </div>
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <Badge value={status} />
      </td>
      <td className="px-3 py-3 align-middle">
        <UrgencyBadge value={incident.urgency} />
      </td>
      <td className="max-w-[170px] px-4 py-3 align-middle">
        <TechnicianInline technician={assignedTechnician} fallbackName={technician} />
      </td>
    </tr>
  );
}

function IncidentDetail({
  item,
  technicians,
  now,
  height,
}: {
  item: IncidentListItem;
  technicians: Technician[];
  now: Date;
  height: number | null;
}) {
  const { incident, assignedTechnician, technician, location, status, dueState: due } = item;
  const report = incident.reports;
  const confidence = confidenceValue(incident);

  return (
    <Card
      className="gap-0 border-border py-0 xl:max-h-[var(--incident-detail-height)] xl:min-h-0 xl:self-start xl:overflow-y-auto xl:overscroll-contain"
      style={height ? ({ "--incident-detail-height": `${height}px` } as CSSProperties) : undefined}
    >
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Detalle</p>
            <h2 className="mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight">
              {report?.title ?? "Incidencia sin título"}
            </h2>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge value={status} />
            <UrgencyBadge value={incident.urgency} />
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {report?.description || "Sin descripción registrada."}
        </p>
      </div>

      <CardContent className="space-y-4 p-4">
        <IncidentMedia incident={incident} />
        <IncidentSummary incident={incident} status={status} due={due} confidence={confidence} />
        <LocationAndAssignment
          incident={incident}
          location={location}
          technician={assignedTechnician}
          technicianName={technician}
        />
        <DetailSection title="Notas">
          <div className="space-y-3 rounded-xl border border-border bg-muted/25 p-3">
            <DetailNote label="Descripción" value={report?.description || "Sin descripción registrada."} />
            <DetailNote label="Clasificación" value={report?.classification_reason || "Sin clasificación registrada."} />
          </div>
        </DetailSection>
        <ActivityTimeline
          createdAt={incident.created_at}
          updatedAt={incident.updated_at}
          dueAt={incident.due_at}
          completedAt={incident.completed_at}
          now={now}
        />
        <UpdateIncidentForm incident={incident} status={status} technicians={technicians} />
      </CardContent>
    </Card>
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

function SearchControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative min-w-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por título, ubicación, técnico, categoría o ID"
        className="h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  );
}

function SelectControl({
  value,
  onChange,
  options,
  inactiveValue = "all",
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  inactiveValue?: string;
}) {
  const active = value !== inactiveValue;

  function stopMenuPropagation(event: MouseEvent<HTMLSelectElement>) {
    event.stopPropagation();
  }

  return (
    <select
      value={value}
      onClick={stopMenuPropagation}
      onChange={(event) => onChange(event.target.value)}
      className={`h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 ${
        active ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

function DateControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 w-full rounded-lg border border-input bg-white pl-12 pr-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 ${
          value ? "text-foreground" : "text-muted-foreground"
        }`}
      />
    </label>
  );
}

function IncidentMedia({ incident }: { incident: MaintenanceIncident }) {
  const photoUrl = incident.reports?.photo_url;

  if (!photoUrl) return null;

  return (
    <a
      href={photoUrl}
      target="_blank"
      rel="noreferrer"
      className="relative block aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted"
    >
      <Image
        src={photoUrl}
        alt={incident.reports?.title ?? "Foto de la incidencia"}
        fill
        sizes="390px"
        className="object-cover"
      />
    </a>
  );
}

function IncidentSummary({
  incident,
  status,
  due,
  confidence,
}: {
  incident: MaintenanceIncident;
  status: string;
  due: DueState;
  confidence: number;
}) {
  return (
    <DetailSection title="Resumen">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-muted/25 p-3">
        <DetailField label="Estado" value={statusLabel(status)} />
        <DetailField label="Urgencia" value={statusLabel(incident.urgency)} />
        <DetailField label="Categoría" value={categoryLabel(incident.category)} />
        <DetailField label="SLA" value={dueLabel(due)} />
        <DetailField label="Confianza" value={`${confidence}%`} />
        <DetailField label="Reporte" value={shortReportId(incident.report_id)} />
      </div>
    </DetailSection>
  );
}

function LocationAndAssignment({
  incident,
  location,
  technician,
  technicianName,
}: {
  incident: MaintenanceIncident;
  location: string;
  technician: Technician | null;
  technicianName: string;
}) {
  const zone = incident.reports?.campus_zones;

  return (
    <DetailSection title="Ubicación y asignación">
      <div className="divide-y divide-border rounded-xl border border-border bg-muted/25">
        <DetailRow label="Ubicación" value={location} />
        {zone && <DetailRow label="Edificio" value={zone.building} />}
        {zone?.floor && <DetailRow label="Piso" value={zone.floor} />}
        <DetailRow label="Técnico" value={technician ? technicianName : "Sin técnico asignado"} />
        {technician?.profiles?.email && <DetailRow label="Contacto" value={technician.profiles.email} />}
      </div>
    </DetailSection>
  );
}

function ActivityTimeline({
  createdAt,
  updatedAt,
  dueAt,
  completedAt,
  now,
}: {
  createdAt: string;
  updatedAt: string;
  dueAt: string | null;
  completedAt: string | null;
  now: Date;
}) {
  return (
    <DetailSection title="Actividad">
      <div className="divide-y divide-border rounded-xl border border-border bg-muted/25">
        <DetailRow label="Creado" value={formatDateTime(createdAt)} />
        <DetailRow label="Actualizado" value={formatDateTime(updatedAt)} />
        <DetailRow
          label="Vence"
          value={dueAt ? `${formatDateTime(dueAt)}, ${relativeDueLabel(dueAt, now)}` : "Sin fecha definida"}
        />
        <DetailRow label="Cierre" value={completedAt ? formatDateTime(completedAt) : "Pendiente"} />
      </div>
    </DetailSection>
  );
}

function UpdateIncidentForm({
  incident,
  status,
  technicians,
}: {
  incident: MaintenanceIncident;
  status: string;
  technicians: Technician[];
}) {
  return (
    <DetailSection title="Actualizar">
      <form action={updateMaintenanceAction} className="space-y-3 rounded-xl border border-border bg-muted/25 p-3">
        <input type="hidden" name="report_id" value={incident.report_id} />
        <div className="grid grid-cols-2 gap-2">
          <FieldSelect label="Estado" name="status" defaultValue={status} options={statusOptions} />
          <FieldSelect label="Urgencia" name="urgency" defaultValue={incident.urgency} options={urgencyOptions} />
          <FieldSelect className="col-span-2" label="Categoría" name="category" defaultValue={incident.category} options={categoryOptions} />
        </div>
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          <span>Técnico</span>
          <select
            name="assigned_to"
            defaultValue={incident.assigned_to ?? ""}
            className="h-9 rounded-lg border border-input bg-white px-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
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
          <span>Vence</span>
          <input
            type="datetime-local"
            name="due_at"
            defaultValue={dateTimeLocalValue(incident.due_at)}
            className="h-9 rounded-lg border border-input bg-white px-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </label>
        <Button type="submit" className="h-9 w-full">
          Guardar cambios
        </Button>
      </form>
    </DetailSection>
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

function FieldSelect({
  label,
  name,
  defaultValue,
  options,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Option[];
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-xs font-medium text-muted-foreground ${className}`}>
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-9 rounded-lg border border-input bg-white px-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
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

function TechnicianInline({ technician, fallbackName }: { technician: Technician | null; fallbackName: string }) {
  if (!technician) {
    return <span className="text-muted-foreground">{fallbackName}</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
      <TechnicianAvatar technician={technician} fallbackName={fallbackName} size="sm" />
      <span className="truncate">{fallbackName}</span>
    </div>
  );
}

function TechnicianAvatar({
  technician,
  fallbackName,
  size,
}: {
  technician: Technician | null;
  fallbackName: string;
  size: "sm" | "md";
}) {
  const initials = initialsFromName(fallbackName);

  return (
    <UiAvatar className={size === "md" ? "size-10" : "size-7"}>
      {technician?.profiles?.avatar_url && <AvatarImage src={technician.profiles.avatar_url} alt={fallbackName} />}
      <AvatarFallback className={`${size === "md" ? "text-sm" : "text-xs"} font-semibold text-primary`}>
        {initials}
      </AvatarFallback>
    </UiAvatar>
  );
}

function EmptyState({ hasIncidents }: { hasIncidents: boolean }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Search className="size-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasIncidents ? "No encontramos incidencias" : "No hay incidencias de mantenimiento"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasIncidents
          ? "Prueba con otro texto o ajusta los filtros para volver a ver la tabla."
          : "Cuando se registren reportes de mantenimiento aparecerán en este tablero."}
      </p>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${incidentStatusBadgeClass(value)}`}>{statusLabel(value)}</span>;
}

function UrgencyBadge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${urgencyBadgeClass(value)}`}>{statusLabel(value)}</span>;
}

function technicianLabel(technicians: Technician[], technicianId: string | null) {
  if (!technicianId) return "-";
  const technician = findTechnician(technicians, technicianId);
  return technician ? technicianName(technician) : technicianId;
}

function technicianName(technician: Technician) {
  return technician.profiles?.full_name || technician.profiles?.email || technician.id;
}

function findTechnician(technicians: Technician[], technicianId: string | null) {
  if (!technicianId) return null;
  return technicians.find((item) => item.id === technicianId) ?? null;
}

function initialsFromName(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "T"
  );
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
  if (value === "none") return "-";
  return "En plazo";
}

function incidentStatusBadgeClass(value: string) {
  if (value === "resolved") return "bg-emerald-500/10 text-emerald-700";
  if (["closed", "cancelled"].includes(value)) return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}


function urgencyBadgeClass(value: string) {
  if (value === "critical") return "bg-destructive/10 text-destructive";
  if (value === "high") return "bg-amber-500/10 text-amber-700";
  return "bg-muted text-muted-foreground";
}

function urgencyIconClass(value: string) {
  if (value === "critical") return "bg-destructive/10 text-destructive";
  if (value === "high") return "bg-amber-500/10 text-amber-700";
  if (value === "medium") return "bg-blue-500/10 text-blue-700";
  return "bg-muted text-muted-foreground";
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

function confidenceValue(incident: MaintenanceIncident) {
  return Math.round(Number(incident.reports?.ai_confidence ?? 0) * 100);
}

function shortReportId(value: string) {
  return value.slice(0, 8);
}

function incidentHref(filters: IncidentFiltersState) {
  const params = new URLSearchParams();
  const cleanQuery = filters.query.trim();

  if (cleanQuery) params.set("q", cleanQuery);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.urgency !== "all") params.set("urgency", filters.urgency);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.assignment !== "all") params.set("assignment", filters.assignment);
  if (filters.due !== "all") params.set("due", filters.due);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  if (filters.sort !== "priority") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  const search = params.toString();
  return search ? `/dashboard/mantenimiento/incidencias?${search}` : "/dashboard/mantenimiento/incidencias";
}

