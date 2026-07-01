import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import type {
  AppNotification,
  CampusZone,
  Claim,
  DashboardData,
  LostItem,
  MaintenanceIncident,
  Match,
  Profile,
  ProfileSummary,
  Report,
  SystemSettings,
  Technician,
} from "./types";

const REPORT_SELECT = `
  id,
  created_by,
  type,
  status,
  title,
  description,
  photo_url,
  latitude,
  longitude,
  ai_confidence,
  classification_reason,
  created_at,
  updated_at,
  campus_zones(
    id,
    name,
    building,
    floor,
    area_type,
    latitude,
    longitude,
    created_at
  )
`;

const LOST_ITEM_SELECT = `
  report_id,
  item_name,
  item_category,
  color,
  brand,
  distinguishing_marks,
  status,
  custody_location,
  delivered_at,
  created_at,
  updated_at,
  reports(${REPORT_SELECT})
`;

const ADMIN_SETTINGS_KEY = "admin_panel";

const DEFAULT_SETTINGS: SystemSettings = {
  general: {
    institution_name: "Radar",
    campus_name: "Campus principal",
    timezone: "America/Lima",
    language: "es",
    support_email: "soporte@radar.local",
  },
  notifications: {
    email_enabled: true,
    push_enabled: true,
    daily_summary: false,
    notify_on_new_incident: true,
    notify_on_status_change: true,
    notify_on_new_object: true,
    notify_on_match: true,
  },
  maintenance: {
    auto_assign: false,
    default_sla_hours: 48,
    require_photos: true,
    escalation_enabled: false,
    escalation_hours: 24,
  },
  lost_found: {
    retention_days: 90,
    auto_archive: false,
    auto_archive_days: 30,
    require_photo: true,
    public_catalog: true,
    matching_notes: "",
  },
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [reportsResponse, incidentsResponse, lostItemsResponse, claimsResponse] =
    await Promise.all([
      supabase.from("reports").select(`type, status, campus_zones(building)`),
      supabase.from("maintenance_incidents").select("category, urgency, reports(status)"),
      supabase.from("lost_items").select("status"),
      supabase.from("claims").select("status"),
    ]);

  assertNoError(reportsResponse.error, "No se pudo cargar el resumen de reportes");
  assertNoError(incidentsResponse.error, "No se pudo cargar el resumen de mantenimiento");
  assertNoError(lostItemsResponse.error, "No se pudo cargar el resumen de objetos");
  assertNoError(claimsResponse.error, "No se pudo cargar el resumen de reclamos");

  const reports = rows<{
    type: string;
    status: string;
    campus_zones?: Relation<{ building: string | null }>;
  }>(reportsResponse.data);
  const incidents = rows<{
    category: string;
    urgency: string;
    reports?: Relation<{ status: string }>;
  }>(incidentsResponse.data);
  const lostItems = rows<{ status: string }>(lostItemsResponse.data);
  const claims = rows<{ status: string }>(claimsResponse.data);

  const reportsByStatus: Record<string, number> = {};
  const reportsByType: Record<string, number> = {};
  const reportsByBuilding: Record<string, number> = {};
  const maintenanceByUrgency: Record<string, number> = {};
  const maintenanceByCategory: Record<string, number> = {};

  for (const report of reports) {
    increment(reportsByStatus, report.status);
    increment(reportsByType, report.type);
    const zone = toOne(report.campus_zones);
    increment(reportsByBuilding, zone?.building || "Sin edificio");
  }

  for (const incident of incidents) {
    increment(maintenanceByUrgency, incident.urgency);
    increment(maintenanceByCategory, incident.category);
  }

  return {
    totals: {
      reports: reports.length,
      open_incidents: incidents.filter((incident) => {
        const report = toOne(incident.reports);
        return !["resolved", "closed", "cancelled"].includes(report?.status ?? "");
      }).length,
      unclaimed_items: lostItems.filter((item) =>
        ["unclaimed", "claim_pending"].includes(item.status),
      ).length,
      pending_claims: claims.filter((claim) => claim.status === "pending").length,
    },
    reports_by_status: reportsByStatus,
    reports_by_type: reportsByType,
    reports_by_building: reportsByBuilding,
    maintenance_by_urgency: maintenanceByUrgency,
    maintenance_by_category: maintenanceByCategory,
  };
}

export async function getMaintenanceIncidents(): Promise<MaintenanceIncident[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_incidents")
    .select(
      `
        report_id,
        category,
        urgency,
        assigned_to,
        due_at,
        completed_at,
        created_at,
        updated_at,
        reports(${REPORT_SELECT})
      `,
    )
    .order("created_at", { ascending: false });

  assertNoError(error, "No se pudieron cargar las incidencias");
  return rows<MaintenanceIncident>(data).map(normalizeMaintenanceIncident);
}

export async function getLostItems(): Promise<LostItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lost_items")
    .select(LOST_ITEM_SELECT)
    .order("created_at", { ascending: false });

  assertNoError(error, "No se pudieron cargar los objetos");
  return rows<LostItem>(data).map(normalizeLostItem);
}

export async function getClaims(): Promise<Claim[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("claims")
    .select(
      `
        id,
        lost_item_id,
        claimed_by,
        status,
        evidence,
        review_notes,
        created_at,
        updated_at,
        lost_items(${LOST_ITEM_SELECT}),
        claimant:profiles!claims_claimed_by_fkey(
          email,
          full_name
        )
      `,
    )
    .order("created_at", { ascending: false });

  assertNoError(error, "No se pudieron cargar los reclamos");
  return rows<Claim>(data).map(normalizeClaim);
}

export async function getMatches(): Promise<Match[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
        id,
        source_report_id,
        target_report_id,
        score,
        reason,
        status,
        created_at,
        source:reports!matches_source_report_id_fkey(${REPORT_SELECT}),
        target:reports!matches_target_report_id_fkey(${REPORT_SELECT})
      `,
    )
    .order("created_at", { ascending: false });

  assertNoError(error, "No se pudieron cargar los matches");
  return rows<Match>(data).map(normalizeMatch);
}

export async function getTechnicians(): Promise<Technician[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("technicians")
    .select(
      `
        id,
        specialty,
        active,
        created_at,
        profiles(
          id,
          email,
          full_name,
          role,
          avatar_url,
          created_at,
          updated_at
        )
      `,
    )
    .order("created_at", { ascending: false });

  assertNoError(error, "No se pudieron cargar los técnicos");
  return rows<Technician>(data).map(normalizeTechnician);
}

export async function getCurrentProfile(): Promise<ProfileSummary> {
  const { supabase, user } = await createAuthenticatedClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_url, created_at, updated_at")
    .eq("id", user.id)
    .single();

  assertNoError(error, "No se pudo cargar el perfil");
  return data as ProfileSummary;
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
        id,
        email,
        full_name,
        role,
        avatar_url,
        created_at,
        updated_at,
        technicians(
          id,
          specialty,
          active,
          created_at
        )
      `,
    )
    .order("full_name", { ascending: true });

  assertNoError(error, "No se pudieron cargar los perfiles");
  return rows<Profile>(data);
}

export async function getZones(): Promise<CampusZone[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campus_zones")
    .select("id, name, building, floor, area_type, latitude, longitude, created_at")
    .order("building", { ascending: true })
    .order("name", { ascending: true });

  assertNoError(error, "No se pudieron cargar las zonas");
  return rows<CampusZone>(data);
}

export async function getNotifications(): Promise<AppNotification[]> {
  const { supabase, user } = await createAuthenticatedClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, report_id, title, body, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  assertNoError(error, "No se pudieron cargar las notificaciones");
  return rows<AppNotification>(data);
}

export type SettingsState = {
  settings: SystemSettings;
  storageAvailable: boolean;
  errorMessage?: string;
};

export async function getSettingsState(): Promise<SettingsState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", ADMIN_SETTINGS_KEY)
    .maybeSingle();

  if (isMissingSystemSettingsTable(error)) {
    return {
      settings: DEFAULT_SETTINGS,
      storageAvailable: false,
      errorMessage:
        "Falta aplicar la migración de Supabase que crea public.system_settings.",
    };
  }

  assertNoError(error, "No se pudo cargar la configuración");
  return {
    settings: mergeSettings(data?.value),
    storageAvailable: true,
  };
}

export async function getSettings(): Promise<SystemSettings> {
  const { settings } = await getSettingsState();
  return settings;
}

export async function updateMaintenanceIncident(
  reportId: string,
  payload: {
    status?: string;
    urgency?: string;
    category?: string;
    assigned_to?: string | null;
    due_at?: string | null;
  },
) {
  const { supabase } = await createAuthenticatedClient();
  const now = new Date().toISOString();
  const reportChanges: Record<string, unknown> = {};
  const incidentChanges: Record<string, unknown> = {};

  if (payload.status) {
    reportChanges.status = payload.status;
    reportChanges.resolved_at = ["resolved", "closed"].includes(payload.status) ? now : null;
    if (["resolved", "closed"].includes(payload.status)) {
      incidentChanges.completed_at = now;
    } else if (!["cancelled"].includes(payload.status)) {
      incidentChanges.completed_at = null;
    }
  }
  if (payload.urgency) incidentChanges.urgency = payload.urgency;
  if (payload.category) incidentChanges.category = payload.category;
  if ("assigned_to" in payload) incidentChanges.assigned_to = payload.assigned_to;
  if ("due_at" in payload) incidentChanges.due_at = payload.due_at;

  if (Object.keys(reportChanges).length > 0) {
    const { error } = await supabase
      .from("reports")
      .update(reportChanges)
      .eq("id", reportId);
    assertNoError(error, "No se pudo actualizar el reporte");
  }

  if (Object.keys(incidentChanges).length > 0) {
    const { error } = await supabase
      .from("maintenance_incidents")
      .update(incidentChanges)
      .eq("report_id", reportId);
    assertNoError(error, "No se pudo actualizar la incidencia");
  }
}

export async function createTechnician(profileId: string, specialty: string | null) {
  const { supabase } = await createAuthenticatedClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .single();
  assertNoError(profileError, "No se pudo cargar el perfil");

  const { error: technicianError } = await supabase.from("technicians").insert({
    id: profileId,
    specialty,
    active: true,
  });
  assertNoError(technicianError, "No se pudo crear el técnico");

  if (profile?.role === "student") {
    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: "technician" })
      .eq("id", profileId);
    assertNoError(roleError, "No se pudo actualizar el rol del perfil");
  }
}

export async function updateTechnician(
  technicianId: string,
  payload: { specialty: string | null; active: boolean },
) {
  const { supabase } = await createAuthenticatedClient();
  const { error } = await supabase
    .from("technicians")
    .update(payload)
    .eq("id", technicianId);

  assertNoError(error, "No se pudo actualizar el técnico");
}

export async function createZone(payload: Omit<CampusZone, "id" | "created_at">) {
  const { supabase } = await createAuthenticatedClient();
  const { data, error } = await supabase
    .from("campus_zones")
    .insert(payload)
    .select("id, name, building, floor, area_type, latitude, longitude, created_at")
    .single();

  assertNoError(error, "No se pudo crear la zona");
  return data as CampusZone;
}

export async function updateZone(
  zoneId: string,
  payload: Omit<CampusZone, "id" | "created_at">,
) {
  const { supabase } = await createAuthenticatedClient();
  const { error } = await supabase
    .from("campus_zones")
    .update(payload)
    .eq("id", zoneId);

  assertNoError(error, "No se pudo actualizar la zona");
}

export async function updateClaim(
  claimId: string,
  payload: { status: string; review_notes: string | null },
) {
  const { supabase, user } = await createAuthenticatedClient();
  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .select("lost_item_id")
    .eq("id", claimId)
    .single();
  assertNoError(claimError, "No se pudo cargar el reclamo");

  const { error } = await supabase
    .from("claims")
    .update({
      status: payload.status,
      review_notes: payload.review_notes,
      reviewed_by: user.id,
    })
    .eq("id", claimId);
  assertNoError(error, "No se pudo actualizar el reclamo");

  if (!claim?.lost_item_id) return;

  if (payload.status === "approved") {
    await updateLostItemStatus(claim.lost_item_id, { status: "claimed" });
  } else if (payload.status === "delivered") {
    await updateLostItemStatus(claim.lost_item_id, {
      status: "delivered",
      delivered_at: new Date().toISOString(),
    });
  } else if (payload.status === "rejected") {
    const { data: activeClaims, error: activeClaimsError } = await supabase
      .from("claims")
      .select("id")
      .eq("lost_item_id", claim.lost_item_id)
      .in("status", ["pending", "approved"])
      .neq("id", claimId);
    assertNoError(activeClaimsError, "No se pudo revisar el estado del objeto");

    await updateLostItemStatus(claim.lost_item_id, {
      status: rows(activeClaims).length > 0 ? "claim_pending" : "unclaimed",
    });
  }
}

export async function updateMatch(matchId: string, status: string) {
  const { supabase } = await createAuthenticatedClient();
  const { error } = await supabase
    .from("matches")
    .update({ status })
    .eq("id", matchId);

  assertNoError(error, "No se pudo actualizar el match");
}

export async function updateCurrentProfile({
  fullName,
  avatarFile,
}: {
  fullName: string;
  avatarFile?: File | null;
}) {
  const { supabase, user } = await createAuthenticatedClient();
  const cleanFullName = fullName.trim() || user.email || "Usuario";
  const profileChanges: Record<string, string> = { full_name: cleanFullName };
  const userMetadata: Record<string, string> = {
    full_name: cleanFullName,
    name: cleanFullName,
  };

  if (avatarFile && avatarFile.size > 0) {
    validateAvatarFile(avatarFile);

    const filePath = `${user.id}/avatars/${Date.now()}-${safeStorageName(avatarFile.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("report-photos")
      .upload(filePath, avatarFile, {
        contentType: avatarFile.type,
        upsert: true,
      });

    assertNoError(uploadError, "No se pudo subir el avatar");

    const { data } = supabase.storage.from("report-photos").getPublicUrl(filePath);
    profileChanges.avatar_url = data.publicUrl;
    userMetadata.avatar_url = data.publicUrl;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileChanges)
    .eq("id", user.id);
  assertNoError(profileError, "No se pudo actualizar el perfil");

  const { error: userError } = await supabase.auth.updateUser({ data: userMetadata });
  assertNoError(userError, "No se pudo actualizar los datos del usuario");
}

export async function markNotificationRead(notificationId: string) {
  const { supabase, user } = await createAuthenticatedClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  assertNoError(error, "No se pudo marcar la notificación como leída");
}

export async function updateSettings(settings: SystemSettings) {
  const { supabase, user } = await createAuthenticatedClient();
  const { error } = await supabase.from("system_settings").upsert(
    {
      key: ADMIN_SETTINGS_KEY,
      value: settings,
      updated_by: user.id,
    },
    { onConflict: "key" },
  );

  assertNoError(error, "No se pudo guardar la configuración");
}

async function updateLostItemStatus(
  lostItemId: string,
  payload: { status: string; delivered_at?: string },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lost_items")
    .update(payload)
    .eq("report_id", lostItemId);

  assertNoError(error, "No se pudo actualizar el objeto");
}

async function createAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return { supabase, user };
}

const avatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxAvatarFileSize = 5 * 1024 * 1024;

function validateAvatarFile(file: File) {
  if (!avatarMimeTypes.has(file.type)) {
    throw new Error("El avatar debe ser una imagen JPG, PNG o WebP");
  }

  if (file.size > maxAvatarFileSize) {
    throw new Error("El avatar no puede superar 5 MB");
  }
}

function safeStorageName(name: string) {
  return (name || "avatar")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

type SupabaseQueryError = { message: string; code?: string };

function assertNoError(error: SupabaseQueryError | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function isMissingSystemSettingsTable(error: SupabaseQueryError | null) {
  return error?.code === "PGRST205" && error.message.includes("system_settings");
}

function rows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function increment(bucket: Record<string, number>, key: string) {
  bucket[key] = (bucket[key] ?? 0) + 1;
}

type Relation<T> = T | T[] | null | undefined;

function toOne<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeMaintenanceIncident(row: MaintenanceIncident): MaintenanceIncident {
  return {
    ...row,
    reports: normalizeReport(toOne(row.reports as Relation<Report>)),
  };
}

function normalizeLostItem(row: LostItem): LostItem {
  return {
    ...row,
    reports: normalizeReport(toOne(row.reports as Relation<Report>)),
  };
}

function normalizeClaim(row: Claim): Claim {
  const lostItem = toOne(row.lost_items as Relation<LostItem>);
  return {
    ...row,
    lost_items: lostItem ? normalizeLostItem(lostItem) : null,
    claimant: toOne(row.claimant as Relation<Claim["claimant"]>),
  };
}

function normalizeMatch(row: Match): Match {
  return {
    ...row,
    source: normalizeReport(toOne(row.source as Relation<Report>)),
    target: normalizeReport(toOne(row.target as Relation<Report>)),
  };
}

function normalizeTechnician(row: Technician): Technician {
  return {
    ...row,
    profiles: toOne(row.profiles as Relation<Technician["profiles"]>),
  };
}

function normalizeReport(report: Report | null): Report | null {
  if (!report) return null;
  return {
    ...report,
    campus_zones: toOne(report.campus_zones as Relation<CampusZone>),
  };
}

function mergeSettings(value: unknown): SystemSettings {
  const input = recordValue(value);
  return {
    general: {
      ...DEFAULT_SETTINGS.general,
      ...recordValue(input.general),
    },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...recordValue(input.notifications),
    },
    maintenance: {
      ...DEFAULT_SETTINGS.maintenance,
      ...recordValue(input.maintenance),
    },
    lost_found: {
      ...DEFAULT_SETTINGS.lost_found,
      ...recordValue(input.lost_found),
    },
  };
}

function recordValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
