import type { Metadata } from "next";
import {
  Check,
  Clock3,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { updateClaimAction, updateMatchAction } from "@/app/dashboard/actions";
import {
  CatalogFilters,
  type CatalogFiltersState,
} from "@/app/dashboard/objetos-perdidos/_components/catalog-filters";
import { CatalogResults } from "@/app/dashboard/objetos-perdidos/_components/catalog-results";
import {
  compareText,
  paramValue,
  textMatches,
  type SearchParams,
  uniqueOptions,
} from "@/app/dashboard/objetos-perdidos/_components/lost-found-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getClaims, getLostItems, getMatches } from "@/lib/supabase/dashboard";
import { badgeClass, formatDateTime, formatLocation, statusLabel } from "@/lib/supabase/format";
import type { Claim, Match } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Objetos perdidos",
};

const catalogPageSize = 12;

export default async function ObjetosPerdidosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const [items, claims, matches] = await Promise.all([
    getLostItems(),
    getClaims(),
    getMatches(),
  ]);

  const query = paramValue(params, "q");
  const status = paramValue(params, "status", "all");
  const type = paramValue(params, "type", "all");
  const category = paramValue(params, "category", "all");
  const building = paramValue(params, "building", "all");
  const photo = paramValue(params, "photo", "all");
  const sort = paramValue(params, "sort", "recent");
  const requestedPage = positiveInteger(paramValue(params, "page"), 1);

  const filteredItems = items
    .filter((item) => {
      const report = item.reports;
      const matchesStatus = status === "all" || item.status === status;
      const matchesType = type === "all" || report?.type === type;
      const matchesCategory = category === "all" || item.item_category === category;
      const matchesBuilding = building === "all" || report?.campus_zones?.building === building;
      const matchesPhoto =
        photo === "all" ||
        (photo === "with" && Boolean(report?.photo_url)) ||
        (photo === "without" && !report?.photo_url);
      const matchesQuery = textMatches(query, [
        item.item_name,
        item.item_category,
        item.color,
        item.brand,
        item.distinguishing_marks,
        item.custody_location,
        item.report_id,
        item.status,
        statusLabel(item.status),
        report?.title,
        report?.description,
        report?.type,
        statusLabel(report?.type ?? "unknown"),
        formatLocation(report),
      ]);

      return matchesStatus && matchesType && matchesCategory && matchesBuilding && matchesPhoto && matchesQuery;
    })
    .sort((left, right) => {
      if (sort === "name") return compareText(left.item_name, right.item_name);
      if (sort === "category") return compareText(left.item_category, right.item_category);
      if (sort === "confidence") {
        return Number(right.reports?.ai_confidence ?? 0) - Number(left.reports?.ai_confidence ?? 0);
      }
      if (sort === "status") return compareText(left.status, right.status);
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / catalogPageSize));
  const activePage = Math.min(requestedPage, pageCount);
  const paginatedItems = filteredItems.slice(
    (activePage - 1) * catalogPageSize,
    activePage * catalogPageSize,
  );
  const filters: CatalogFiltersState = { query, status, type, category, building, photo, sort };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Catálogo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Administra objetos perdidos y encontrados con filtros de estado, evidencia y señales de coincidencia.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <section>
          <CatalogFilters
            filters={filters}
            statusOptions={uniqueOptions(items.map((item) => item.status))}
            typeOptions={uniqueOptions(items.map((item) => item.reports?.type))}
            categoryOptions={uniqueOptions(items.map((item) => item.item_category))}
            buildingOptions={uniqueOptions(items.map((item) => item.reports?.campus_zones?.building))}
          />
        </section>

        <CatalogResults
          key={[query, status, type, category, building, photo, sort, activePage].join("|")}
          items={paginatedItems}
          totalItems={filteredItems.length}
          page={activePage}
          pageCount={pageCount}
          pageSize={catalogPageSize}
          filters={filters}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ClaimsPanel claims={claims} />
        <MatchesPanel matches={matches} />
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const className = value === "approved" ? "bg-muted text-muted-foreground" : badgeClass(value);

  return (
    <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${className}`}>
      {statusLabel(value)}
    </span>
  );
}

function SignalMeter({ value }: { value: number }) {
  const percent = clampedPercent(value);

  return (
    <div className="min-w-32">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Confianza</span>
        <span className="font-medium tabular-nums text-foreground">{percent}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/80">
        <div className={`h-full rounded-full ${signalClass(percent)}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ClaimsPanel({ claims }: { claims: Claim[] }) {
  const pendingCount = countClaims(claims, ["pending"]);
  const approvedCount = countClaims(claims, ["approved"]);
  const closedCount = countClaims(claims, ["delivered", "rejected"]);
  const visibleClaims = [...claims].sort(sortClaimsByPriority).slice(0, 6);

  return (
    <Card className="gap-0 border-border py-0">
      <PanelHeader
        title="Bandeja de reclamos"
        description="Solicitudes recientes ordenadas por acción requerida."
        href="/dashboard/objetos-perdidos/entregas"
        count={claims.length}
        stats={[
          { label: "Pendientes", value: pendingCount, tone: "warning" },
          { label: "Aprobados", value: approvedCount },
          { label: "Cerrados", value: closedCount },
        ]}
      />
      <CardContent className="px-0 pt-0">
        {visibleClaims.length === 0 ? (
          <EmptyState
            icon={Clock3}
            title="No hay reclamos registrados"
            description="Las solicitudes nuevas aparecerán en esta bandeja."
          />
        ) : (
          <div className="divide-y divide-border border-t border-border">
            {visibleClaims.map((claim) => (
              <ClaimRow key={claim.id} claim={claim} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClaimRow({ claim }: { claim: Claim }) {
  const item = claim.lost_items;
  const requester = claim.claimant?.full_name || claim.claimant?.email || claim.claimed_by;
  const custody = item?.custody_location || formatLocation(item?.reports);

  return (
    <div className="px-4 py-3 transition hover:bg-muted/35">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {item?.item_name ?? "Objeto"}
            </p>
            <StatusBadge value={claim.status} />
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {claim.evidence || "Sin evidencia registrada."}
          </p>
        </div>
        {claim.status === "pending" && (
          <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700">
            Revisar
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="max-w-full truncate">{requester}</span>
        <span>{formatDateTime(claim.created_at)}</span>
        <span className="max-w-full truncate">{custody}</span>
      </div>

      {claim.status === "pending" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <ClaimButton claimId={claim.id} status="approved" label="Aprobar" icon="check" />
          <ClaimButton claimId={claim.id} status="rejected" label="Rechazar" icon="x" />
        </div>
      )}
    </div>
  );
}

function MatchesPanel({ matches }: { matches: Match[] }) {
  const activeMatches = matches.filter((match) => ["suggested", "notified"].includes(match.status));
  const hotMatches = [...activeMatches]
    .sort((left, right) => Number(right.score) - Number(left.score))
    .slice(0, 5);
  const highScoreCount = activeMatches.filter((match) => matchScorePercent(match) >= 75).length;
  const notifiedCount = activeMatches.filter((match) => match.status === "notified").length;

  return (
    <Card className="gap-0 border-border py-0">
      <PanelHeader
        title="Señales calientes"
        description="Coincidencias activas priorizadas por similitud."
        href="/dashboard/objetos-perdidos/matches"
        count={activeMatches.length}
        stats={[
          { label: "Activas", value: activeMatches.length, tone: "info" },
          { label: "75%+", value: highScoreCount, tone: "success" },
          { label: "Notificadas", value: notifiedCount },
        ]}
      />
      <CardContent className="px-0 pt-0">
        {hotMatches.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No hay coincidencias sugeridas"
            description="Los nuevos matches se mostrarán cuando exista suficiente señal."
          />
        ) : (
          <div className="divide-y divide-border border-t border-border">
            {hotMatches.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MatchRow({ match }: { match: Match }) {
  const score = matchScorePercent(match);

  return (
    <div className="px-4 py-3 transition hover:bg-muted/35">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {match.source?.title ?? "Reporte origen"}
            </p>
            <StatusBadge value={match.status} />
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            con {match.target?.title ?? "reporte destino"}
          </p>
        </div>
        <SignalMeter value={score} />
      </div>

      <div className="mt-3 grid gap-2 rounded-xl bg-muted/25 p-2 text-xs sm:grid-cols-2">
        <ReportSnippet
          label="Origen"
          type={match.source?.type ?? "unknown"}
          location={formatLocation(match.source)}
        />
        <ReportSnippet
          label="Destino"
          type={match.target?.type ?? "unknown"}
          location={formatLocation(match.target)}
        />
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{match.reason}</p>

      <form action={updateMatchAction} className="mt-3">
        <input type="hidden" name="match_id" value={match.id} />
        <input type="hidden" name="status" value="confirmed" />
        <Button type="submit" size="sm" variant="outline">
          <Check className="size-3.5" />
          Confirmar
        </Button>
      </form>
    </div>
  );
}

function ReportSnippet({
  label,
  type,
  location,
}: {
  label: string;
  type: string;
  location: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-background/70 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="truncate text-foreground">{statusLabel(type)}</span>
      </div>
      <p className="mt-1 truncate text-muted-foreground">{location}</p>
    </div>
  );
}

type PanelStat = {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success" | "info";
};

function PanelHeader({
  title,
  description,
  href,
  count,
  stats,
}: {
  title: string;
  description: string;
  href: string;
  count: number;
  stats: PanelStat[];
}) {
  return (
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base leading-snug font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          href={href}
          className="shrink-0 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          {count} registros
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {stats.map((stat) => (
          <span key={stat.label} className={`rounded-full px-2.5 py-1 text-xs font-medium ${statClass(stat.tone)}`}>
            {stat.label}: <span className="tabular-nums">{stat.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
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

function countClaims(claims: Claim[], statuses: string[]) {
  return claims.filter((claim) => statuses.includes(claim.status)).length;
}

function sortClaimsByPriority(left: Claim, right: Claim) {
  const rankDifference = claimRank(left.status) - claimRank(right.status);
  if (rankDifference !== 0) return rankDifference;
  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
}

function claimRank(status: string) {
  if (status === "pending") return 0;
  if (status === "approved") return 1;
  if (status === "delivered") return 2;
  if (status === "rejected") return 3;
  return 4;
}

function matchScorePercent(match: Match) {
  return clampedPercent(Number(match.score) * 100);
}

function clampedPercent(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(safeValue)));
}

function signalClass(percent: number) {
  if (percent >= 85) return "bg-emerald-500";
  if (percent >= 65) return "bg-primary";
  return "bg-amber-500";
}

function statClass(tone: PanelStat["tone"] = "default") {
  if (tone === "warning") return "bg-amber-500/10 text-amber-700";
  if (tone === "success") return "bg-emerald-500/10 text-emerald-700";
  if (tone === "info") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}

function positiveInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function ClaimButton({
  claimId,
  status,
  label,
  icon,
}: {
  claimId: string;
  status: "approved" | "rejected";
  label: string;
  icon: "check" | "x";
}) {
  const Icon = icon === "check" ? Check : X;
  return (
    <form action={updateClaimAction}>
      <input type="hidden" name="claim_id" value={claimId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={status === "approved" ? "outline" : "destructive"}>
        <Icon className="size-3.5" />
        {label}
      </Button>
    </form>
  );
}
