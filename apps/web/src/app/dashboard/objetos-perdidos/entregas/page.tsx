import type { Metadata } from "next";
import {
  Archive,
  CheckCircle2,
  Clock,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

import { updateClaimAction } from "@/app/dashboard/actions";
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
  SearchParams,
  SelectFilter,
  StatusBadge,
  textMatches,
  uniqueOptions,
} from "@/app/dashboard/objetos-perdidos/_components/lost-found-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClaims } from "@/lib/supabase/dashboard";
import { formatDateTime, formatLocation, statusLabel } from "@/lib/supabase/format";
import type { Claim } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Entregas",
};

export default async function EntregasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const claims = await getClaims();

  const query = paramValue(params, "q");
  const status = paramValue(params, "status", "all");
  const category = paramValue(params, "category", "all");
  const custody = paramValue(params, "custody", "all");
  const sort = paramValue(params, "sort", "ready");

  const readyClaims = claims.filter((claim) => claim.status === "approved");
  const deliveredClaims = claims.filter((claim) => claim.status === "delivered");
  const pendingClaims = claims.filter((claim) => claim.status === "pending");
  const archivedClaims = claims.filter((claim) => ["rejected", "delivered"].includes(claim.status));

  const filteredClaims = claims
    .filter((claim) => {
      const item = claim.lost_items;
      const report = item?.reports;
      const matchesStatus = status === "all" || claim.status === status;
      const matchesCategory = category === "all" || item?.item_category === category;
      const matchesCustody = custody === "all" || item?.custody_location === custody;
      const matchesQuery = textMatches(query, [
        claim.id,
        claim.status,
        statusLabel(claim.status),
        claim.evidence,
        claim.review_notes,
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
    .sort((left, right) => {
      if (sort === "requester") {
        return compareText(left.claimant?.email ?? left.claimed_by, right.claimant?.email ?? right.claimed_by);
      }
      if (sort === "item") return compareText(left.lost_items?.item_name, right.lost_items?.item_name);
      if (sort === "recent") return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      if (sort === "status") return compareText(left.status, right.status);
      return deliveryPriority(left) - deliveryPriority(right);
    });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHero
        eyebrow="Mesa de entregas"
        title="Entrega sin fricción"
        description="Controla reclamos aprobados, valida solicitantes y deja una trazabilidad clara de cada objeto desde custodia hasta entrega final."
        icon={PackageCheck}
        activePath="/dashboard/objetos-perdidos/entregas"
        stats={[
          { label: "Listos", value: readyClaims.length },
          { label: "Entregados", value: deliveredClaims.length },
          { label: "Pendientes", value: pendingClaims.length },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Listos para entregar" value={readyClaims.length} icon={PackageCheck} tone="amber" />
        <MetricCard label="Entregados" value={deliveredClaims.length} icon={CheckCircle2} tone="emerald" />
        <MetricCard label="Reclamos pendientes" value={pendingClaims.length} icon={Clock} tone="slate" />
        <MetricCard label="Archivados" value={archivedClaims.length} icon={Archive} />
      </div>

      <FilterPanel
        action="/dashboard/objetos-perdidos/entregas"
        query={query}
        placeholder="Buscar por solicitante, objeto, custodia, evidencia o ID"
        resultLabel={`${filteredClaims.length} de ${claims.length} reclamos`}
      >
        <SelectFilter label="Estado de reclamo" name="status" value={status} options={uniqueOptions(claims.map((claim) => claim.status))} />
        <SelectFilter label="Categoría" name="category" value={category} options={uniqueOptions(claims.map((claim) => claim.lost_items?.item_category))} />
        <SelectFilter label="Punto de custodia" name="custody" value={custody} options={uniqueOptions(claims.map((claim) => claim.lost_items?.custody_location))} />
        <SelectFilter
          label="Ordenar"
          name="sort"
          value={sort}
          allLabel="Prioridad de entrega"
          options={[
            { value: "ready", label: "Prioridad de entrega" },
            { value: "recent", label: "Más recientes" },
            { value: "requester", label: "Solicitante A a Z" },
            { value: "item", label: "Objeto A a Z" },
            { value: "status", label: "Estado" },
          ]}
        />
      </FilterPanel>

      {filteredClaims.length === 0 ? (
        <EmptyState
          title="No hay entregas con esos filtros"
          description="Cambia el estado o busca por correo, custodia o nombre del objeto para ampliar la cola."
        />
      ) : (
        <DeliveryTable claims={filteredClaims} />
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <QuickQueue claims={readyClaims} />
        <RecentHistory claims={claims} />
      </div>
    </div>
  );
}

function DeliveryTable({ claims }: { claims: Claim[] }) {
  return (
    <CrmTableShell
      title="Cola de atención"
      description="Reclamos filtrados con formato CRM para validar, auditar y cerrar entregas."
      count={claims.length}
    >
      <table className="min-w-[1180px] w-full border-separate border-spacing-0">
        <thead className="bg-muted/30">
          <tr>
            <CrmHeaderCell>Objeto</CrmHeaderCell>
            <CrmHeaderCell>Solicitante</CrmHeaderCell>
            <CrmHeaderCell>Estado</CrmHeaderCell>
            <CrmHeaderCell>Custodia</CrmHeaderCell>
            <CrmHeaderCell>Evidencia</CrmHeaderCell>
            <CrmHeaderCell>Paso siguiente</CrmHeaderCell>
            <CrmHeaderCell>Fechas</CrmHeaderCell>
            <CrmHeaderCell className="text-right">Acción</CrmHeaderCell>
          </tr>
        </thead>
        <tbody>
          {claims.map((claim) => {
            const item = claim.lost_items;
            const report = item?.reports ?? null;
            const requester = claim.claimant?.email ?? claim.claimed_by;
            const isReady = claim.status === "approved";

            return (
              <tr key={claim.id} className="group transition hover:bg-muted/25">
                <CrmCell className="min-w-72 border-t border-border">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{item?.item_name ?? "Objeto"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item?.item_category ?? "Sin categoría"}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item?.color ?? "Sin color"} · {item?.brand ?? "Sin marca"}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">{claim.lost_item_id}</p>
                  </div>
                </CrmCell>
                <CrmCell className="min-w-56 border-t border-border">
                  <p className="truncate font-medium">{requester}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{formatLocation(report)}</p>
                </CrmCell>
                <CrmCell className="border-t border-border">
                  <div className="flex flex-col items-start gap-1.5">
                    <StatusBadge value={claim.status} />
                    <StatusBadge value={item?.status ?? "claimed"} />
                  </div>
                </CrmCell>
                <CrmCell className="max-w-52 border-t border-border text-muted-foreground">
                  <span className="line-clamp-2">{item?.custody_location ?? "Sin custodia"}</span>
                </CrmCell>
                <CrmCell className="max-w-80 border-t border-border text-muted-foreground">
                  <span className="line-clamp-2">{claim.evidence}</span>
                  <span className="mt-1 block text-xs">{claim.review_notes ?? "Sin notas"}</span>
                </CrmCell>
                <CrmCell className="min-w-52 border-t border-border">
                  <p className="text-sm font-medium text-foreground">
                    {isReady ? "Validar identidad y entregar" : nextStepLabel(claim.status)}
                  </p>
                </CrmCell>
                <CrmCell className="whitespace-nowrap border-t border-border text-xs text-muted-foreground">
                  <p>Solicitud {formatDateTime(claim.created_at)}</p>
                  <p className="mt-1">Actualizado {formatDateTime(claim.updated_at)}</p>
                </CrmCell>
                <CrmCell className="border-t border-border text-right">
                  {isReady ? <DeliveryButton claimId={claim.id} /> : <span className="text-xs text-muted-foreground">Sin acción</span>}
                </CrmCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </CrmTableShell>
  );
}

function QuickQueue({ claims }: { claims: Claim[] }) {
  return (
    <Card className="border-[#e7f0f2] bg-white/90 py-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-primary" />
          Próximas entregas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay objetos aprobados pendientes de entrega.</p>
        ) : (
          claims.slice(0, 5).map((claim, index) => (
            <div key={claim.id} className="flex gap-3 rounded-2xl border border-border bg-background/55 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{claim.lost_items?.item_name ?? "Objeto"}</p>
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

function RecentHistory({ claims }: { claims: Claim[] }) {
  return (
    <Card className="border-[#e7f0f2] bg-white/90 py-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-primary" />
          Historial reciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay reclamos registrados.</p>
        ) : (
          claims.slice(0, 8).map((claim) => (
            <div key={claim.id} className="rounded-2xl border border-border bg-background/55 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{claim.lost_items?.item_name ?? "Objeto"}</p>
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


function DeliveryButton({ claimId }: { claimId: string }) {
  return (
    <form action={updateClaimAction}>
      <input type="hidden" name="claim_id" value={claimId} />
      <input type="hidden" name="status" value="delivered" />
      <input type="hidden" name="review_notes" value="Entregado desde panel admin" />
      <Button type="submit" size="sm" className="w-full">
        <ShieldCheck className="size-3.5" />
        Marcar entregado
      </Button>
    </form>
  );
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

function nextStepLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Esperar revisión del reclamo",
    delivered: "Objeto ya entregado",
    rejected: "Reclamo rechazado",
  };
  return labels[status] ?? "Sin acción pendiente";
}
