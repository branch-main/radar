import type { Metadata } from "next";
import { DashboardView } from "./_components/dashboard-view";
import { buildDashboardModel } from "./_components/dashboard-model";
import {
  getClaims,
  getDashboardData,
  getLostItems,
  getMaintenanceIncidents,
  getMatches,
  getTechnicians,
} from "@/lib/supabase/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const [dashboard, incidents, lostItems, claims, matches, technicians] = await Promise.all([
    getDashboardData(),
    getMaintenanceIncidents(),
    getLostItems(),
    getClaims(),
    getMatches(),
    getTechnicians(),
  ]);

  const model = buildDashboardModel({
    dashboard,
    incidents,
    lostItems,
    claims,
    matches,
    technicians,
  });

  return <DashboardView model={model} />;
}
