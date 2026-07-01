"use client";

import { Package } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type TransitionEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { badgeClass, formatDateTime, formatLocation, statusLabel } from "@/lib/supabase/format";
import type { LostItem } from "@/lib/supabase/types";

import type { CatalogFiltersState } from "./catalog-filters";

type CatalogResultsProps = {
  items: LostItem[];
  totalItems: number;
  page: number;
  pageCount: number;
  pageSize: number;
  filters: CatalogFiltersState;
};

export function CatalogResults({
  items,
  totalItems,
  page,
  pageCount,
  pageSize,
  filters,
}: CatalogResultsProps) {
  const router = useRouter();
  const [detailHeight, setDetailHeight] = useState<number | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [renderedReportId, setRenderedReportId] = useState<string | null>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);

  const currentPage = Math.min(page, pageCount);
  const selectedItem = selectedReportId
    ? items.find((item) => item.report_id === selectedReportId) ?? null
    : null;
  const detailOpen = Boolean(selectedItem);
  const renderedItem = selectedItem ?? (renderedReportId
    ? items.find((item) => item.report_id === renderedReportId) ?? null
    : null);
  const selectedId = selectedItem?.report_id ?? null;

  useEffect(() => {
    const node = tableCardRef.current;
    if (!node) return;

    let frame = 0;
    const updateDetailHeight = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextHeight = node.getBoundingClientRect().height;

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

  function toggleItemSelection(reportId: string) {
    if (selectedReportId === reportId) {
      setSelectedReportId(null);
      return;
    }

    setRenderedReportId(reportId);
    setSelectedReportId(reportId);
  }

  function changePage(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), pageCount);
    setSelectedReportId(null);
    router.replace(catalogPageHref(filters, safePage), { scroll: false });
  }

  function handleResultsTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "grid-template-columns") return;
    if (!detailOpen) setRenderedReportId(null);
  }

  if (totalItems === 0) {
    return (
      <Card className="gap-0 border-border py-0">
        <CardContent className="px-0 pt-0">
          <EmptyState
            icon={Package}
            title="No encontramos objetos con esos filtros"
            description="Prueba ampliar el estado, eliminar el edificio o buscar por una palabra clave más corta."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="grid items-start gap-y-4 transition-[grid-template-columns,column-gap] duration-200 ease-out xl:grid-cols-[minmax(0,1fr)_var(--catalog-detail-width)] xl:[column-gap:var(--catalog-detail-gap)]"
      onTransitionEnd={handleResultsTransitionEnd}
      style={
        {
          "--catalog-detail-width": detailOpen ? "390px" : "0px",
          "--catalog-detail-gap": detailOpen ? "1rem" : "0rem",
        } as CSSProperties
      }
    >
      <Card ref={tableCardRef} className="gap-0 border-border py-0 xl:self-start">
        <CardContent className="px-0 pt-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-border bg-muted/45 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Objeto</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 font-medium">Categoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <CatalogTableRow
                    key={item.report_id}
                    item={item}
                    selected={item.report_id === selectedId}
                    onSelect={() => toggleItemSelection(item.report_id)}
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
            <CatalogDetail
              key={renderedItem.report_id}
              item={renderedItem}
              height={detailHeight}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogTableRow({
  item,
  selected,
  onSelect,
}: {
  item: LostItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const report = item.reports;

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
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
          : "bg-white hover:bg-muted/35 focus-visible:bg-muted/45 dark:bg-card"
      }`}
    >
      <td className="px-4 py-3 align-middle">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            {report?.photo_url ? (
              <Image src={report.photo_url} alt={item.item_name} fill sizes="40px" className="object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Package className="size-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{item.item_name}</p>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{itemFeatures(item)}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <StatusBadge value={item.status} />
      </td>
      <td className="px-3 py-3 align-middle">
        <StatusBadge value={report?.type ?? "unknown"} />
      </td>
      <td className="px-3 py-3 align-middle">
        <p className="font-medium text-foreground">{item.item_category}</p>
      </td>
    </tr>
  );
}

function CatalogDetail({ item, height }: { item: LostItem; height: number | null }) {
  const report = item.reports;
  const reportType = report?.type ?? "unknown";
  const confidence = confidenceValue(item);
  const location = formatLocation(report);
  const description = item.distinguishing_marks || report?.description || "Sin descripción registrada.";

  return (
    <Card
      className="gap-0 border-border py-0 xl:max-h-[var(--catalog-detail-height)] xl:min-h-0 xl:self-start xl:overflow-y-auto xl:overscroll-contain"
      style={height ? ({ "--catalog-detail-height": `${height}px` } as CSSProperties) : undefined}
    >
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Detalle</p>
            <h2 className="mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight">
              {item.item_name}
            </h2>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <StatusBadge value={item.status} />
            <StatusBadge value={reportType} />
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      <CardContent className="space-y-4 p-4">
        <CatalogMedia item={item} />
        <CatalogSummary item={item} confidence={confidence} reportType={reportType} />
        <LocationAndCustody item={item} location={location} />
        <ItemAttributes item={item} />
        <DetailSection title="Notas">
          <div className="space-y-3 rounded-xl border border-border bg-muted/25 p-3">
            <DetailNote label="Descripción" value={report?.description || "Sin descripción registrada."} />
            <DetailNote label="Clasificación" value={report?.classification_reason || "Sin clasificación registrada."} />
          </div>
        </DetailSection>
        <ActivityTimeline
          createdAt={item.created_at}
          updatedAt={item.updated_at}
          deliveredAt={item.delivered_at}
        />
      </CardContent>
    </Card>
  );
}

function CatalogMedia({ item }: { item: LostItem }) {
  const photoUrl = item.reports?.photo_url;

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
        alt={item.item_name}
        fill
        sizes="390px"
        className="object-cover"
      />
    </a>
  );
}

function CatalogSummary({
  item,
  confidence,
  reportType,
}: {
  item: LostItem;
  confidence: number;
  reportType: string;
}) {
  return (
    <DetailSection title="Resumen">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-muted/25 p-3">
        <DetailField label="Estado" value={statusLabel(item.status)} />
        <DetailField label="Tipo" value={statusLabel(reportType)} />
        <DetailField label="Categoría" value={item.item_category} />
        <DetailField label="Confianza" value={`${confidence}%`} />
      </div>
    </DetailSection>
  );
}

function LocationAndCustody({ item, location }: { item: LostItem; location: string }) {
  const zone = item.reports?.campus_zones;

  return (
    <DetailSection title="Ubicación y custodia">
      <div className="divide-y divide-border rounded-xl border border-border bg-muted/25">
        <DetailRow label="Ubicación" value={location} />
        {zone && <DetailRow label="Edificio" value={zone.building} />}
        {zone?.floor && <DetailRow label="Piso" value={zone.floor} />}
        <DetailRow label="Custodia" value={item.custody_location || "Sin punto de custodia"} />
        <DetailRow
          label="Entrega"
          value={item.delivered_at ? formatDateTime(item.delivered_at) : "Pendiente"}
        />
      </div>
    </DetailSection>
  );
}

function ItemAttributes({ item }: { item: LostItem }) {
  return (
    <DetailSection title="Señas">
      <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-muted/25 p-3">
        <DetailField label="Color" value={item.color ?? "No registrado"} />
        <DetailField label="Marca" value={item.brand ?? "No registrada"} />
        <DetailField label="Categoría" value={item.item_category} />
      </div>
      <p className="rounded-xl border border-border bg-muted/25 px-3 py-2 text-sm leading-6 text-foreground">
        {item.distinguishing_marks || "No hay marcas distintivas registradas."}
      </p>
    </DetailSection>
  );
}

function ActivityTimeline({
  createdAt,
  updatedAt,
  deliveredAt,
}: {
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
}) {
  return (
    <DetailSection title="Actividad">
      <div className="divide-y divide-border rounded-xl border border-border bg-muted/25">
        <DetailRow label="Registrado" value={formatDateTime(createdAt)} />
        <DetailRow label="Actualizado" value={formatDateTime(updatedAt)} />
        <DetailRow label="Entrega" value={deliveredAt ? formatDateTime(deliveredAt) : "Pendiente"} />
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

function itemFeatures(item: LostItem) {
  return [item.color, item.brand].filter(Boolean).join(" · ") || "-";
}

function confidenceValue(item: LostItem) {
  return Math.round(Number(item.reports?.ai_confidence ?? 0) * 100);
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

function catalogPageHref(filters: CatalogFiltersState, page: number) {
  const params = new URLSearchParams();
  const cleanQuery = filters.query.trim();

  if (cleanQuery) params.set("q", cleanQuery);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.building !== "all") params.set("building", filters.building);
  if (filters.photo !== "all") params.set("photo", filters.photo);
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search ? `/dashboard/objetos-perdidos/catalogo?${search}` : "/dashboard/objetos-perdidos/catalogo";
}
