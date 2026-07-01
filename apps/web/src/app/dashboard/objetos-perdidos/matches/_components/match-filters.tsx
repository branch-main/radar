"use client";

import { FilterX, SlidersHorizontal } from "lucide-react";
import { useState, type ChangeEvent, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MatchTab = "all" | "review" | "confirmed" | "discarded";
export type ScoreFilter = "all" | "90" | "75" | "50";
export type MatchSort = "score" | "recent" | "status" | "source";

export type MatchFiltersState = {
  query: string;
  tab: MatchTab;
  type: string;
  score: ScoreFilter;
  sort: MatchSort;
};

type MatchFilterControlsProps = {
  filters: MatchFiltersState;
  typeOptions: Array<{ value: string; label: string }>;
  hasFilters: boolean;
  onChange: (filters: MatchFiltersState) => void;
  onClear: () => void;
};

export function MatchFilterControls({
  filters,
  typeOptions,
  hasFilters,
  onChange,
  onClear,
}: MatchFilterControlsProps) {
  const [open, setOpen] = useState(false);
  const filterCount = [
    filters.type !== "all",
    filters.score !== "all",
    filters.sort !== "score",
  ].filter(Boolean).length;

  function applyFilters(nextFilters: MatchFiltersState) {
    onChange(nextFilters);
    setOpen(true);
  }

  function clearFilters() {
    if (!hasFilters) return;
    onClear();
    setOpen(false);
  }

  return (
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
          className="!w-[360px] max-w-[calc(100vw_-_2rem)] p-4"
        >
          <div className="grid gap-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Filtros de matches</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Ajusta tipo involucrado, confianza mínima y orden de revisión.
              </p>
            </div>
            <div className="grid gap-2">
              <SelectControl
                label="Tipo involucrado"
                value={filters.type}
                options={typeOptions}
                onChange={(value) => applyFilters({ ...filters, type: value })}
              />
              <SelectControl
                label="Confianza mínima"
                value={filters.score}
                options={[
                  { value: "90", label: "90% o más" },
                  { value: "75", label: "75% o más" },
                  { value: "50", label: "50% o más" },
                ]}
                onChange={(value) => applyFilters({ ...filters, score: value as ScoreFilter })}
              />
              <SelectControl
                label="Orden"
                value={filters.sort}
                allLabel="Mayor confianza"
                allValue="score"
                options={[
                  { value: "recent", label: "Más recientes" },
                  { value: "status", label: "Estado" },
                  { value: "source", label: "Origen A a Z" },
                ]}
                onChange={(value) => applyFilters({ ...filters, sort: value as MatchSort })}
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
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
  allLabel = "Todos",
  allValue = "all",
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  allLabel?: string;
  allValue?: string;
}) {
  const active = value !== allValue;

  function stopMenuPropagation(event: MouseEvent<HTMLSelectElement>) {
    event.stopPropagation();
  }

  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value || allValue}
        onClick={stopMenuPropagation}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        className={`h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15 dark:bg-background ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <option value={allValue}>{allLabel}</option>
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

