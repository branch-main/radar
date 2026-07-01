import type { Metadata } from "next";
import { createZoneAction, updateZoneAction } from "@/app/dashboard/actions";
import { getZones } from "@/lib/supabase/dashboard";

import { BuildingsMapView } from "./_components/buildings-map-view";

export const metadata: Metadata = {
  title: "Edificios",
};

export default async function EdificiosPage() {
  const zones = await getZones();

  return (
    <BuildingsMapView
      zones={zones}
      createZoneAction={createZoneAction}
      updateZoneAction={updateZoneAction}
    />
  );
}
