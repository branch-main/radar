import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Mail,
} from "lucide-react";

import { updateTechnicianAction } from "@/app/dashboard/actions";
import {
  Avatar as UiAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMaintenanceIncidents, getTechnicians } from "@/lib/supabase/dashboard";

import { AssignedIncidentsCard } from "./_components/assigned-incidents-card";

import {
  createWorkloadMap,
  emptyWorkload,
  formatDate,
  roleLabel,
  specialtyLabel,
  specialtyOptions,
  technicianName,
  type Option,
} from "../_components/technicians-model";

type Params = Promise<{ technicianId: string }>;

type TechnicianDetailPageProps = {
  params: Params;
};

export const metadata: Metadata = {
  title: "Ficha técnica",
};

export default async function TechnicianDetailPage({ params }: TechnicianDetailPageProps) {
  const { technicianId } = await params;
  const [technicians, incidents] = await Promise.all([
    getTechnicians(),
    getMaintenanceIncidents(),
  ]);
  const technician = technicians.find((item) => item.id === technicianId);

  if (!technician) notFound();

  const now = new Date();
  const name = technicianName(technician);
  const email = technician.profiles?.email ?? "Sin correo";
  const role = roleLabel(technician.profiles?.role);
  const specialty = specialtyLabel(technician.specialty);
  const workload = createWorkloadMap(incidents, now).get(technician.id) ?? emptyWorkload();
  const assignedIncidents = incidents
    .filter((incident) => incident.assigned_to === technician.id)
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime());

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/mantenimiento/tecnicos"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Técnicos
          </Link>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ficha técnica, disponibilidad y carga asignada del técnico.
          </p>
        </div>
        <StatusBadge active={technician.active} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Abiertas" value={workload.open} icon={ClipboardList} />
        <MetricCard label="Críticas" value={workload.critical} icon={AlertTriangle} />
        <MetricCard label="Vencidas" value={workload.overdue} icon={CalendarClock} />
        <MetricCard label="Resueltas" value={workload.resolved} icon={CheckCircle2} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card className="gap-0 py-0">
            <div className="px-4 pt-4 pb-3">
              <h2 className="text-base leading-snug font-semibold tracking-tight">Datos del técnico</h2>
            </div>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar
                  name={name}
                  avatarUrl={technician.profiles?.avatar_url}
                />
                <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                  <InfoLine label="Nombre" value={name} />
                  <InfoLine label="Correo" value={email} icon={Mail} />
                  <InfoLine label="Rol" value={role} />
                  <InfoLine label="Especialidad" value={specialty} />
                  <InfoLine label="Alta" value={formatDate(technician.created_at)} />
                  <InfoLine label="ID" value={technician.id} mono />
                </div>
              </div>
            </CardContent>
          </Card>

          <AssignedIncidentsCard incidents={assignedIncidents} now={now.toISOString()} />
        </div>

        <Card className="gap-0 py-0 xl:sticky xl:top-6 xl:self-start">
          <div className="px-4 pt-4 pb-3">
            <h2 className="text-base leading-snug font-semibold tracking-tight">Actualizar técnico</h2>
          </div>
          <CardContent className="p-4">
            <form action={updateTechnicianAction} className="space-y-4">
              <input type="hidden" name="technician_id" value={technician.id} />
              <FieldSelect
                label="Especialidad"
                name="specialty"
                defaultValue={technician.specialty ?? ""}
                options={specialtyOptions}
              />
              <label className="flex items-start justify-between gap-6 rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">Disponible para asignación</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Permite asignar nuevas incidencias a este técnico.
                  </span>
                </span>
                <input
                  type="checkbox"
                  name="active"
                  value="true"
                  defaultChecked={technician.active}
                  className="mt-1 size-4 accent-primary"
                />
              </label>
              <Button type="submit" className="w-full">
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-[#e7f0f2] bg-white/90 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function FieldSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Option[];
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
      >
        {options.map(([value, optionLabel]) => (
          <option key={`${name}-${value || optionLabel}`} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoLine({
  label,
  value,
  icon: Icon,
  mono = false,
}: {
  label: string;
  value: string;
  icon?: ComponentType<{ className?: string }>;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 flex min-w-0 items-center gap-1.5 truncate text-sm font-medium ${mono ? "font-mono" : ""}`}>
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}

function Avatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "T";

  return (
    <UiAvatar className="size-16">
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className="text-lg font-semibold text-primary">
        {initials}
      </AvatarFallback>
    </UiAvatar>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex w-fit rounded-lg px-2 py-1 text-xs font-medium ${
        active
          ? "bg-emerald-500/10 text-emerald-700"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}
