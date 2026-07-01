import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function LoadingRegion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-label="Cargando contenido" className={className}>
      {children}
      <span className="sr-only">Cargando contenido</span>
    </div>
  );
}

function PageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>
      {action && <Skeleton className="h-8 w-36 rounded-lg" />}
    </div>
  );
}

function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="w-fit max-w-full overflow-hidden rounded-lg border border-border bg-white p-1 dark:bg-background">
      <div className="flex min-w-max gap-1">
        {Array.from({ length: count }, (_, index) => (
          <Skeleton key={`tab-${index}`} className="h-8 w-24 rounded-md" />
        ))}
      </div>
    </div>
  );
}

function FiltersSkeleton({ tabs = false, tabCount = 4, controls = 2 }: { tabs?: boolean; tabCount?: number; controls?: number }) {
  return (
    <section className="space-y-3">
      {tabs && <TabsSkeleton count={tabCount} />}
      <div className="grid gap-2 lg:grid-cols-[minmax(320px,520px)_1fr_auto_auto] lg:items-center">
        <Skeleton className="h-9 w-full rounded-lg" />
        <div aria-hidden="true" className="hidden lg:block" />
        {Array.from({ length: controls }, (_, index) => (
          <Skeleton key={`filter-${index}`} className="h-9 w-full rounded-lg sm:w-24" />
        ))}
      </div>
    </section>
  );
}

function PanelSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-[#e7f0f2] bg-white/90 p-4 text-sm", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-5 w-36" />
        </div>
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={`panel-row-${index}`} className="rounded-lg bg-muted/35 p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HeroBlockSkeleton() {
  return (
    <section className="space-y-4">
      <div className="min-w-0 rounded-2xl border border-[#e7f0f2] bg-[linear-gradient(135deg,#dae9eb_0%,#edf6f7_100%)] p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-3 w-44 bg-white/55" />
          <Skeleton className="h-3 w-36 bg-white/45" />
        </div>
        <Skeleton className="mt-6 h-10 w-full max-w-xl bg-white/55" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl bg-white/45" />
        <Skeleton className="mt-2 h-4 w-2/3 bg-white/45" />
        <div className="mt-5 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-40 rounded-lg bg-white/55" />
          <Skeleton className="h-9 w-36 rounded-lg bg-white/45" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={`kpi-${index}`} className="rounded-xl border border-[#e7f0f2] bg-white/78 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-9 w-20" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}

function TableCardSkeleton({ rows = 8, columns = 4 }: { rows?: number; columns?: number }) {
  const gridTemplateColumns = `minmax(260px,1.6fr) repeat(${Math.max(columns - 1, 0)}, minmax(120px,.8fr))`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white/90">
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div
            className="grid gap-3 border-b border-border bg-muted/45 px-4 py-3"
            style={{ gridTemplateColumns }}
          >
            {Array.from({ length: columns }, (_, index) => (
              <Skeleton key={`head-${index}`} className="h-3 w-24" />
            ))}
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: rows }, (_, rowIndex) => (
              <div
                key={`row-${rowIndex}`}
                className="grid items-center gap-3 px-4 py-3"
                style={{ gridTemplateColumns }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
                {Array.from({ length: Math.max(columns - 1, 0) }, (_, columnIndex) => (
                  <Skeleton key={`cell-${rowIndex}-${columnIndex}`} className="h-6 w-24 rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuxiliaryPanelsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <PanelSkeleton key={`aux-panel-${index}`} rows={index === 0 ? 4 : 3} />
      ))}
    </div>
  );
}

function DataTablePageSkeleton({
  action = false,
  tabs = false,
  tabCount = 4,
  controls = 2,
  rows = 8,
  columns = 4,
  auxiliaryPanels = 0,
}: {
  action?: boolean;
  tabs?: boolean;
  tabCount?: number;
  controls?: number;
  rows?: number;
  columns?: number;
  auxiliaryPanels?: number;
}) {
  return (
    <LoadingRegion className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeaderSkeleton action={action} />
      <div className="space-y-3">
        <FiltersSkeleton tabs={tabs} tabCount={tabCount} controls={controls} />
        <TableCardSkeleton rows={rows} columns={columns} />
      </div>
      {auxiliaryPanels > 0 && <AuxiliaryPanelsSkeleton count={auxiliaryPanels} />}
    </LoadingRegion>
  );
}

export function DashboardHomeSkeleton() {
  return (
    <LoadingRegion className="space-y-6 xl:flex xl:h-[calc(100svh-4rem)] xl:min-h-0 xl:flex-col xl:space-y-0 xl:overflow-hidden">
      <PageHeaderSkeleton />
      <div className="space-y-4 xl:mt-6 xl:grid xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-4 xl:space-y-0 xl:overflow-hidden">
        <div className="no-scrollbar space-y-4 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          <HeroBlockSkeleton />
          <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
            <PanelSkeleton rows={5} />
            <PanelSkeleton rows={3} className="bg-card/75" />
          </section>
          <PanelSkeleton rows={4} />
          <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
            <PanelSkeleton rows={4} />
            <PanelSkeleton rows={4} />
          </section>
          <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
            <PanelSkeleton rows={3} />
            <MapSkeleton compact />
          </section>
          <TableCardSkeleton rows={4} columns={5} />
        </div>
        <aside className="no-scrollbar space-y-4 xl:min-h-0 xl:overflow-y-auto">
          <PanelSkeleton rows={3} />
          <PanelSkeleton rows={3} />
          <PanelSkeleton rows={4} />
          <PanelSkeleton rows={4} />
        </aside>
      </div>
    </LoadingRegion>
  );
}

function MapSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-xl border border-[#e7f0f2] bg-white/90 p-4 text-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <div className={cn("relative overflow-hidden rounded-xl border bg-[#e8f1f0]", compact ? "min-h-[280px]" : "min-h-[680px]")}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,75,90,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(15,75,90,0.07)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute left-[8%] top-[18%] h-[18%] w-[30%] rounded-2xl bg-white/40" />
        <div className="absolute right-[10%] top-[16%] h-[22%] w-[24%] rounded-2xl bg-white/45" />
        <div className="absolute bottom-[16%] left-[18%] h-[24%] w-[28%] rounded-2xl bg-white/40" />
        <div className="absolute bottom-[22%] right-[18%] h-[18%] w-[26%] rounded-2xl bg-white/45" />
        {Array.from({ length: compact ? 4 : 7 }, (_, index) => (
          <Skeleton
            key={`map-point-${index}`}
            className="absolute size-10 rounded-2xl bg-white/80"
            style={{ left: `${18 + index * 11}%`, top: `${28 + (index % 3) * 18}%` }}
          />
        ))}
      </div>
    </section>
  );
}

export function IncidentsPageSkeleton() {
  return <DataTablePageSkeleton rows={9} columns={4} controls={2} />;
}

export function TechniciansPageSkeleton() {
  return <DataTablePageSkeleton action tabs tabCount={3} rows={9} columns={5} controls={3} />;
}

export function CatalogPageSkeleton() {
  return <DataTablePageSkeleton rows={9} columns={4} controls={2} auxiliaryPanels={2} />;
}

export function DeliveriesPageSkeleton() {
  return <DataTablePageSkeleton tabs tabCount={5} rows={8} columns={6} controls={2} auxiliaryPanels={2} />;
}

export function MatchesPageSkeleton() {
  return <DataTablePageSkeleton tabs tabCount={4} rows={7} columns={5} controls={1} />;
}

export function NotificationsPageSkeleton() {
  return <DataTablePageSkeleton action tabs tabCount={3} rows={8} columns={3} controls={0} />;
}

export function BuildingsMapPageSkeleton() {
  return (
    <LoadingRegion className="mx-auto w-full max-w-7xl space-y-7">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-[#e7f0f2] bg-[linear-gradient(135deg,#f8fcfd_0%,#e9f6f8_58%,#d9edf0_100%)] p-6">
        <Skeleton className="h-3 w-44 bg-white/60" />
        <Skeleton className="mt-4 h-9 w-72 bg-white/55" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl bg-white/45" />
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={`metric-${index}`} className="flex items-center gap-3">
              <Skeleton className="size-4 rounded-full bg-white/55" />
              <div>
                <Skeleton className="h-7 w-12 bg-white/55" />
                <Skeleton className="mt-2 h-3 w-20 bg-white/45" />
              </div>
            </div>
          ))}
        </div>
      </header>
      <MapSkeleton />
      <TableCardSkeleton rows={6} columns={3} />
    </LoadingRegion>
  );
}

export function TechnicianFormSkeleton() {
  return (
    <LoadingRegion className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <section className="overflow-hidden rounded-xl border border-[#e7f0f2] bg-white/90">
        <div className="border-b border-border px-4 pt-4 pb-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-5 w-40" />
        </div>
        <div className="space-y-4 p-4">
          <FieldSkeleton />
          <FieldSkeleton />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </section>
    </LoadingRegion>
  );
}

export function TechnicianDetailSkeleton() {
  return (
    <LoadingRegion className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-6 w-56" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={`detail-metric-${index}`} className="rounded-xl border border-[#e7f0f2] bg-white/90 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <PanelSkeleton rows={2} />
          <TableCardSkeleton rows={5} columns={3} />
        </div>
        <PanelSkeleton rows={4} className="xl:sticky xl:top-6 xl:self-start" />
      </div>
    </LoadingRegion>
  );
}

export function SettingsPageSkeleton() {
  return (
    <LoadingRegion className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <aside className="hidden space-y-2 lg:block">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={`settings-nav-${index}`} className="h-9 w-full rounded-lg" />
          ))}
        </aside>
        <section className="overflow-hidden rounded-xl border border-[#e7f0f2] bg-white/90">
          {Array.from({ length: 5 }, (_, sectionIndex) => (
            <div key={`settings-section-${sectionIndex}`} className="grid gap-4 border-b border-border px-4 py-4 last:border-b-0">
              <div>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="mt-2 h-4 w-full max-w-lg" />
              </div>
              <div className="space-y-4">
                <FieldSkeleton />
                <FieldSkeleton />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldSkeleton />
                  <FieldSkeleton />
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </LoadingRegion>
  );
}

function FieldSkeleton() {
  return (
    <div className="grid gap-1.5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  );
}
