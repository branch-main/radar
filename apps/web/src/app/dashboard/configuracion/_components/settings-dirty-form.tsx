"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { updateSettingsAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import type { ProfileSummary, SystemSettings } from "@/lib/supabase/types";

type SettingsDirtyFormProps = {
  settings: SystemSettings;
  profile: ProfileSummary;
  storageAvailable: boolean;
  children: ReactNode;
};

type SnapshotValue = boolean | number | string;
type Snapshot = Record<string, SnapshotValue>;

const stringFields = [
  "full_name",
  "institution_name",
  "campus_name",
  "timezone",
  "language",
  "support_email",
  "matching_notes",
] as const;

const booleanFields = [
  "email_enabled",
  "push_enabled",
  "daily_summary",
  "notify_on_new_incident",
  "notify_on_status_change",
  "notify_on_new_object",
  "notify_on_match",
  "auto_assign",
  "maintenance_require_photos",
  "escalation_enabled",
  "auto_archive",
  "lost_found_require_photo",
  "public_catalog",
] as const;

const numberFields = [
  ["default_sla_hours", 48],
  ["escalation_hours", 24],
  ["retention_days", 90],
  ["auto_archive_days", 30],
] as const;

const fileFields = ["avatar_file"] as const;

const snapshotKeys = [
  ...stringFields,
  ...booleanFields,
  ...numberFields.map(([key]) => key),
  ...fileFields,
];

export function SettingsDirtyForm({
  settings,
  profile,
  storageAvailable,
  children,
}: SettingsDirtyFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const initialSignature = signature(settingsSnapshot(settings, profile));

  const updateDirtyState = useCallback(() => {
    if (!formRef.current) return;

    setIsDirty(signature(formSnapshot(formRef.current)) !== initialSignature);
  }, [initialSignature]);

  return (
    <form
      ref={formRef}
      action={updateSettingsAction}
      onInput={updateDirtyState}
      onChange={updateDirtyState}
    >
      <fieldset disabled={!storageAvailable} className="space-y-4 disabled:opacity-60">
        {children}
        <div className="flex justify-end">
          <SaveSettingsButton canSubmit={storageAvailable && isDirty} />
        </div>
      </fieldset>
    </form>
  );
}

function SaveSettingsButton({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={!canSubmit || pending}>
      {pending ? "Guardando..." : "Guardar cambios"}
    </Button>
  );
}

function settingsSnapshot(settings: SystemSettings, profile: ProfileSummary): Snapshot {
  return {
    full_name: cleanString(profile.full_name),
    institution_name: cleanString(settings.general.institution_name),
    campus_name: cleanString(settings.general.campus_name),
    timezone: cleanString(settings.general.timezone),
    language: cleanString(settings.general.language),
    support_email: cleanString(settings.general.support_email),
    matching_notes: cleanString(settings.lost_found.matching_notes),
    email_enabled: settings.notifications.email_enabled,
    push_enabled: settings.notifications.push_enabled,
    daily_summary: settings.notifications.daily_summary,
    notify_on_new_incident: settings.notifications.notify_on_new_incident,
    notify_on_status_change: settings.notifications.notify_on_status_change,
    notify_on_new_object: settings.notifications.notify_on_new_object,
    notify_on_match: settings.notifications.notify_on_match,
    auto_assign: settings.maintenance.auto_assign,
    maintenance_require_photos: settings.maintenance.require_photos,
    escalation_enabled: settings.maintenance.escalation_enabled,
    auto_archive: settings.lost_found.auto_archive,
    lost_found_require_photo: settings.lost_found.require_photo,
    public_catalog: settings.lost_found.public_catalog,
    default_sla_hours: settings.maintenance.default_sla_hours,
    escalation_hours: settings.maintenance.escalation_hours,
    retention_days: settings.lost_found.retention_days,
    auto_archive_days: settings.lost_found.auto_archive_days,
    avatar_file: false,
  };
}

function formSnapshot(form: HTMLFormElement): Snapshot {
  const formData = new FormData(form);
  const snapshot: Snapshot = {};

  for (const field of stringFields) {
    snapshot[field] = stringValue(formData, field);
  }

  for (const field of booleanFields) {
    snapshot[field] = booleanValue(formData, field);
  }

  for (const [field, fallback] of numberFields) {
    snapshot[field] = numberValue(formData, field, fallback);
  }

  for (const field of fileFields) {
    snapshot[field] = hasFile(formData, field);
  }

  return snapshot;
}

function signature(snapshot: Snapshot) {
  return JSON.stringify(snapshotKeys.map((key) => [key, snapshot[key]]));
}

function stringValue(formData: FormData, key: string) {
  return cleanString(formData.get(key));
}

function cleanString(value: FormDataEntryValue | string | null) {
  return String(value ?? "").trim();
}

function booleanValue(formData: FormData, key: string) {
  return formData.getAll(key).some((value) => value === "true");
}

function numberValue(formData: FormData, key: string, fallback: number) {
  const text = stringValue(formData, key);
  if (!text) return fallback;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hasFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0;
}
