import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { getCurrentProfile, getSettingsState } from "@/lib/supabase/dashboard";

import { AvatarUpload } from "./_components/avatar-upload";
import { SettingsDirtyForm } from "./_components/settings-dirty-form";

export const metadata: Metadata = {
  title: "Configuración",
};

const settingsSections = [
  { id: "perfil", label: "Perfil" },
  { id: "general", label: "General" },
  { id: "notificaciones", label: "Notificaciones" },
  { id: "mantenimiento", label: "Mantenimiento" },
  { id: "objetos-perdidos", label: "Objetos perdidos" },
];

export default async function ConfiguracionPage() {
  const [{ settings, storageAvailable, errorMessage }, profile] = await Promise.all([
    getSettingsState(),
    getCurrentProfile(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administra preferencias del sistema, alertas y reglas operativas.
        </p>
      </div>

      {errorMessage && (
        <Card className="border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100">
          <CardContent className="space-y-1">
            <p className="font-medium">Configuración usando valores por defecto</p>
            <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
              {errorMessage} Hasta entonces, los cambios no se pueden guardar.
            </p>
          </CardContent>
        </Card>
      )}

      <SettingsDirtyForm
        key={JSON.stringify({ settings, profile })}
        settings={settings}
        profile={profile}
        storageAvailable={storageAvailable}
      >
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <SettingsSideNav />

          <Card className="gap-0 py-0">
            <CardContent className="p-0">
              <SettingsSection
                id="perfil"
                title="Perfil"
                description="Información de la cuenta que se muestra en el panel"
              >
                <div className="space-y-4">
                  <AvatarUpload
                    avatarUrl={profile.avatar_url}
                    alt={profile.full_name}
                    fallback={profileInitials(profile.full_name, profile.email)}
                  />

                  <TextField
                    label="Nombre completo"
                    name="full_name"
                    defaultValue={profile.full_name}
                    required
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReadOnlyField label="Correo" value={profile.email} />
                    <ReadOnlyField label="Rol" value={roleLabel(profile.role)} />
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection
                id="general"
                title="General"
                description="Información básica de la institución"
              >
                <div className="space-y-4">
                  <TextField
                    label="Nombre de la institución"
                    name="institution_name"
                    defaultValue={settings.general.institution_name}
                    required
                  />
                  <TextField
                    label="Nombre del campus"
                    name="campus_name"
                    defaultValue={settings.general.campus_name}
                    required
                  />
                  <div className="grid gap-4">
                    <SelectField
                      label="Zona horaria"
                      name="timezone"
                      defaultValue={settings.general.timezone}
                      options={[["America/Lima", "Lima (UTC-5)"]]}
                    />
                    <SelectField
                      label="Idioma"
                      name="language"
                      defaultValue={settings.general.language}
                      options={[
                        ["es", "Español"],
                        ["en", "English"],
                      ]}
                    />
                  </div>
                  <TextField
                    label="Correo de soporte"
                    name="support_email"
                    type="email"
                    defaultValue={settings.general.support_email}
                    required
                  />
                </div>
              </SettingsSection>

              <SettingsSection
                id="notificaciones"
                title="Notificaciones"
                description="Canales y eventos del sistema"
              >
                <div className="space-y-4">
                  <CheckboxRow
                    label="Notificaciones por correo"
                    description="Enviar alertas al correo electrónico de los usuarios"
                    name="email_enabled"
                    defaultChecked={settings.notifications.email_enabled}
                  />
                  <CheckboxRow
                    label="Notificaciones push"
                    description="Enviar notificaciones push a la app móvil"
                    name="push_enabled"
                    defaultChecked={settings.notifications.push_enabled}
                  />
                  <CheckboxRow
                    label="Resumen diario"
                    description="Enviar un resumen de actividad al final del día"
                    name="daily_summary"
                    defaultChecked={settings.notifications.daily_summary}
                  />
                  <div className="space-y-4 border-t border-border/50 pt-4">
                    <CheckboxRow
                      label="Nueva incidencia reportada"
                      description="Avisar cuando se crea una incidencia de mantenimiento"
                      name="notify_on_new_incident"
                      defaultChecked={settings.notifications.notify_on_new_incident}
                    />
                    <CheckboxRow
                      label="Cambio de estado en incidencia"
                      description="Avisar cuando una incidencia avanza o cambia de estado"
                      name="notify_on_status_change"
                      defaultChecked={settings.notifications.notify_on_status_change}
                    />
                    <CheckboxRow
                      label="Nuevo objeto registrado"
                      description="Avisar cuando se registra un objeto perdido o encontrado"
                      name="notify_on_new_object"
                      defaultChecked={settings.notifications.notify_on_new_object}
                    />
                    <CheckboxRow
                      label="Match de objeto encontrado"
                      description="Avisar cuando el sistema detecta una posible coincidencia"
                      name="notify_on_match"
                      defaultChecked={settings.notifications.notify_on_match}
                    />
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection
                id="mantenimiento"
                title="Mantenimiento"
                description="Reglas para gestión de incidencias"
              >
                <div className="space-y-4">
                  <CheckboxRow
                    label="Auto-asignar incidencias"
                    description="Asignar automáticamente al técnico disponible más cercano"
                    name="auto_assign"
                    defaultChecked={settings.maintenance.auto_assign}
                  />
                  <TextField
                    label="SLA por defecto (horas)"
                    name="default_sla_hours"
                    type="number"
                    min="1"
                    max="720"
                    defaultValue={settings.maintenance.default_sla_hours}
                    required
                    helper="Tiempo máximo para resolver una incidencia"
                    className="w-28"
                  />
                  <CheckboxRow
                    label="Requerir fotos"
                    description="Exigir evidencia fotográfica al reportar incidencias"
                    name="maintenance_require_photos"
                    defaultChecked={settings.maintenance.require_photos}
                  />
                  <CheckboxRow
                    label="Escalamiento automático"
                    description="Escalar incidencias no atendidas después del tiempo límite"
                    name="escalation_enabled"
                    defaultChecked={settings.maintenance.escalation_enabled}
                  />
                  <TextField
                    label="Tiempo para escalamiento (horas)"
                    name="escalation_hours"
                    type="number"
                    min="1"
                    max="168"
                    defaultValue={settings.maintenance.escalation_hours}
                    required
                    className="w-28"
                  />
                </div>
              </SettingsSection>

              <SettingsSection
                id="objetos-perdidos"
                title="Objetos perdidos"
                description="Reglas de retención y catálogo"
              >
                <div className="space-y-4">
                  <TextField
                    label="Período de retención (días)"
                    name="retention_days"
                    type="number"
                    min="1"
                    max="365"
                    defaultValue={settings.lost_found.retention_days}
                    required
                    helper="Días que se conserva un objeto antes de disposición final"
                    className="w-28"
                  />
                  <CheckboxRow
                    label="Auto-archivar"
                    description="Archivar objetos no reclamados después del período"
                    name="auto_archive"
                    defaultChecked={settings.lost_found.auto_archive}
                  />
                  <TextField
                    label="Archivar después de (días)"
                    name="auto_archive_days"
                    type="number"
                    min="1"
                    max="365"
                    defaultValue={settings.lost_found.auto_archive_days}
                    required
                    className="w-28"
                  />
                  <CheckboxRow
                    label="Requerir foto al registrar"
                    description="Exigir foto del objeto al momento del registro"
                    name="lost_found_require_photo"
                    defaultChecked={settings.lost_found.require_photo}
                  />
                  <CheckboxRow
                    label="Catálogo público"
                    description="Permitir a cualquier usuario ver los objetos encontrados"
                    name="public_catalog"
                    defaultChecked={settings.lost_found.public_catalog}
                  />
                  <label className="grid gap-1.5 text-sm">
                    Notas de coincidencia
                    <textarea
                      name="matching_notes"
                      defaultValue={settings.lost_found.matching_notes}
                      placeholder="Instrucciones adicionales para el proceso de matching..."
                      className="min-h-24 rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground"
                    />
                  </label>
                </div>
              </SettingsSection>
            </CardContent>
          </Card>
        </div>
      </SettingsDirtyForm>
    </div>
  );
}

function SettingsSideNav() {
  return (
    <aside className="-mx-1 overflow-x-auto px-1 lg:sticky lg:top-6 lg:mx-0 lg:overflow-visible lg:px-0">
      <nav
        aria-label="Secciones de configuración"
        className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col"
      >
        {settingsSections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {section.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 px-4 last:[&>div]:border-b-0">
      <div className="grid gap-4 border-b border-border py-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5 text-sm">
      <span>{label}</span>
      <div className="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm text-muted-foreground">
        {value}
      </div>
    </div>
  );
}

function TextField({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
  min,
  max,
  helper,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string | number;
  required?: boolean;
  min?: string;
  max?: string;
  helper?: string;
  className?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        max={max}
        className={`h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground ${className ?? ""}`}
      />
      {helper && <span className="text-xs text-muted-foreground">{helper}</span>}
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function profileInitials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    technician: "Técnico",
    student: "Estudiante",
  };

  return labels[role] ?? role;
}

function CheckboxRow({
  label,
  description,
  name,
  defaultChecked,
}: {
  label: string;
  description?: string;
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-8 text-sm">
      <span className="min-w-0 flex-1">
        <span className="font-medium">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        )}
      </span>
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 accent-primary"
      />
    </label>
  );
}
