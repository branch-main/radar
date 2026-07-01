import type {
  Claim,
  DashboardData,
  LostItem,
  MaintenanceIncident,
  Match,
  Technician,
} from "@/lib/supabase/types";

import {
  buildActionQueue,
  buildActivity,
  orderBuckets,
  orderCategoryBuckets,
  orderStatusBuckets,
} from "./dashboard-builders";
import {
  clamp,
  incidentPriority,
  isDueSoon,
  isOverdue,
  percentage,
} from "./dashboard-calculations";
import {
  ACTION_MATCH_STATUSES,
  LOST_ITEM_OPEN_STATUSES,
  OPEN_REPORT_STATUSES,
  dashboardKpiIcons,
} from "./dashboard-constants";
import type { DashboardModel, MapPoint, TechnicianLoad } from "./types";

export function buildDashboardModel({
  dashboard,
  incidents,
  lostItems,
  claims,
  matches,
  technicians,
}: {
  dashboard: DashboardData;
  incidents: MaintenanceIncident[];
  lostItems: LostItem[];
  claims: Claim[];
  matches: Match[];
  technicians: Technician[];
}): DashboardModel {
  const now = new Date();
  const openIncidents = incidents.filter((incident) =>
    OPEN_REPORT_STATUSES.has(incident.reports?.status ?? "classified"),
  );
  const criticalIncidents = openIncidents.filter((incident) => incident.urgency === "critical");
  const unassignedIncidents = openIncidents.filter((incident) => !incident.assigned_to);
  const overdueIncidents = openIncidents.filter((incident) => isOverdue(incident.due_at, now));
  const dueSoonIncidents = openIncidents.filter((incident) => isDueSoon(incident.due_at, now));
  const activeItems = lostItems.filter((item) => LOST_ITEM_OPEN_STATUSES.has(item.status));
  const pendingClaims = claims.filter((claim) => claim.status === "pending");
  const approvedClaims = claims.filter((claim) => claim.status === "approved");
  const deliveredClaims = claims.filter((claim) => claim.status === "delivered");
  const actionMatches = matches.filter((match) => ACTION_MATCH_STATUSES.has(match.status));
  const confirmedMatches = matches.filter((match) => match.status === "confirmed");
  const activeTechnicians = technicians.filter((technician) => technician.active);
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const createdLast7Days = [...incidents, ...lostItems].filter(
    (item) => new Date(item.created_at).getTime() >= sevenDaysAgo,
  ).length;
  const closedLast7Days =
    incidents.filter(
      (incident) => incident.completed_at && new Date(incident.completed_at).getTime() >= sevenDaysAgo,
    ).length +
    lostItems.filter(
      (item) => item.delivered_at && new Date(item.delivered_at).getTime() >= sevenDaysAgo,
    ).length;
  const openDates = [
    ...openIncidents.map((incident) => incident.created_at),
    ...activeItems.map((item) => item.created_at),
    ...pendingClaims.map((claim) => claim.created_at),
    ...actionMatches.map((match) => match.created_at),
  ];
  const oldestOpenDays = openDates.length
    ? Math.max(
        ...openDates.map((date) =>
          Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / (24 * 60 * 60 * 1000))),
        ),
      )
    : 0;

  const resolved = dashboard.reports_by_status.resolved ?? 0;
  const closed = dashboard.reports_by_status.closed ?? 0;
  const resolutionRate = percentage(resolved + closed, dashboard.totals.reports);
  const catalogResolutionRate = percentage(deliveredClaims.length, claims.length);
  const matchConfirmationRate = percentage(confirmedMatches.length, matches.length);
  const openWorkload = openIncidents.length + activeItems.length + pendingClaims.length + actionMatches.length;
  const riskCount = overdueIncidents.length + criticalIncidents.length + pendingClaims.length;
  const healthScore = clamp(
    100 -
      overdueIncidents.length * 14 -
      criticalIncidents.length * 10 -
      unassignedIncidents.length * 4 -
      pendingClaims.length * 5 -
      actionMatches.length * 2,
    0,
    100,
  );

  const actionQueue = buildActionQueue({
    overdueIncidents,
    criticalIncidents,
    unassignedIncidents,
    pendingClaims,
    approvedClaims,
    actionMatches,
  });

  const crmIncidents = [...incidents]
    .sort((left, right) => {
      const priorityDifference = incidentPriority(right, now) - incidentPriority(left, now);
      if (priorityDifference !== 0) return priorityDifference;
      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });

  const crmLostItems = [...lostItems]
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime());

  const priorityIncidents = [...openIncidents]
    .sort((left, right) => incidentPriority(right, now) - incidentPriority(left, now))
    .slice(0, 4);

  const technicianLoads: TechnicianLoad[] = activeTechnicians
    .map((technician) => {
      const assigned = openIncidents.filter((incident) => incident.assigned_to === technician.id);
      const critical = assigned.filter((incident) => ["critical", "high"].includes(incident.urgency));
      return { technician, assigned: assigned.length, critical: critical.length };
    })
    .sort((left, right) => right.assigned - left.assigned || right.critical - left.critical)
    .slice(0, 4);

  const buildingHotspots = Object.entries(dashboard.reports_by_building)
    .map(([building, count]) => ({ building, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const mapPoints = buildMapPoints(openIncidents, activeItems).slice(0, 12);

  const nextDueIncident = [...openIncidents]
    .filter((incident) => incident.due_at)
    .sort((left, right) => new Date(left.due_at ?? 0).getTime() - new Date(right.due_at ?? 0).getTime())[0];

  return {
    now,
    totals: {
      reports: dashboard.totals.reports,
      openIncidents: openIncidents.length,
      activeItems: activeItems.length,
      activeTechnicians: activeTechnicians.length,
      openWorkload,
      riskCount,
      overdueIncidents: overdueIncidents.length,
      dueSoonIncidents: dueSoonIncidents.length,
      criticalIncidents: criticalIncidents.length,
      unassignedIncidents: unassignedIncidents.length,
      pendingClaims: pendingClaims.length,
      approvedClaims: approvedClaims.length,
      actionMatches: actionMatches.length,
      createdLast7Days,
      closedLast7Days,
      oldestOpenDays,
      healthScore,
      resolutionRate,
      catalogResolutionRate,
      matchConfirmationRate,
    },
    actionQueue,
    kpis: [
      {
        label: "Trabajo abierto",
        value: openWorkload,
        detail: `${openIncidents.length} incidencias, ${activeItems.length} objetos, ${oldestOpenDays} días máx. en cola`,
        href: "/dashboard/mantenimiento/incidencias",
        icon: dashboardKpiIcons.workload,
        severity: riskCount > 0 ? "warning" : "success",
      },
      {
        label: "SLA crítico",
        value: overdueIncidents.length + dueSoonIncidents.length,
        detail: `${overdueIncidents.length} vencidas, ${dueSoonIncidents.length} por vencer, ${unassignedIncidents.length} sin técnico`,
        href: "/dashboard/mantenimiento/incidencias",
        icon: dashboardKpiIcons.timer,
        severity: overdueIncidents.length > 0 ? "critical" : dueSoonIncidents.length > 0 ? "warning" : "success",
      },
      {
        label: "Validaciones",
        value: pendingClaims.length + actionMatches.length,
        detail: `${pendingClaims.length} reclamos y ${actionMatches.length} matches por decidir`,
        href: "/dashboard/objetos-perdidos/catalogo",
        icon: dashboardKpiIcons.claims,
        severity: pendingClaims.length > 0 ? "warning" : "success",
      },
      {
        label: "Resolución global",
        value: resolutionRate,
        suffix: "%",
        detail: `${resolved + closed} de ${dashboard.totals.reports} reportes cerrados`,
        href: "/dashboard/mantenimiento/incidencias",
        icon: dashboardKpiIcons.resolution,
        severity: resolutionRate >= 70 ? "success" : resolutionRate >= 40 ? "info" : "neutral",
      },
    ],
    priorityIncidents,
    crmIncidents,
    crmLostItems,
    technicianLoads,
    buildingHotspots,
    mapPoints,
    activity: buildActivity(incidents, lostItems, claims, matches).slice(0, 5),
    maintenanceByUrgency: orderBuckets(dashboard.maintenance_by_urgency, ["critical", "high", "medium", "low"]),
    maintenanceByCategory: orderCategoryBuckets(dashboard.maintenance_by_category),
    reportStatusBuckets: orderStatusBuckets(dashboard.reports_by_status).slice(0, 5),
    lostFoundPipeline: [
      { label: "Catálogo activo", value: activeItems.length, href: "/dashboard/objetos-perdidos/catalogo", icon: dashboardKpiIcons.package },
      { label: "Reclamos pendientes", value: pendingClaims.length, href: "/dashboard/objetos-perdidos/catalogo", icon: dashboardKpiIcons.pendingClaim },
      { label: "Listos para entrega", value: approvedClaims.length, href: "/dashboard/objetos-perdidos/entregas", icon: dashboardKpiIcons.ready },
      { label: "Entregados", value: deliveredClaims.length, href: "/dashboard/objetos-perdidos/entregas", icon: dashboardKpiIcons.delivered },
    ],
    nextDueIncident,
    topBuilding: buildingHotspots[0],
    actionMatchesCount: actionMatches.length,
  };
}

function buildMapPoints(incidents: MaintenanceIncident[], items: LostItem[]): MapPoint[] {
  return [
    ...incidents.map((incident, index) => {
      const report = incident.reports;
      const position = mapPosition(report, index);
      return {
        id: `incident-${incident.report_id}`,
        type: "incident" as const,
        title: report?.title ?? "Incidencia sin título",
        detail: report?.campus_zones ? `${report.campus_zones.building} · ${report.campus_zones.name}` : incident.category,
        status: incident.urgency,
        href: "/dashboard/mantenimiento/incidencias",
        x: position.x,
        y: position.y,
        building: report?.campus_zones?.building ?? "Sin edificio",
      };
    }),
    ...items.map((item, index) => {
      const report = item.reports;
      const position = mapPosition(report, incidents.length + index);
      return {
        id: `item-${item.report_id}`,
        type: "item" as const,
        title: item.item_name || report?.title || "Objeto sin nombre",
        detail: report?.campus_zones ? `${report.campus_zones.building} · ${report.campus_zones.name}` : item.item_category,
        status: item.status,
        href: "/dashboard/objetos-perdidos/catalogo",
        x: position.x,
        y: position.y,
        building: report?.campus_zones?.building ?? item.custody_location ?? "Sin edificio",
      };
    }),
  ];
}

function mapPosition(report: MaintenanceIncident["reports"], index: number) {
  const latitude = report?.latitude ?? report?.campus_zones?.latitude;
  const longitude = report?.longitude ?? report?.campus_zones?.longitude;

  if (typeof latitude === "number" && typeof longitude === "number") {
    return {
      x: clamp(longitude, 4, 96),
      y: clamp(100 - latitude, 6, 94),
    };
  }

  const slot = index % fallbackPositions.length;
  const row = Math.floor(index / fallbackPositions.length);
  const fallback = fallbackPositions[slot];
  return {
    x: clamp(fallback.x + row * 3, 4, 96),
    y: clamp(fallback.y + row * 2, 6, 94),
  };
}

const fallbackPositions = [
  { x: 18, y: 28 },
  { x: 36, y: 18 },
  { x: 58, y: 30 },
  { x: 76, y: 22 },
  { x: 25, y: 54 },
  { x: 47, y: 48 },
  { x: 68, y: 58 },
  { x: 84, y: 72 },
  { x: 36, y: 78 },
  { x: 56, y: 82 },
];
