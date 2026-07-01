import type { Metadata } from "next";
import {
  Check,
  GitCompareArrows,
  Gauge,
  Search,
  ShieldX,
  TimerOff,
} from "lucide-react";
import type { ComponentType } from "react";

import { updateMatchAction } from "@/app/dashboard/actions";
import {
  compareText,
  CrmCell,
  CrmHeaderCell,
  CrmTableShell,
  EmptyState,
  FilterPanel,
  MetricCard,
  PageHero,
  paramValue,
  ProgressBar,
  SearchParams,
  SelectFilter,
  StatusBadge,
  textMatches,
  uniqueOptions,
} from "@/app/dashboard/objetos-perdidos/_components/lost-found-ui";
import { Button } from "@/components/ui/button";
import { getMatches } from "@/lib/supabase/dashboard";
import { formatDateTime, formatLocation, statusLabel } from "@/lib/supabase/format";
import type { Match } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Matches",
};

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const matches = await getMatches();

  const query = paramValue(params, "q");
  const status = paramValue(params, "status", "all");
  const type = paramValue(params, "type", "all");
  const minScore = paramValue(params, "score", "all");
  const sort = paramValue(params, "sort", "score");

  const suggested = matches.filter((match) => ["suggested", "notified"].includes(match.status));
  const confirmed = matches.filter((match) => match.status === "confirmed");
  const rejected = matches.filter((match) => ["rejected", "expired"].includes(match.status));
  const averageScore = matches.length
    ? Math.round(matches.reduce((total, match) => total + Number(match.score), 0) * 100 / matches.length)
    : 0;

  const filteredMatches = matches
    .filter((match) => {
      const score = Number(match.score) * 100;
      const scoreThreshold = minScore === "all" ? 0 : Number(minScore);
      const matchesStatus = status === "all" || match.status === status;
      const matchesType = type === "all" || match.source?.type === type || match.target?.type === type;
      const matchesScore = score >= scoreThreshold;
      const matchesQuery = textMatches(query, [
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

      return matchesStatus && matchesType && matchesScore && matchesQuery;
    })
    .sort((left, right) => {
      if (sort === "recent") return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      if (sort === "status") return compareText(left.status, right.status);
      if (sort === "source") return compareText(left.source?.title, right.source?.title);
      return Number(right.score) - Number(left.score);
    });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHero
        eyebrow="Motor de coincidencias"
        title="Matches bajo lupa"
        description="Prioriza señales de alta confianza, compara reportes origen y destino, y toma decisiones rápidas desde una mesa de revisión enfocada."
        icon={GitCompareArrows}
        activePath="/dashboard/objetos-perdidos/matches"
        stats={[
          { label: "Por revisar", value: suggested.length },
          { label: "Confirmados", value: confirmed.length },
          { label: "Score medio", value: `${averageScore}%` },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Por revisar" value={suggested.length} icon={Search} tone="amber" />
        <MetricCard label="Confirmados" value={confirmed.length} icon={Check} tone="emerald" />
        <MetricCard label="Descartados" value={rejected.length} icon={ShieldX} tone="slate" />
        <MetricCard label="Score promedio" value={`${averageScore}%`} icon={Gauge} />
      </div>

      <FilterPanel
        action="/dashboard/objetos-perdidos/matches"
        query={query}
        placeholder="Buscar por reporte, razón, estado, ubicación o ID"
        resultLabel={`${filteredMatches.length} de ${matches.length} matches`}
      >
        <SelectFilter label="Estado" name="status" value={status} options={uniqueOptions(matches.map((match) => match.status))} />
        <SelectFilter
          label="Tipo involucrado"
          name="type"
          value={type}
          options={uniqueOptions(matches.flatMap((match) => [match.source?.type, match.target?.type]))}
        />
        <SelectFilter
          label="Score mínimo"
          name="score"
          value={minScore}
          options={[
            { value: "90", label: "90% o más" },
            { value: "75", label: "75% o más" },
            { value: "50", label: "50% o más" },
          ]}
        />
        <SelectFilter
          label="Ordenar"
          name="sort"
          value={sort}
          allLabel="Mayor score"
          options={[
            { value: "score", label: "Mayor score" },
            { value: "recent", label: "Más recientes" },
            { value: "status", label: "Estado" },
            { value: "source", label: "Origen A a Z" },
          ]}
        />
      </FilterPanel>

      {filteredMatches.length === 0 ? (
        <EmptyState
          title="No hay coincidencias para revisar"
          description="Ajusta el score mínimo o elimina filtros de estado para volver a ver el flujo completo."
        />
      ) : (
        <MatchTable matches={filteredMatches} />
      )}
    </div>
  );
}

function MatchTable({ matches }: { matches: Match[] }) {
  return (
    <CrmTableShell
      title="Pipeline de matches"
      description="Mesa CRM para revisar coincidencias, comparar reportes y ejecutar acciones en línea."
      count={matches.length}
    >
      <table className="min-w-[1180px] w-full border-separate border-spacing-0">
        <thead className="bg-muted/30">
          <tr>
            <CrmHeaderCell>Origen</CrmHeaderCell>
            <CrmHeaderCell>Destino</CrmHeaderCell>
            <CrmHeaderCell>Estado</CrmHeaderCell>
            <CrmHeaderCell>Score</CrmHeaderCell>
            <CrmHeaderCell>Razón</CrmHeaderCell>
            <CrmHeaderCell>Creado</CrmHeaderCell>
            <CrmHeaderCell className="text-right">Acciones</CrmHeaderCell>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => {
            const score = Math.round(Number(match.score) * 100);

            return (
              <tr key={match.id} className="group transition hover:bg-muted/25">
                <CrmCell className="min-w-72 border-t border-border">
                  <ReportSummary
                    title={match.source?.title ?? "Reporte origen"}
                    type={match.source?.type ?? "unknown"}
                    location={formatLocation(match.source)}
                  />
                </CrmCell>
                <CrmCell className="min-w-72 border-t border-border">
                  <ReportSummary
                    title={match.target?.title ?? "Reporte destino"}
                    type={match.target?.type ?? "unknown"}
                    location={formatLocation(match.target)}
                  />
                </CrmCell>
                <CrmCell className="border-t border-border"><StatusBadge value={match.status} /></CrmCell>
                <CrmCell className="w-44 border-t border-border"><ProgressBar value={score} /></CrmCell>
                <CrmCell className="max-w-80 border-t border-border text-muted-foreground">
                  <span className="line-clamp-2">{match.reason}</span>
                  <span className="mt-1 block font-mono text-[10px]">{match.id}</span>
                </CrmCell>
                <CrmCell className="whitespace-nowrap border-t border-border text-xs text-muted-foreground">
                  {formatDateTime(match.created_at)}
                </CrmCell>
                <CrmCell className="border-t border-border">
                  <div className="flex justify-end gap-2">
                    <MatchButton matchId={match.id} status="confirmed" label="Confirmar" icon={Check} disabled={match.status === "confirmed"} />
                    <MatchButton matchId={match.id} status="rejected" label="Rechazar" icon={ShieldX} disabled={match.status === "rejected"} />
                    <MatchButton matchId={match.id} status="expired" label="Expirar" icon={TimerOff} disabled={match.status === "expired"} />
                  </div>
                </CrmCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </CrmTableShell>
  );
}

function ReportSummary({ title, type, location }: { title: string; type: string; location: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GitCompareArrows className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{location}</p>
        </div>
      </div>
      <div className="mt-2"><StatusBadge value={type} /></div>
    </div>
  );
}

function MatchButton({
  matchId,
  status,
  label,
  icon: Icon,
  disabled,
}: {
  matchId: string;
  status: "confirmed" | "rejected" | "expired";
  label: string;
  icon: ComponentType<{ className?: string }>;
  disabled: boolean;
}) {
  return (
    <form action={updateMatchAction}>
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="status" value={status} />
      <Button
        type="submit"
        size="sm"
        variant={status === "confirmed" ? "outline" : "destructive"}
        disabled={disabled}
        className="w-full"
      >
        <Icon className="size-3.5" />
        {label}
      </Button>
    </form>
  );
}
