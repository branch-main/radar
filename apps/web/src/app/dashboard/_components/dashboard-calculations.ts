import type { MaintenanceIncident } from "@/lib/supabase/types";

import type { Severity } from "./types";

export function incidentPriority(incident: MaintenanceIncident, now: Date) {
  let score = 0;
  if (isOverdue(incident.due_at, now)) score += 100;
  if (incident.urgency === "critical") score += 80;
  if (incident.urgency === "high") score += 50;
  if (!incident.assigned_to) score += 20;
  if (isDueSoon(incident.due_at, now)) score += 15;
  return score;
}

export function isOverdue(value: string | null, now: Date) {
  return Boolean(value && new Date(value).getTime() < now.getTime());
}

export function isDueSoon(value: string | null, now: Date) {
  if (!value) return false;
  const dueAt = new Date(value).getTime();
  const diff = dueAt - now.getTime();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

export function dueLabel(value: string | null, now: Date) {
  if (!value) return "Sin SLA";
  if (isOverdue(value, now)) return "Vencida";
  if (isDueSoon(value, now)) return "Por vencer";
  return "En plazo";
}

export function dueBadgeClass(value: string | null, now: Date) {
  if (!value) return "bg-muted text-muted-foreground";
  if (isOverdue(value, now)) return "bg-destructive/10 text-destructive";
  if (isDueSoon(value, now)) return "bg-amber-500/10 text-amber-700";
  return "bg-emerald-500/10 text-emerald-700";
}

export function relativeTime(value: string, now: Date) {
  const diff = new Date(value).getTime() - now.getTime();
  const minutes = Math.round(diff / 60_000);
  const formatter = new Intl.RelativeTimeFormat("es-PE", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

export function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function maxValue(values: number[]) {
  return Math.max(1, ...values);
}

export function barWidth(value: number, max: number) {
  return clamp(Math.round((value / max) * 100), value > 0 ? 8 : 0, 100);
}

export function healthScoreLabel(score: number) {
  if (score >= 85) return "Operación estable";
  if (score >= 65) return "Atención moderada";
  if (score >= 40) return "Riesgo operativo";
  return "Intervención urgente";
}

export function healthScoreTone(score: number) {
  if (score >= 85) return "text-emerald-700";
  if (score >= 65) return "text-primary";
  if (score >= 40) return "text-amber-700";
  return "text-red-700";
}

export function softIconClass(severity: Severity) {
  const classes: Record<Severity, string> = {
    critical: "bg-destructive/10 text-destructive",
    warning: "bg-amber-500/10 text-amber-700",
    info: "bg-blue-500/10 text-blue-700",
    success: "bg-emerald-500/10 text-emerald-700",
    neutral: "bg-muted text-muted-foreground",
  };
  return classes[severity];
}

export function urgencyDotClass(urgency: string) {
  if (urgency === "critical") return "bg-red-500";
  if (urgency === "high") return "bg-amber-500";
  if (urgency === "medium") return "bg-blue-500";
  return "bg-muted-foreground/40";
}

export function barToneClass(tone?: string) {
  if (tone === "critical") return "bg-red-500";
  if (tone === "high") return "bg-amber-500";
  if (tone === "medium") return "bg-blue-500";
  if (tone === "low") return "bg-emerald-500";
  return "bg-primary";
}
