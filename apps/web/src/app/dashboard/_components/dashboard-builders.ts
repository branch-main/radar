import {
  AlertTriangle,
  GitCompareArrows,
  Package,
  PackageCheck,
  ShieldCheck,
  Timer,
  UserCog,
} from "lucide-react";

import { formatLocation, statusLabel } from "@/lib/supabase/format";
import type {
  Claim,
  LostItem,
  MaintenanceIncident,
  Match,
} from "@/lib/supabase/types";

import type { ActivityItem, Bucket, QueueItem } from "./types";
import { categoryLabels } from "./dashboard-constants";

export function buildActionQueue({
  overdueIncidents,
  criticalIncidents,
  unassignedIncidents,
  pendingClaims,
  approvedClaims,
  actionMatches,
}: {
  overdueIncidents: MaintenanceIncident[];
  criticalIncidents: MaintenanceIncident[];
  unassignedIncidents: MaintenanceIncident[];
  pendingClaims: Claim[];
  approvedClaims: Claim[];
  actionMatches: Match[];
}): QueueItem[] {
  const queue: QueueItem[] = [];

  if (overdueIncidents.length > 0) {
    queue.push({
      id: "overdue-incidents",
      title: `${overdueIncidents.length} incidencias vencidas`,
      detail: "Requieren revisión de SLA y responsable",
      href: "/dashboard/mantenimiento/incidencias",
      severity: "critical",
      icon: Timer,
    });
  }

  if (criticalIncidents.length > 0) {
    queue.push({
      id: "critical-incidents",
      title: `${criticalIncidents.length} incidencias críticas`,
      detail: "Riesgo alto para operación del campus",
      href: "/dashboard/mantenimiento/incidencias",
      severity: "critical",
      icon: AlertTriangle,
    });
  }

  if (unassignedIncidents.length > 0) {
    queue.push({
      id: "unassigned-incidents",
      title: `${unassignedIncidents.length} incidencias sin técnico`,
      detail: "Asignación pendiente del equipo",
      href: "/dashboard/mantenimiento/incidencias",
      severity: "warning",
      icon: UserCog,
    });
  }

  if (pendingClaims.length > 0) {
    queue.push({
      id: "pending-claims",
      title: `${pendingClaims.length} reclamos por revisar`,
      detail: "Validar evidencia y aprobar o rechazar",
      href: "/dashboard/objetos-perdidos/catalogo",
      severity: "warning",
      icon: ShieldCheck,
    });
  }

  if (approvedClaims.length > 0) {
    queue.push({
      id: "approved-claims",
      title: `${approvedClaims.length} objetos listos para entrega`,
      detail: "Coordinar cierre con el solicitante",
      href: "/dashboard/objetos-perdidos/entregas",
      severity: "info",
      icon: PackageCheck,
    });
  }

  if (actionMatches.length > 0) {
    queue.push({
      id: "action-matches",
      title: `${actionMatches.length} matches sugeridos`,
      detail: "Confirmar o descartar coincidencias",
      href: "/dashboard/objetos-perdidos/matches",
      severity: "info",
      icon: GitCompareArrows,
    });
  }

  return queue;
}

export function buildActivity(
  incidents: MaintenanceIncident[],
  lostItems: LostItem[],
  claims: Claim[],
  matches: Match[],
): ActivityItem[] {
  return [
    ...incidents.map((incident) => ({
      id: `incident-${incident.report_id}`,
      title: incident.reports?.title ?? "Incidencia",
      detail: `${formatLocation(incident.reports)} · ${categoryLabels[incident.category] ?? incident.category}`,
      date: incident.created_at,
      status: incident.reports?.status ?? "classified",
      href: "/dashboard/mantenimiento/incidencias",
      icon: AlertTriangle,
    })),
    ...lostItems.map((item) => ({
      id: `item-${item.report_id}`,
      title: item.item_name,
      detail: `${statusLabel(item.reports?.type ?? "unknown")} · ${formatLocation(item.reports)}`,
      date: item.created_at,
      status: item.status,
      href: "/dashboard/objetos-perdidos/catalogo",
      icon: Package,
    })),
    ...claims.map((claim) => ({
      id: `claim-${claim.id}`,
      title: claim.lost_items?.item_name ?? "Reclamo de objeto",
      detail: claim.claimant?.email ?? claim.claimed_by,
      date: claim.created_at,
      status: claim.status,
      href: claim.status === "approved" ? "/dashboard/objetos-perdidos/entregas" : "/dashboard/objetos-perdidos/catalogo",
      icon: ShieldCheck,
    })),
    ...matches.map((match) => ({
      id: `match-${match.id}`,
      title: match.source?.title ?? "Coincidencia sugerida",
      detail: `${Math.round(Number(match.score) * 100)}% con ${match.target?.title ?? "reporte destino"}`,
      date: match.created_at,
      status: match.status,
      href: "/dashboard/objetos-perdidos/matches",
      icon: GitCompareArrows,
    })),
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

export function orderBuckets(values: Record<string, number>, order: string[]): Bucket[] {
  const known = order.map((label) => ({ label, value: values[label] ?? 0 }));
  const rest = Object.entries(values)
    .filter(([label]) => !order.includes(label))
    .map(([label, value]) => ({ label, value }));
  return [...known, ...rest].filter((item) => item.value > 0);
}

export function orderCategoryBuckets(values: Record<string, number>): Bucket[] {
  return Object.entries(values)
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}

export function orderStatusBuckets(values: Record<string, number>): Bucket[] {
  return Object.entries(values)
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);
}
