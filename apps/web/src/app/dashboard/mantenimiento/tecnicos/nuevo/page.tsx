import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

import { createTechnicianAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProfiles, getTechnicians } from "@/lib/supabase/dashboard";

import {
  profileLabel,
  specialtyOptions,
  type Option,
} from "../_components/technicians-model";

export const metadata: Metadata = {
  title: "Nuevo técnico",
};

export default async function NuevoTecnicoPage() {
  const [profiles, technicians] = await Promise.all([
    getProfiles(),
    getTechnicians(),
  ]);
  const availableProfiles = profiles.filter(
    (profile) => !technicians.some((technician) => technician.id === profile.id),
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <div>
          <Link
            href="/dashboard/mantenimiento/tecnicos"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Técnicos
          </Link>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">Agregar técnico</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Asocia un perfil existente al equipo de mantenimiento.
          </p>
        </div>
      </div>

      <Card className="gap-0 py-0">
        <div className="border-b border-border px-4 pt-4 pb-3">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Alta rápida
          </p>
          <h2 className="mt-1 text-base leading-snug font-semibold tracking-tight">Datos del técnico</h2>
        </div>
        <CardContent className="p-4">
          <form action={createTechnicianAction} className="space-y-4">
            <label className="grid gap-1.5 text-sm">
              Perfil
              <select
                name="profile_id"
                required
                disabled={availableProfiles.length === 0}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground disabled:opacity-50"
              >
                <option value="">Selecciona un perfil</option>
                {availableProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profileLabel(profile)}
                  </option>
                ))}
              </select>
            </label>

            <FieldSelect label="Especialidad" name="specialty" defaultValue="" options={specialtyOptions} />

            <Button type="submit" disabled={availableProfiles.length === 0}>
              <Plus className="size-3.5" />
              Crear técnico
            </Button>

            {availableProfiles.length === 0 && (
              <p className="text-sm leading-6 text-muted-foreground">
                Todos los perfiles registrados ya están asociados a técnicos.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
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
