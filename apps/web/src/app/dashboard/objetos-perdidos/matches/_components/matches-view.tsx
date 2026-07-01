"use client";

import { Dialog as ReportDialogPrimitive } from "@base-ui/react/dialog";
import {
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { updateMatchAction } from "@/app/dashboard/actions";
import { useMatchesQuery } from "@/app/dashboard/_lib/queries";
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
import { badgeClass, formatDateTime, formatLocation, statusLabel } from "@/lib/supabase/format";
import type { Match, Report } from "@/lib/supabase/types";

import {
  MatchFilterControls,
  type MatchFiltersState,
  type MatchSort,
  type MatchTab,
  type ScoreFilter,
} from "./match-filters";
import { MatchSearch } from "./match-search";

export type MatchPageState = MatchFiltersState & {
  page: number;
};

type MatchesViewProps = {
  initialMatches: Match[];
  initialState: MatchPageState;
};

type ReportDetailSelection = {
  label: string;
  report: Report;
};

const reviewStatuses = new Set(["suggested", "notified"]);
const discardedStatuses = new Set(["rejected", "expired"]);
const matchesPerPage = 8;
const defaultMatchFilters: MatchFiltersState = {
  query: "",
  tab: "all",
  type: "all",
  score: "all",
  sort: "score",
};

export function MatchesView({ initialMatches, initialState }: MatchesViewProps) {
  const { data: matches } = useMatchesQuery(initialMatches);
  const [filters, setFilters] = useState<MatchFiltersState>(() => filtersFromState(initialState));
  const [page, setPage] = useState(initialState.page);
  const [selectedReport, setSelectedReport] = useState<ReportDetailSelection | null>(null);

  useEffect(() => {
    setFilters(filtersFromState(initialState));
    setPage(initialState.page);
  }, [initialState]);

  const filteredMatches = useMemo(
    () => filterMatches(matches, filters),
    [filters, matches],
  );
  const pageCount = Math.max(1, Math.ceil(filteredMatches.length / matchesPerPage));
  const activePage = Math.min(page, pageCount);
  const pageMatches = filteredMatches.slice(
    (activePage - 1) * matchesPerPage,
    activePage * matchesPerPage,
  );
  const counts = useMemo(
    () => ({
      all: matches.length,
      review: matches.filter((match) => reviewStatuses.has(match.status)).length,
      confirmed: matches.filter((match) => match.status === "confirmed").length,
      discarded: matches.filter((match) => discardedStatuses.has(match.status)).length,
    }),
    [matches],
  );
  const typeOptions = useMemo(
    () => uniqueOptions(matches.flatMap((match) => [match.source?.type, match.target?.type])),
    [matches],
  );
  const hasFilters = Boolean(
    filters.query ||
      filters.tab !== "all" ||
      filters.type !== "all" ||
      filters.score !== "all" ||
      filters.sort !== "score",
  );

  const applyFilters = useCallback((nextFilters: MatchFiltersState, nextPage = 1) => {
    setFilters(nextFilters);
    setPage(nextPage);
    replaceUrl(matchHref(nextFilters, nextPage));
  }, []);

  const handleQueryChange = useCallback(
    (query: string) => {
      applyFilters({ ...filters, query }, 1);
    },
    [applyFilters, filters],
  );

  function clearFilters() {
    applyFilters(defaultMatchFilters, 1);
  }

  function changePage(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), pageCount);
    setPage(safePage);
    replaceUrl(matchHref(filters, safePage));
  }

  function openReportDetail(report: Report, label: string) {
    setSelectedReport({ report, label });
  }

  function handleReportSheetOpenChange(open: boolean) {
    if (!open) setSelectedReport(null);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-semibold tracking-tight">Matches</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Revisa coincidencias entre reportes, compara señales y confirma decisiones desde una mesa compacta.
        </p>
      </div>

      <div className="space-y-3">
        <section className="space-y-3">
          <MatchTabs
            activeTab={filters.tab}
            counts={counts}
            onTabChange={(tab) => applyFilters({ ...filters, tab }, 1)}
          />

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="lg:w-[460px] xl:w-[520px]">
              <MatchSearch query={filters.query} onQueryChange={handleQueryChange} />
            </div>

            <MatchFilterControls
              filters={filters}
              typeOptions={typeOptions}
              hasFilters={hasFilters}
              onChange={(nextFilters) => applyFilters(nextFilters, 1)}
              onClear={clearFilters}
            />
          </div>
        </section>

        <Card className="gap-0 border-border py-0">
          <CardContent className="px-0 pt-0">
            {filteredMatches.length === 0 ? (
              <EmptyState hasMatches={matches.length > 0} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/45 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Coincidencia</th>
                      <th className="px-3 py-2.5 font-medium">Estado</th>
                      <th className="px-3 py-2.5 font-medium">Confianza</th>
                      <th className="px-3 py-2.5 font-medium">Razón</th>
                      <th className="px-4 py-2.5 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageMatches.map((match) => (
                      <MatchTableRow
                        key={match.id}
                        match={match}
                        onReportSelect={openReportDetail}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <PaginationControls
              page={activePage}
              pageCount={pageCount}
              pageSize={matchesPerPage}
              totalItems={filteredMatches.length}
              onPageChange={changePage}
            />
          </CardContent>
        </Card>
      </div>

      <ReportDetailDialog
        selection={selectedReport}
        onOpenChange={handleReportSheetOpenChange}
      />
    </div>
  );
}

function MatchTabs({
  activeTab,
  counts,
  onTabChange,
}: {
  activeTab: MatchTab;
  counts: Record<MatchTab, number>;
  onTabChange: (tab: MatchTab) => void;
}) {
  const tabs: Array<{ value: MatchTab; label: string }> = [
    { value: "all", label: "Todos" },
    { value: "review", label: "Por revisar" },
    { value: "confirmed", label: "Confirmados" },
    { value: "discarded", label: "Descartados" },
  ];

  return (
    <nav aria-label="Filtro de matches" className="w-fit max-w-full overflow-x-auto">
      <div className="inline-flex min-w-max gap-1 rounded-lg border border-border bg-white p-1 dark:bg-background">
        {tabs.map((tab) => {
          const selected = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => onTabChange(tab.value)}
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

function MatchTableRow({
  match,
  onReportSelect,
}: {
  match: Match;
  onReportSelect: (report: Report, label: string) => void;
}) {
  const score = Math.round(Number(match.score) * 100);

  return (
    <tr className="bg-white transition hover:bg-muted/50 dark:bg-card">
      <td className="px-4 py-3 align-middle">
        <div className="space-y-2">
          <ReportLine
            label="Origen"
            report={match.source}
            fallbackTitle="Reporte origen"
            onSelect={onReportSelect}
          />
          <ReportLine
            label="Destino"
            report={match.target}
            fallbackTitle="Reporte destino"
            onSelect={onReportSelect}
          />
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <StatusPill value={match.status} />
      </td>
      <td className="px-3 py-3 align-middle">
        <ScoreMeter value={score} />
      </td>
      <td className="max-w-[320px] px-3 py-3 align-middle text-muted-foreground">
        <span className="line-clamp-2">{match.reason}</span>
        <span className="mt-1 block font-mono text-[10px]">{match.id}</span>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex justify-end">
          <MatchActions match={match} />
        </div>
      </td>
    </tr>
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
  if (totalItems === 0 || pageCount <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Mostrando {firstItem}-{lastItem} de {totalItems}
      </p>
      <nav aria-label="Paginación de matches" className="flex flex-wrap items-center gap-1">
        <PaginationButton
          disabled={page <= 1}
          ariaLabel="Página anterior"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </PaginationButton>
        {paginationPages(page, pageCount).map((pageItem, index) =>
          pageItem === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="inline-flex h-8 min-w-8 items-center justify-center text-sm font-medium text-muted-foreground">
              ...
            </span>
          ) : (
            <PaginationButton
              key={pageItem}
              active={pageItem === page}
              ariaLabel={`Página ${pageItem}`}
              onClick={() => onPageChange(pageItem)}
            >
              {pageItem}
            </PaginationButton>
          ),
        )}
        <PaginationButton
          disabled={page >= pageCount}
          ariaLabel="Página siguiente"
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </PaginationButton>
      </nav>
    </div>
  );
}

function PaginationButton({
  disabled = false,
  active = false,
  ariaLabel,
  onClick,
  children,
}: {
  disabled?: boolean;
  active?: boolean;
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition ${
        active
          ? "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
          : "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
      } ${disabled ? "cursor-default opacity-45" : ""}`}
    >
      {children}
    </button>
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

function MatchActions({ match }: { match: Match }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="border-border bg-secondary hover:bg-secondary/80"
            aria-label="Abrir acciones del match"
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="!w-44 p-1">
        <div className="grid gap-1">
          <MatchButton matchId={match.id} status="confirmed" label="Confirmar" disabled={match.status === "confirmed"} />
          <MatchButton matchId={match.id} status="rejected" label="Rechazar" disabled={match.status === "rejected"} />
          <MatchButton matchId={match.id} status="expired" label="Expirar" disabled={match.status === "expired"} />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReportLine({
  label,
  report,
  fallbackTitle,
  onSelect,
}: {
  label: string;
  report?: Report | null;
  fallbackTitle: string;
  onSelect: (report: Report, label: string) => void;
}) {
  const title = report?.title ?? fallbackTitle;
  const type = report?.type ?? "unknown";
  const location = formatLocation(report);
  const content = (
    <>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <GitCompareArrows className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
          <StatusPill value={type} />
        </div>
        <p className="mt-1 truncate font-medium text-foreground group-hover:text-primary">
          {title}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{location}</p>
      </div>
    </>
  );

  if (!report) {
    return <div className="flex min-w-0 items-start gap-3 opacity-70">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(report, label)}
      className="group -m-1 flex w-full min-w-0 items-start gap-3 rounded-xl p-1 text-left outline-none transition hover:bg-muted/45 focus-visible:bg-muted/45 focus-visible:ring-2 focus-visible:ring-primary/25"
    >
      {content}
    </button>
  );
}

function ReportDetailDialog({
  selection,
  onOpenChange,
}: {
  selection: ReportDetailSelection | null;
  onOpenChange: (open: boolean) => void;
}) {
  const report = selection?.report ?? null;

  return (
    <ReportDialogPrimitive.Root open={Boolean(selection)} onOpenChange={onOpenChange}>
      <ReportDialogPrimitive.Portal>
        <ReportDialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <ReportDialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(760px,calc(100svh-2rem))] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-popover text-sm text-popover-foreground shadow-2xl outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          {report && (
            <>
              <div className="border-b border-border px-4 py-4 pr-12">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Detalle del reporte {selection?.label.toLowerCase()}
                    </p>
                    <ReportDialogPrimitive.Title className="mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight text-foreground">
                      {report.title || "Reporte"}
                    </ReportDialogPrimitive.Title>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusPill value={report.status} />
                    <StatusPill value={report.type} />
                  </div>
                </div>
                <ReportDialogPrimitive.Description className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {report.description || "Sin descripción registrada."}
                </ReportDialogPrimitive.Description>
              </div>

              <div className="space-y-4 overflow-y-auto p-4">
                <ReportMedia report={report} />
                <ReportSummary report={report} />
                <ReportLocation report={report} />
                <ReportNotes report={report} />
                <ReportActivity report={report} />
              </div>
            </>
          )}
          <ReportDialogPrimitive.Close
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
          </ReportDialogPrimitive.Close>
        </ReportDialogPrimitive.Popup>
      </ReportDialogPrimitive.Portal>
    </ReportDialogPrimitive.Root>
  );
}

function ReportMedia({ report }: { report: Report }) {
  if (!report.photo_url) return null;

  return (
    <a
      href={report.photo_url}
      target="_blank"
      rel="noreferrer"
      className="relative block aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted"
    >
      <Image
        src={report.photo_url}
        alt={report.title || "Reporte"}
        fill
        sizes="440px"
        className="object-cover"
      />
    </a>
  );
}

function ReportSummary({ report }: { report: Report }) {
  return (
    <DetailSection title="Resumen">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-muted/25 p-3">
        <DetailField label="Estado" value={statusLabel(report.status)} />
        <DetailField label="Tipo" value={statusLabel(report.type)} />
        <DetailField label="Confianza" value={`${reportConfidence(report)}%`} />
        <DetailField label="ID" value={report.id} />
      </div>
    </DetailSection>
  );
}

function ReportLocation({ report }: { report: Report }) {
  const zone = report.campus_zones;

  return (
    <DetailSection title="Ubicación">
      <div className="divide-y divide-border rounded-xl border border-border bg-muted/25">
        <DetailRow label="Ubicación" value={formatLocation(report)} />
        {zone && <DetailRow label="Edificio" value={zone.building} />}
        {zone?.floor && <DetailRow label="Piso" value={zone.floor} />}
        <DetailRow label="Coordenadas" value={formatCoordinates(report)} />
      </div>
    </DetailSection>
  );
}

function ReportNotes({ report }: { report: Report }) {
  return (
    <DetailSection title="Notas">
      <div className="space-y-3 rounded-xl border border-border bg-muted/25 p-3">
        <DetailNote label="Descripción" value={report.description || "Sin descripción registrada."} />
        <DetailNote label="Clasificación" value={report.classification_reason || "Sin clasificación registrada."} />
      </div>
    </DetailSection>
  );
}

function ReportActivity({ report }: { report: Report }) {
  return (
    <DetailSection title="Actividad">
      <div className="divide-y divide-border rounded-xl border border-border bg-muted/25">
        <DetailRow label="Creado" value={formatDateTime(report.created_at)} />
        <DetailRow label="Actualizado" value={formatDateTime(report.updated_at)} />
      </div>
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
    <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 px-3 py-2.5 text-sm">
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

function reportConfidence(report: Report) {
  return Math.round(Number(report.ai_confidence ?? 0) * 100);
}

function formatCoordinates(report: Report) {
  if (report.latitude != null && report.longitude != null) {
    return `${report.latitude}, ${report.longitude}`;
  }

  return "Sin coordenadas";
}

function ScoreMeter({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="min-w-36">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Confianza</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/70">
        <div className={`h-full rounded-full ${scoreClass(percent)}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${badgeClass(value)}`}>
      {statusLabel(value)}
    </span>
  );
}

function EmptyState({ hasMatches }: { hasMatches: boolean }) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Search className="size-5" />
      </div>
      <p className="text-sm font-medium">
        {hasMatches ? "No encontramos matches" : "No hay matches registrados"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasMatches
          ? "Prueba con otra búsqueda o ajusta el score mínimo para volver a ver resultados."
          : "Cuando el sistema detecte coincidencias aparecerán en esta tabla."}
      </p>
    </div>
  );
}

function MatchButton({
  matchId,
  status,
  label,
  disabled,
}: {
  matchId: string;
  status: "confirmed" | "rejected" | "expired";
  label: string;
  disabled: boolean;
}) {
  return (
    <form action={updateMatchAction}>
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="status" value={status} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        disabled={disabled}
        className={`w-full justify-start ${status === "confirmed" ? "" : "text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive"}`}
      >
        {label}
      </Button>
    </form>
  );
}

function filterMatches(matches: Match[], filters: MatchFiltersState) {
  return matches
    .filter((match) => {
      const score = Number(match.score) * 100;
      const scoreThreshold = filters.score === "all" ? 0 : Number(filters.score);
      const matchesTab = filters.tab === "all" || matchTabIncludes(filters.tab, match.status);
      const matchesType = filters.type === "all" || match.source?.type === filters.type || match.target?.type === filters.type;
      const matchesScore = score >= scoreThreshold;
      const matchesQuery = textMatches(filters.query, [
        match.id,
        match.reason,
        match.status,
        statusLabel(match.status),
        match.source?.title,
        match.source?.description,
        match.source?.type,
        statusLabel(match.source?.type ?? "unknown"),
        formatLocation(match.source),
        match.target?.title,
        match.target?.description,
        match.target?.type,
        statusLabel(match.target?.type ?? "unknown"),
        formatLocation(match.target),
      ]);

      return matchesTab && matchesType && matchesScore && matchesQuery;
    })
    .sort((left, right) => sortMatches(left, right, filters.sort));
}

function sortMatches(left: Match, right: Match, sort: MatchSort) {
  if (sort === "recent") return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  if (sort === "status") return compareText(left.status, right.status);
  if (sort === "source") return compareText(left.source?.title, right.source?.title);
  return Number(right.score) - Number(left.score);
}

export function matchTab(value: string): MatchTab {
  if (value === "review" || value === "confirmed" || value === "discarded") return value;
  return "all";
}

export function scoreFilter(value: string): ScoreFilter {
  if (value === "90" || value === "75" || value === "50") return value;
  return "all";
}

export function tabFromStatus(status: string): MatchTab {
  if (reviewStatuses.has(status)) return "review";
  if (status === "confirmed") return "confirmed";
  if (discardedStatuses.has(status)) return "discarded";
  return "all";
}

export function matchSort(value: string): MatchSort {
  if (value === "recent" || value === "status" || value === "source") return value;
  return "score";
}

export function positiveInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function matchTabIncludes(tab: MatchTab, status: string) {
  if (tab === "review") return reviewStatuses.has(status);
  if (tab === "confirmed") return status === "confirmed";
  if (tab === "discarded") return discardedStatuses.has(status);
  return true;
}

function filtersFromState(state: MatchPageState): MatchFiltersState {
  return {
    query: state.query,
    tab: state.tab,
    type: state.type,
    score: state.score,
    sort: state.sort,
  };
}

function matchHref(filters: MatchFiltersState, page = 1) {
  const params = new URLSearchParams();
  const cleanQuery = filters.query.trim();

  if (filters.tab !== "all") params.set("tab", filters.tab);
  if (cleanQuery) params.set("q", cleanQuery);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.score !== "all") params.set("score", filters.score);
  if (filters.sort !== "score") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search ? `/dashboard/objetos-perdidos/matches?${search}` : "/dashboard/objetos-perdidos/matches";
}

function replaceUrl(href: string) {
  window.history.replaceState(null, "", href);
}

function scoreClass(value: number) {
  if (value >= 85) return "bg-emerald-500";
  if (value >= 65) return "bg-primary";
  if (value >= 45) return "bg-amber-500";
  return "bg-destructive";
}
