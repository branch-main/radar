import {
  Bell,
  CheckCircle2,
  Package,
  PackageCheck,
  Radar,
  ShieldAlert,
  Timer,
} from "lucide-react";

export const OPEN_REPORT_STATUSES = new Set(["new", "classified", "assigned", "in_progress", "waiting_claim"]);
export const LOST_ITEM_OPEN_STATUSES = new Set(["unclaimed", "claim_pending"]);
export const ACTION_MATCH_STATUSES = new Set(["suggested", "notified"]);

export const categoryLabels: Record<string, string> = {
  electrical: "Eléctrico",
  plumbing: "Gasfitería",
  cleaning: "Limpieza",
  hvac: "Climatización",
  infrastructure: "Infraestructura",
  security: "Seguridad",
  other: "Otro",
};

export const dashboardKpiIcons = {
  workload: Radar,
  timer: Timer,
  claims: Bell,
  resolution: CheckCircle2,
  package: Package,
  pendingClaim: ShieldAlert,
  ready: PackageCheck,
  delivered: CheckCircle2,
};
