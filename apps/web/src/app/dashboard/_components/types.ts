import type { ComponentType } from "react";

import type {
  LostItem,
  MaintenanceIncident,
  Technician,
} from "@/lib/supabase/types";

export type Severity = "critical" | "warning" | "info" | "success" | "neutral";

export type QueueItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  severity: Severity;
  icon: ComponentType<{ className?: string }>;
};

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  date: string;
  status: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export type DashboardKpi = {
  label: string;
  value: number;
  suffix?: string;
  detail: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  severity: Severity;
};

export type PipelineItem = {
  label: string;
  value: number;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export type Bucket = {
  label: string;
  value: number;
};

export type TechnicianLoad = {
  technician: Technician;
  assigned: number;
  critical: number;
};

export type Hotspot = {
  building: string;
  count: number;
};

export type MapPoint = {
  id: string;
  type: "incident" | "item";
  title: string;
  detail: string;
  status: string;
  href: string;
  x: number;
  y: number;
  building: string;
};

export type DashboardModel = {
  now: Date;
  totals: {
    reports: number;
    openIncidents: number;
    activeItems: number;
    activeTechnicians: number;
    openWorkload: number;
    riskCount: number;
    healthScore: number;
    resolutionRate: number;
    catalogResolutionRate: number;
    matchConfirmationRate: number;
  };
  actionQueue: QueueItem[];
  kpis: DashboardKpi[];
  priorityIncidents: MaintenanceIncident[];
  crmIncidents: MaintenanceIncident[];
  crmLostItems: LostItem[];
  technicianLoads: TechnicianLoad[];
  buildingHotspots: Hotspot[];
  mapPoints: MapPoint[];
  activity: ActivityItem[];
  maintenanceByUrgency: Bucket[];
  maintenanceByCategory: Bucket[];
  reportStatusBuckets: Bucket[];
  lostFoundPipeline: PipelineItem[];
  nextDueIncident?: MaintenanceIncident;
  topBuilding?: Hotspot;
  actionMatchesCount: number;
};
