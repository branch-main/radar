"use client";

import { FilterX, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { SelectOption } from "./lost-found-ui";

export type CatalogFiltersState = {
  query: string;
  status: string;
  type: string;
  category: string;
  building: string;
  photo: string;
  sort: string;
};

type CatalogFiltersProps = {
  filters: CatalogFiltersState;
  statusOptions: SelectOption[];
  typeOptions: SelectOption[];
  categoryOptions: SelectOption[];
  buildingOptions: SelectOption[];
};

const defaultCatalogFilters: CatalogFiltersState = {
  query: "",
  status: "all",
  type: "all",
  category: "all",
  building: "all",
  photo: "all",
  sort: "recent",
};

export function CatalogFilters({
  filters,
  statusOptions,
  typeOptions,
  categoryOptions,
  buildingOptions,
}: CatalogFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(filters);
  const [query, setQuery] = useState(filters.query);
  const filterCount = [
    activeFilters.status !== "all",
    activeFilters.type !== "all",
    activeFilters.category !== "all",
    activeFilters.building !== "all",
    activeFilters.photo !== "all",
    activeFilters.sort !== "recent",
  ].filter(Boolean).length;
  const hasFilters = Boolean(query || filterCount);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (cleanQuery === filters.query.trim()) return;

    const timeout = window.setTimeout(() => {
      router.replace(catalogHref({ ...activeFilters, query: cleanQuery }), { scroll: false });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [activeFilters, filters.query, query, router]);

  function applyFilters(nextFilters: CatalogFiltersState) {
    setActiveFilters(nextFilters);
    router.replace(catalogHref(nextFilters), { scroll: false });
    setOpen(true);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = { ...activeFilters, query };
    setActiveFilters(nextFilters);
    router.replace(catalogHref(nextFilters), { scroll: false });
  }

  function clearFilters() {
    if (!hasFilters) return;
    setQuery("");
    setActiveFilters(defaultCatalogFilters);
    router.replace("/dashboard/objetos-perdidos/catalogo", { scroll: false });
    setOpen(false);
  }

  return (
    <form onSubmit={handleSearchSubmit} className="w-full">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="lg:w-[460px] xl:w-[520px]">
          <SearchControl query={query} onQueryChange={setQuery} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <DropdownMenu open={open} onOpenChange={setOpen}>
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
                  <h2 className="text-sm font-semibold tracking-tight">Filtros del catálogo</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajusta estado, tipo, categoría, edificio, evidencia visual y orden.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <SelectControl
                    label="Estado"
                    value={activeFilters.status}
                    allLabel="Estado"
                    options={statusOptions}
                    onChange={(value) => applyFilters({ ...activeFilters, query, status: value })}
                  />
                  <SelectControl
                    label="Tipo"
                    value={activeFilters.type}
                    allLabel="Tipo"
                    options={typeOptions}
                    onChange={(value) => applyFilters({ ...activeFilters, query, type: value })}
                  />
                  <SelectControl
                    label="Categoría"
                    value={activeFilters.category}
                    allLabel="Categoría"
                    options={categoryOptions}
                    onChange={(value) => applyFilters({ ...activeFilters, query, category: value })}
                  />
                  <SelectControl
                    label="Edificio"
                    value={activeFilters.building}
                    allLabel="Edificio"
                    options={buildingOptions}
                    onChange={(value) => applyFilters({ ...activeFilters, query, building: value })}
                  />
                  <SelectControl
                    label="Evidencia visual"
                    value={activeFilters.photo}
                    allLabel="Evidencia"
                    options={[
                      { value: "with", label: "Con foto" },
                      { value: "without", label: "Sin foto" },
                    ]}
                    onChange={(value) => applyFilters({ ...activeFilters, query, photo: value })}
                  />
                  <SelectControl
                    label="Orden"
                    value={activeFilters.sort}
                    inactiveValue="recent"
                    options={[
                      { value: "recent", label: "Más recientes" },
                      { value: "confidence", label: "Mayor confianza IA" },
                      { value: "name", label: "Nombre" },
                      { value: "category", label: "Categoría" },
                      { value: "status", label: "Estado" },
                    ]}
                    onChange={(value) => applyFilters({ ...activeFilters, query, sort: value })}
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
            className="h-9 w-24 border-border bg-secondary hover:bg-secondary/80 [&:disabled]:cursor-default [&:disabled]:pointer-events-auto"
          >
            <FilterX className="size-3.5" />
            Limpiar
          </Button>
        </div>
      </div>
    </form>
  );
}

function SearchControl({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">Buscar objetos</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar objeto, marca, color, custodia, edificio o ID"
        className="h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15 dark:bg-background"
      />
    </label>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
  allLabel,
  inactiveValue = "all",
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  allLabel?: string;
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
        {allLabel && <option value="all">{allLabel}</option>}
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function catalogHref(filters: CatalogFiltersState) {
  const params = new URLSearchParams();
  const cleanQuery = filters.query.trim();

  if (cleanQuery) params.set("q", cleanQuery);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.building !== "all") params.set("building", filters.building);
  if (filters.photo !== "all") params.set("photo", filters.photo);
  if (filters.sort !== "recent") params.set("sort", filters.sort);

  const search = params.toString();
  return search ? `/dashboard/objetos-perdidos/catalogo?${search}` : "/dashboard/objetos-perdidos/catalogo";
}
