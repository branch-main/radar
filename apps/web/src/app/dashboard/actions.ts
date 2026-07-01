"use server";

import { revalidatePath } from "next/cache";

import {
  createTechnician,
  createZone,
  markNotificationRead,
  updateClaim,
  updateCurrentProfile,
  updateMaintenanceIncident,
  updateMatch,
  updateSettings,
  updateTechnician,
  updateZone,
} from "@/lib/supabase/dashboard";

export async function updateMaintenanceAction(formData: FormData) {
  const reportId = stringValue(formData.get("report_id"));
  const status = stringValue(formData.get("status"));
  const urgency = stringValue(formData.get("urgency"));
  const category = stringValue(formData.get("category"));
  const payload: Record<string, unknown> = {
    ...(status ? { status } : {}),
    ...(urgency ? { urgency } : {}),
    ...(category ? { category } : {}),
  };

  if (!reportId) return;

  if (formData.has("assigned_to")) {
    payload.assigned_to = optionalString(formData.get("assigned_to"));
  }
  if (formData.has("due_at")) {
    payload.due_at = optionalString(formData.get("due_at"));
  }

  await updateMaintenanceIncident(reportId, payload);

  revalidateDashboard();
  revalidatePath("/dashboard/mantenimiento/incidencias");
}

export async function createTechnicianAction(formData: FormData) {
  const profileId = stringValue(formData.get("profile_id"));
  const specialty = stringValue(formData.get("specialty"));

  if (!profileId) return;

  await createTechnician(profileId, specialty || null);

  revalidateDashboard();
  revalidatePath("/dashboard/mantenimiento/tecnicos");
  revalidatePath("/dashboard/mantenimiento/tecnicos/nuevo");
}

export async function updateTechnicianAction(formData: FormData) {
  const technicianId = stringValue(formData.get("technician_id"));
  const specialty = stringValue(formData.get("specialty"));

  if (!technicianId) return;

  await updateTechnician(technicianId, {
    specialty: specialty || null,
    active: booleanValue(formData, "active"),
  });

  revalidateDashboard();
  revalidatePath("/dashboard/mantenimiento/tecnicos");
  revalidatePath(`/dashboard/mantenimiento/tecnicos/${technicianId}`);
}

export async function createZoneAction(formData: FormData) {
  const name = stringValue(formData.get("name"));
  const building = stringValue(formData.get("building"));

  if (!name || !building) return;

  const zone = await createZone({
    name,
    building,
    floor: optionalString(formData.get("floor")),
    area_type: optionalString(formData.get("area_type")),
    latitude: optionalNumber(formData.get("latitude")),
    longitude: optionalNumber(formData.get("longitude")),
  });

  revalidateDashboard();
  revalidatePath("/dashboard/mantenimiento/edificios");
  return zone;
}

export async function updateZoneAction(formData: FormData) {
  const zoneId = stringValue(formData.get("zone_id"));
  const name = stringValue(formData.get("name"));
  const building = stringValue(formData.get("building"));

  if (!zoneId || !name || !building) return;

  await updateZone(zoneId, {
    name,
    building,
    floor: optionalString(formData.get("floor")),
    area_type: optionalString(formData.get("area_type")),
    latitude: optionalNumber(formData.get("latitude")),
    longitude: optionalNumber(formData.get("longitude")),
  });

  revalidateDashboard();
  revalidatePath("/dashboard/mantenimiento/edificios");
}

export async function updateClaimAction(formData: FormData) {
  const claimId = stringValue(formData.get("claim_id"));
  const status = stringValue(formData.get("status"));
  const reviewNotes =
    optionalString(formData.get("review_notes")) ?? "Actualizado desde panel admin";

  if (!claimId || !status) return;

  await updateClaim(claimId, {
    status,
    review_notes: reviewNotes,
  });

  revalidateDashboard();
  revalidatePath("/dashboard/objetos-perdidos/catalogo");
  revalidatePath("/dashboard/objetos-perdidos/entregas");
}

export async function updateMatchAction(formData: FormData) {
  const matchId = stringValue(formData.get("match_id"));
  const status = stringValue(formData.get("status"));

  if (!matchId || !status) return;

  await updateMatch(matchId, status);

  revalidateDashboard();
  revalidatePath("/dashboard/objetos-perdidos/catalogo");
  revalidatePath("/dashboard/objetos-perdidos/matches");
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = stringValue(formData.get("notification_id"));

  if (!notificationId) return;

  await markNotificationRead(notificationId);

  revalidatePath("/dashboard/notificaciones");
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const notificationIds = formData
    .getAll("notification_id")
    .map((value) => stringValue(value))
    .filter(Boolean);
  await Promise.all(
    notificationIds.map((notificationId) => markNotificationRead(notificationId)),
  );

  revalidatePath("/dashboard/notificaciones");
}

export async function updateSettingsAction(formData: FormData) {
  await updateCurrentProfile({
    fullName: stringValue(formData.get("full_name")),
    avatarFile: fileValue(formData.get("avatar_file")),
  });

  await updateSettings({
    general: {
      institution_name: stringValue(formData.get("institution_name")),
      campus_name: stringValue(formData.get("campus_name")),
      timezone: stringValue(formData.get("timezone")),
      language: stringValue(formData.get("language")),
      support_email: stringValue(formData.get("support_email")),
    },
    notifications: {
      email_enabled: booleanValue(formData, "email_enabled"),
      push_enabled: booleanValue(formData, "push_enabled"),
      daily_summary: booleanValue(formData, "daily_summary"),
      notify_on_new_incident: booleanValue(formData, "notify_on_new_incident"),
      notify_on_status_change: booleanValue(formData, "notify_on_status_change"),
      notify_on_new_object: booleanValue(formData, "notify_on_new_object"),
      notify_on_match: booleanValue(formData, "notify_on_match"),
    },
    maintenance: {
      auto_assign: booleanValue(formData, "auto_assign"),
      default_sla_hours: numberValue(formData.get("default_sla_hours"), 48),
      require_photos: booleanValue(formData, "maintenance_require_photos"),
      escalation_enabled: booleanValue(formData, "escalation_enabled"),
      escalation_hours: numberValue(formData.get("escalation_hours"), 24),
    },
    lost_found: {
      retention_days: numberValue(formData.get("retention_days"), 90),
      auto_archive: booleanValue(formData, "auto_archive"),
      auto_archive_days: numberValue(formData.get("auto_archive_days"), 30),
      require_photo: booleanValue(formData, "lost_found_require_photo"),
      public_catalog: booleanValue(formData, "public_catalog"),
      matching_notes: stringValue(formData.get("matching_notes")),
    },
  });

  revalidatePath("/dashboard/configuracion");
}

function revalidateDashboard() {
  revalidatePath("/dashboard");
}

function stringValue(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function optionalString(value: FormDataEntryValue | null) {
  const text = stringValue(value);
  return text || null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = stringValue(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value: FormDataEntryValue | null, fallback: number) {
  const parsed = optionalNumber(value);
  return parsed ?? fallback;
}

function booleanValue(formData: FormData, key: string) {
  return formData.getAll(key).some((value) => value === "true");
}

function fileValue(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}
