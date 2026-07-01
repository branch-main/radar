import type { Metadata } from "next";
import { getMaintenanceIncidents, getProfiles, getTechnicians } from "@/lib/supabase/dashboard";

import { TechniciansView } from "./_components/technicians-view";

export const metadata: Metadata = {
  title: "Técnicos",
};

export default async function TecnicosPage() {
  const [technicians, profiles, incidents] = await Promise.all([
    getTechnicians(),
    getProfiles(),
    getMaintenanceIncidents(),
  ]);

  return (
    <TechniciansView
      technicians={technicians}
      profiles={profiles}
      incidents={incidents}
      renderedAt={new Date().toISOString()}
    />
  );
}
