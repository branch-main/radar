"use client";

import {
  Archive,
  FilterX,
  PackageCheck,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ComponentType, type MouseEvent } from "react";

import { updateClaimAction } from "@/app/dashboard/actions";
import { useClaimsQuery } from "@/app/dashboard/_lib/queries";
import {
  compareText,
  textMatches,
  uniqueOptions,
} from "@/app/dashboard/objetos-perdidos/_components/lost-found-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  badgeClass,
  formatDateTime,
  formatLocation,
  statusLabel,
} from "@/lib/supabase/format";
import type { Claim } from "@/lib/supabase/types";

import { DeliverySearch } from "./delivery-search";

export type DeliveryStatus = "all" | "approved" | "pending" | "delivered" | "rejected";
export type DeliverySort = "ready" | "recent" | "requester" | "item" | "status";
type SelectOption = { value: string; label: string };

export type DeliveryFiltersState = {
  query: string;
  status: DeliveryStatus;
  category: string;
  custody: string;
  sort: DeliverySort;
};

type DeliveriesViewProps = {
  initialClaims: Claim[];
  initialFilters: DeliveryFiltersState;
};

const deliveryTabs: Array<{ value: DeliveryStatus; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "approved", label: "Listos" },
  { value: "pending", label: "Pendientes" },
  { value: "delivered", label: "Entregados" },
  { value: "rejected", label: "Rechazados" },
];

const sortOptions: SelectOption[] = [
  { value: "ready", label: "Prioridad" },
  { value: "recent", label: "Recientes" },
  { value: "requester", label: "Solicitante" },
  { value: "item", label: "Objeto" },
  { value: "status", label: "Estado" },
];

const defaultDeliveryFilters: DeliveryFiltersState = {
  query: "",
  status: "all",
  category: "all",
  custody: "all",
  sort: "ready",
};

export function DeliveriesView({ initialClaims, initialFilters }: DeliveriesViewProps) {
  const { data: claims } = useClaimsQuery(initialClaims);
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const readyClaims = useMemo(() => claims.filter((claim) => claim.status === "approved"), [claims]);
  const deliveredClaims = useMemo(() => claims.filter((claim) => claim.status === "delivered"), [claims]);
  const pendingClaims = useMemo(() => claims.filter((claim) => claim.status === "pending"), [claims]);
  const rejectedClaims = useMemo(() => claims.filter((claim) => claim.status === "rejected"), [claims]);
  const archivedClaims = useMemo(
    () => claims.filter((claim) => ["rejected", "delivered"].includes(claim.status)),
    [claims],
  );
  const filteredClaims = useMemo(() => filterClaims(claims, filters), [claims, filters]);
  const hasFilters = Boolean(
    filters.query ||
      filters.status !== "all" ||
      filters.category !== "all" ||
      filters.custody !== "all" ||
      filters.sort !== "ready",
  );
  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "Categoría" },
      ...uniqueOptions(claims.map((claim) => claim.lost_items?.item_category)),
    ],
    [claims],
  );
  const custodyOptions = useMemo(
    () => [
      { value: "all", label: "Custodia" },
      ...uniqueOptions(claims.map((claim) => claim.lost_items?.custody_location)),
    ],
    [claims],
  );

  const applyFilters = useCallback((nextFilters: DeliveryFiltersState) => {
    setFilters(nextFilters);
    replaceUrl(deliveryHref(nextFilters));
  }, []);

  const handleQueryChange = useCallback(
    (query: string) => {
      applyFilters({ ...filters, query });
    },
    [applyFilters, filters],
  );

  function clearFilters() {
    if (!hasFilters) return;
    applyFilters(defaultDeliveryFilters);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-semibold tracking-tight">Entregas</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Valida reclamos aprobados, confirma identidad y cierra cada entrega con trazabilidad operativa.
        </p>
      </div>

      <div className="space-y-3">
        <section className="space-y-3">
          <DeliveryStatusTabs
            activeStatus={filters.status}
            counts={{
              all: claims.length,
              approved: readyClaims.length,
              pending: pendingClaims.length,
              delivered: deliveredClaims.length,
              rejected: rejectedClaims.length,
            }}
            onStatusChange={(status) => applyFilters({ ...filters, status })}
          />
          <DeliveryFilters
            filters={filters}
            categoryOptions={categoryOptions}
            custodyOptions={custodyOptions}
            hasFilters={hasFilters}
            onChange={applyFilters}
            onClear={clearFilters}
            onQueryChange={handleQueryChange}
          />
        </section>

        <DeliveryTable claims={filteredClaims} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <QuickQueue claims={readyClaims} />
        <RecentHistory claims={claims} archivedCount={archivedClaims.length} />
      </div>
    </div>
  );
}

function DeliveryStatusTabs({
  activeStatus,
  counts,
  onStatusChange,
}: {
  activeStatus: DeliveryStatus;
  counts: Record<DeliveryStatus, number>;
  onStatusChange: (status: DeliveryStatus) => void;
}) {
  return (
    <nav aria-label="Filtro de entregas" className="w-fit max-w-full overflow-x-auto">
      <div className="flex w-fit min-w-max gap-1 rounded-lg border border-border bg-white p-1 dark:bg-background">
        {deliveryTabs.map((tab) => {
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

function DeliveryFilters({
  filters,
  categoryOptions,
  custodyOptions,
  hasFilters,
  onChange,
  onClear,
  onQueryChange,
}: {
  filters: DeliveryFiltersState;
  categoryOptions: SelectOption[];
  custodyOptions: SelectOption[];
  hasFilters: boolean;
  onChange: (filters: DeliveryFiltersState) => void;
  onClear: () => void;
  onQueryChange: (query: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const filterCount = [
    filters.category !== "all",
    filters.custody !== "all",
    filters.sort !== "ready",
  ].filter(Boolean).length;

  function applyFilters(nextFilters: DeliveryFiltersState) {
    onChange(nextFilters);
    setOpen(true);
  }

  return (
    <div className="grid gap-2 lg:grid-cols-[minmax(320px,520px)_1fr_auto_auto] lg:items-center">
      <DeliverySearch query={filters.query} onQueryChange={onQueryChange} />
      <div aria-hidden="true" className="hidden lg:block" />

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="secondary"
              className="h-9 border-border bg-secondary hover:bg-secondary/80"
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
              <h2 className="text-sm font-semibold tracking-tight">Filtros de entregas</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Ajusta categoría, punto de custodia y orden de la cola.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <SelectControl
                label="Categoría"
                value={filters.category}
                options={categoryOptions}
                onChange={(category) => applyFilters({ ...filters, category })}
              />
              <SelectControl
                label="Custodia"
                value={filters.custody}
                options={custodyOptions}
                onChange={(custody) => applyFilters({ ...filters, custody })}
              />
              <SelectControl
                label="Orden"
                value={filters.sort}
                inactiveValue="ready"
                options={sortOptions}
                onChange={(sort) => applyFilters({ ...filters, sort: sort as DeliverySort })}
              />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="secondary"
        onClick={onClear}
        disabled={!hasFilters}
        className="h-9 border-border bg-secondary hover:bg-secondary/80 [&:disabled]:cursor-default [&:disabled]:pointer-events-auto"
      >
        <FilterX className="size-3.5" />
        Limpiar
      </Button>
    </div>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
  inactiveValue = "all",
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  inactiveValue?: string;
}) {
  const active = value !== inactiveValue;

  function stopMenuPropagation(event: MouseEvent<HTMLSelectElement>) {
    event.stopPropagation();
  }

  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value || inactiveValue}
        onClick={stopMenuPropagation}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        className={`h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15 dark:bg-background ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DeliveryTable({ claims }: { claims: Claim[] }) {
  return (
    <Card className="gap-0 border-border py-0">
      <CardContent className="px-0 pt-0">
        {claims.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="No hay entregas con esos filtros"
            description="Cambia el estado o busca por correo, custodia o nombre del objeto para ampliar la cola."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border bg-muted/45 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Objeto</th>
                  <th className="px-3 py-2.5 font-medium">Solicitante</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-3 py-2.5 font-medium">Custodia</th>
                  <th className="px-3 py-2.5 font-medium">Siguiente paso</th>
                  <th className="px-4 py-2.5 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {claims.map((claim) => (
                  <DeliveryTableRow key={claim.id} claim={claim} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeliveryTableRow({ claim }: { claim: Claim }) {
  const item = claim.lost_items;
  const report = item?.reports ?? null;
  const requester = claim.claimant?.email ?? claim.claimed_by;
  const isReady = claim.status === "approved";

  return (
    <tr className="bg-white transition hover:bg-muted/50 dark:bg-card">
      <td className="px-4 py-3 align-middle">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
            <PackageCheck className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{item?.item_name ?? "Objeto"}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {item?.item_category ?? "Sin categoría"} · {item?.color ?? "Sin color"} · {item?.brand ?? "Sin marca"}
            </p>
          </div>
        </div>
      </td>
      <td className="max-w-[210px] px-3 py-3 align-middle">
        <p className="truncate font-medium text-foreground">{requester}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{formatLocation(report)}</p>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex flex-col items-start gap-1.5">
          <StatusBadge value={claim.status} />
          <StatusBadge value={item?.status ?? "claimed"} />
        </div>
      </td>
      <td className="max-w-[180px] px-3 py-3 align-middle text-muted-foreground">
        <span className="line-clamp-2">{item?.custody_location ?? "Sin custodia"}</span>
      </td>
      <td className="max-w-[180px] px-3 py-3 align-middle">
        <p className="text-sm font-medium text-foreground">
          {isReady ? "Validar identidad y entregar" : nextStepLabel(claim.status)}
        </p>
      </td>
      <td className="px-4 py-3 text-right align-middle">
        {isReady ? <DeliveryButton claimId={claim.id} /> : <span className="text-xs text-muted-foreground">Sin acción</span>}
      </td>
    </tr>
  );
}

function QuickQueue({ claims }: { claims: Claim[] }) {
  return (
    <Card className="gap-0 border-border py-0">
      <PanelHeader
        icon={ShieldCheck}
        title="Próximas entregas"
        description="Reclamos aprobados que pueden cerrarse desde la mesa."
      />
      <CardContent className="space-y-2 p-4 pt-0">
        {claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay objetos aprobados pendientes de entrega.</p>
        ) : (
          claims.slice(0, 5).map((claim, index) => (
            <div key={claim.id} className="flex gap-3 rounded-lg border border-border bg-white p-3 transition hover:bg-muted/35 dark:bg-card">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{claim.lost_items?.item_name ?? "Objeto"}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{claim.claimant?.email ?? claim.claimed_by}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{claim.lost_items?.custody_location ?? "Sin custodia"}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RecentHistory({ claims, archivedCount }: { claims: Claim[]; archivedCount: number }) {
  const recentClaims = [...claims]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 8);

  return (
    <Card className="gap-0 border-border py-0">
      <PanelHeader
        icon={Archive}
        title="Historial reciente"
        description={`${archivedCount} reclamos archivados o entregados.`}
      />
      <CardContent className="space-y-2 p-4 pt-0">
        {recentClaims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay reclamos registrados.</p>
        ) : (
          recentClaims.map((claim) => (
            <div key={claim.id} className="rounded-lg border border-border bg-white p-3 transition hover:bg-muted/35 dark:bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{claim.lost_items?.item_name ?? "Objeto"}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{claim.claimant?.email ?? claim.claimed_by}</p>
                </div>
                <StatusBadge value={claim.status} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(claim.created_at)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="px-4 pt-4 pb-3">
      <h2 className="flex items-center gap-2 text-base leading-snug font-semibold tracking-tight">
        <Icon className="size-4 text-primary" />
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
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
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${badgeClass(value)}`}>
      {statusLabel(value)}
    </span>
  );
}

function DeliveryButton({ claimId }: { claimId: string }) {
  return (
    <form action={updateClaimAction}>
      <input type="hidden" name="claim_id" value={claimId} />
      <input type="hidden" name="status" value="delivered" />
      <input type="hidden" name="review_notes" value="Entregado desde panel admin" />
      <Button type="submit" size="sm" className="w-full sm:w-auto">
        <ShieldCheck className="size-3.5" />
        Marcar entregado
      </Button>
    </form>
  );
}

function filterClaims(claims: Claim[], filters: DeliveryFiltersState) {
  return claims
    .filter((claim) => {
      const item = claim.lost_items;
      const report = item?.reports;
      const matchesStatus = filters.status === "all" || claim.status === filters.status;
      const matchesCategory = filters.category === "all" || item?.item_category === filters.category;
      const matchesCustody = filters.custody === "all" || item?.custody_location === filters.custody;
      const matchesQuery = textMatches(filters.query, [
        claim.status,
        statusLabel(claim.status),
        claim.claimed_by,
        claim.claimant?.email,
        claim.claimant?.full_name,
        item?.item_name,
        item?.item_category,
        item?.color,
        item?.brand,
        item?.custody_location,
        item?.status,
        statusLabel(item?.status ?? "unknown"),
        report?.title,
        report?.description,
        formatLocation(report),
      ]);

      return matchesStatus && matchesCategory && matchesCustody && matchesQuery;
    })
    .sort((left, right) => sortClaims(left, right, filters.sort));
}

function sortClaims(left: Claim, right: Claim, sort: DeliverySort) {
  if (sort === "requester") {
    return compareText(left.claimant?.email ?? left.claimed_by, right.claimant?.email ?? right.claimed_by);
  }
  if (sort === "item") return compareText(left.lost_items?.item_name, right.lost_items?.item_name);
  if (sort === "recent") return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  if (sort === "status") return compareText(left.status, right.status);
  return deliveryPriority(left) - deliveryPriority(right);
}

function deliveryHref(filters: DeliveryFiltersState) {
  const params = new URLSearchParams();
  const cleanQuery = filters.query.trim();

  if (filters.status !== "all") params.set("status", filters.status);
  if (cleanQuery) params.set("q", cleanQuery);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.custody !== "all") params.set("custody", filters.custody);
  if (filters.sort !== "ready") params.set("sort", filters.sort);

  const search = params.toString();
  return search ? `/dashboard/objetos-perdidos/entregas?${search}` : "/dashboard/objetos-perdidos/entregas";
}

export function deliveryStatus(value: string): DeliveryStatus {
  if (value === "approved" || value === "pending" || value === "delivered" || value === "rejected") {
    return value;
  }
  return "all";
}

export function deliverySort(value: string): DeliverySort {
  if (value === "recent" || value === "requester" || value === "item" || value === "status") {
    return value;
  }
  return "ready";
}

function deliveryPriority(claim: Claim) {
  const order: Record<string, number> = {
    approved: 0,
    pending: 1,
    delivered: 2,
    rejected: 3,
  };
  return order[claim.status] ?? 4;
}

function replaceUrl(href: string) {
  window.history.replaceState(null, "", href);
}

function nextStepLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Esperar revisión del reclamo",
    delivered: "Objeto ya entregado",
    rejected: "Reclamo rechazado",
  };
  return labels[status] ?? "Sin acción pendiente";
}
