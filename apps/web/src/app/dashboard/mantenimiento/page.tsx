import type { Metadata } from "next";
import { getMaintenanceIncidents, getTechnicians } from "@/lib/supabase/dashboard";

import { IncidentsView } from "./_components/incidents-view";

export const metadata: Metadata = {
  title: "Incidencias",
};

export default async function MantenimientoPage() {
  const [incidents, technicians] = await Promise.all([
    getMaintenanceIncidents(),
    getTechnicians(),
  ]);

  return <IncidentsView incidents={incidents} technicians={technicians} renderedAt={new Date().toISOString()} />;
}
