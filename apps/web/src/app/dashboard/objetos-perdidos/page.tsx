import type { Metadata } from "next";
import {
  Check,
  Clock3,
  ImageIcon,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";

import { updateClaimAction, updateMatchAction } from "@/app/dashboard/actions";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClaims, getLostItems, getMatches } from "@/lib/supabase/dashboard";
import { formatDateTime, formatLocation, statusLabel } from "@/lib/supabase/format";
import type { Claim, LostItem, Match } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Objetos perdidos",
};

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

  const activeItems = items.filter((item) => ["unclaimed", "claim_pending"].includes(item.status));
  const pendingClaims = claims.filter((claim) => claim.status === "pending");
  const suggestedMatches = matches.filter((match) => ["suggested", "notified"].includes(match.status));
  const photographedItems = items.filter((item) => Boolean(item.reports?.photo_url));

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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHero
        eyebrow="Objetos perdidos"
        title="Catálogo operativo"
        description="Explora reportes, reclamos y señales de coincidencia con filtros rápidos para encontrar el objeto correcto sin perder contexto."
        icon={Package}
        activePath="/dashboard/objetos-perdidos"
        stats={[
          { label: "Activos", value: activeItems.length },
          { label: "Reclamos", value: pendingClaims.length },
          { label: "Matches", value: suggestedMatches.length },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="En catálogo" value={items.length} icon={Package} />
        <MetricCard label="Con foto" value={photographedItems.length} icon={ImageIcon} tone="slate" />
        <MetricCard label="Reclamos pendientes" value={pendingClaims.length} icon={ShieldCheck} tone="amber" />
        <MetricCard label="Matches sugeridos" value={suggestedMatches.length} icon={Search} tone="emerald" />
      </div>

      <FilterPanel
        action="/dashboard/objetos-perdidos"
        query={query}
        placeholder="Buscar por objeto, marca, color, custodia, edificio o ID"
        resultLabel={`${filteredItems.length} de ${items.length} objetos`}
      >
        <SelectFilter label="Estado" name="status" value={status} options={uniqueOptions(items.map((item) => item.status))} />
        <SelectFilter label="Tipo de reporte" name="type" value={type} options={uniqueOptions(items.map((item) => item.reports?.type))} />
        <SelectFilter label="Categoría" name="category" value={category} options={uniqueOptions(items.map((item) => item.item_category))} />
        <SelectFilter label="Edificio" name="building" value={building} options={uniqueOptions(items.map((item) => item.reports?.campus_zones?.building))} />
        <SelectFilter
          label="Evidencia visual"
          name="photo"
          value={photo}
          options={[
            { value: "with", label: "Con foto" },
            { value: "without", label: "Sin foto" },
          ]}
        />
        <SelectFilter
          label="Ordenar"
          name="sort"
          value={sort}
          allLabel="Recientes"
          options={[
            { value: "recent", label: "Más recientes" },
            { value: "confidence", label: "Mayor confianza IA" },
            { value: "name", label: "Nombre A a Z" },
            { value: "category", label: "Categoría" },
            { value: "status", label: "Estado" },
          ]}
        />
      </FilterPanel>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="No encontramos objetos con esos filtros"
          description="Prueba ampliar el estado, eliminar el edificio o buscar por una palabra clave más corta."
        />
      ) : (
        <CatalogTable items={filteredItems} />
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <ClaimsPanel claims={claims} />
        <MatchesPanel matches={matches} />
      </div>
    </div>
  );
}

function CatalogTable({ items }: { items: LostItem[] }) {
  return (
    <CrmTableShell
      title="Objetos rastreados"
      description="Catálogo filtrable con columnas compactas para operación tipo CRM."
      count={items.length}
    >
      <table className="min-w-[1120px] w-full border-separate border-spacing-0">
        <thead className="bg-muted/30">
          <tr>
            <CrmHeaderCell>Objeto</CrmHeaderCell>
            <CrmHeaderCell>Estado</CrmHeaderCell>
            <CrmHeaderCell>Tipo</CrmHeaderCell>
            <CrmHeaderCell>Categoría</CrmHeaderCell>
            <CrmHeaderCell>Ubicación</CrmHeaderCell>
            <CrmHeaderCell>Custodia</CrmHeaderCell>
            <CrmHeaderCell>Señales</CrmHeaderCell>
            <CrmHeaderCell>Registro</CrmHeaderCell>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const report = item.reports;
            const confidence = Math.round(Number(report?.ai_confidence ?? 0) * 100);

            return (
              <tr key={item.report_id} className="group border-b border-border transition hover:bg-muted/25">
                <CrmCell className="min-w-72 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                      {report?.photo_url ? (
                        <Image src={report.photo_url} alt={item.item_name} fill sizes="48px" className="object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <Package className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{item.item_name}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{report?.description ?? item.distinguishing_marks ?? "Sin descripción"}</p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">{item.report_id}</p>
                    </div>
                  </div>
                </CrmCell>
                <CrmCell className="border-t border-border"><StatusBadge value={item.status} /></CrmCell>
                <CrmCell className="border-t border-border"><StatusBadge value={report?.type ?? "unknown"} /></CrmCell>
                <CrmCell className="border-t border-border">
                  <div className="font-medium">{item.item_category}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.color ?? "Sin color"} · {item.brand ?? "Sin marca"}</div>
                </CrmCell>
                <CrmCell className="max-w-64 border-t border-border text-muted-foreground">
                  <span className="line-clamp-2">{formatLocation(report)}</span>
                </CrmCell>
                <CrmCell className="max-w-48 border-t border-border text-muted-foreground">
                  <span className="line-clamp-2">{item.custody_location ?? "Sin custodia"}</span>
                </CrmCell>
                <CrmCell className="w-44 border-t border-border">
                  <ProgressBar value={confidence} />
                </CrmCell>
                <CrmCell className="whitespace-nowrap border-t border-border text-xs text-muted-foreground">
                  {formatDateTime(item.created_at)}
                </CrmCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </CrmTableShell>
  );
}

function ClaimsPanel({ claims }: { claims: Claim[] }) {
  const visibleClaims = claims.slice(0, 6);

  return (
    <Card className="border-[#e7f0f2] bg-white/90 py-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock3 className="size-4 text-primary" />
          Bandeja de reclamos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleClaims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay reclamos registrados.</p>
        ) : (
          visibleClaims.map((claim) => (
            <div key={claim.id} className="rounded-2xl border border-border bg-background/55 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{claim.lost_items?.item_name ?? "Objeto"}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{claim.evidence}</p>
                </div>
                <StatusBadge value={claim.status} />
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {claim.claimant?.email ?? claim.claimed_by} · {formatDateTime(claim.created_at)}
              </p>
              {claim.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <ClaimButton claimId={claim.id} status="approved" label="Aprobar" icon="check" />
                  <ClaimButton claimId={claim.id} status="rejected" label="Rechazar" icon="x" />
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function MatchesPanel({ matches }: { matches: Match[] }) {
  const hotMatches = matches
    .filter((match) => ["suggested", "notified"].includes(match.status))
    .sort((left, right) => Number(right.score) - Number(left.score))
    .slice(0, 5);

  return (
    <Card className="border-[#e7f0f2] bg-white/90 py-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Señales calientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hotMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay coincidencias sugeridas.</p>
        ) : (
          hotMatches.map((match) => (
            <div key={match.id} className="rounded-2xl border border-border bg-background/55 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{match.source?.title ?? "Reporte origen"}</p>
                  <p className="truncate text-xs text-muted-foreground">con {match.target?.title ?? "reporte destino"}</p>
                </div>
                <StatusBadge value={match.status} />
              </div>
              <div className="mt-3">
                <ProgressBar value={Number(match.score) * 100} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{match.reason}</p>
              <form action={updateMatchAction} className="mt-3">
                <input type="hidden" name="match_id" value={match.id} />
                <input type="hidden" name="status" value="confirmed" />
                <Button type="submit" size="sm" variant="outline">
                  <Check className="size-3.5" />
                  Confirmar
                </Button>
              </form>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
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

