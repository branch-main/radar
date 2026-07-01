export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatLocation(report?: {
  campus_zones?: { building: string; name: string; floor: string | null } | null;
  latitude?: number | null;
  longitude?: number | null;
} | null) {
  if (!report) return "Sin ubicación";
  if (report.campus_zones) {
    return [
      report.campus_zones.building,
      report.campus_zones.name,
      report.campus_zones.floor,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (report.latitude && report.longitude) {
    return `${report.latitude}, ${report.longitude}`;
  }
  return "Sin ubicación";
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: "Nuevo",
    classified: "Clasificado",
    assigned: "Asignado",
    in_progress: "En progreso",
    waiting_claim: "Esperando reclamo",
    resolved: "Resuelto",
    closed: "Cerrado",
    cancelled: "Cancelado",
    unclaimed: "Sin reclamar",
    claim_pending: "Reclamo pendiente",
    claimed: "Reclamado",
    delivered: "Entregado",
    archived: "Archivado",
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
    suggested: "Sugerido",
    confirmed: "Confirmado",
    notified: "Notificado",
    expired: "Expirado",
    maintenance: "Mantenimiento",
    lost_item: "Objeto perdido",
    found_item: "Objeto encontrado",
    unknown: "Sin clasificar",
    low: "Baja",
    medium: "Media",
    high: "Alta",
    critical: "Crítica",
  };
  return labels[status] ?? status;
}

export function badgeClass(status: string) {
  if (["critical", "high", "new", "classified", "pending", "suggested"].includes(status)) {
    return "bg-amber-500/10 text-amber-700";
  }
  if (["in_progress", "assigned", "waiting_claim", "claim_pending", "claimed"].includes(status)) {
    return "bg-blue-500/10 text-blue-700";
  }
  if (["resolved", "closed", "approved", "delivered", "confirmed"].includes(status)) {
    return "bg-emerald-500/10 text-emerald-700";
  }
  if (["cancelled", "rejected", "expired"].includes(status)) {
    return "bg-destructive/10 text-destructive";
  }
  return "bg-muted text-muted-foreground";
}
