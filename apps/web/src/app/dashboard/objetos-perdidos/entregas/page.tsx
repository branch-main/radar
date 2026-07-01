import type { Metadata } from "next";

import {
  paramValue,
  type SearchParams,
} from "@/app/dashboard/objetos-perdidos/_components/lost-found-ui";
import { getClaims } from "@/lib/supabase/dashboard";

import { DeliveriesView, type DeliveryFiltersState } from "./_components/deliveries-view";

export const metadata: Metadata = {
  title: "Entregas",
};

export default async function EntregasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const claims = await getClaims();
  const filters: DeliveryFiltersState = {
    query: paramValue(params, "q"),
    status: deliveryStatus(paramValue(params, "status", "all")),
    category: paramValue(params, "category", "all"),
    custody: paramValue(params, "custody", "all"),
    sort: deliverySort(paramValue(params, "sort", "ready")),
  };

  return <DeliveriesView initialClaims={claims} initialFilters={filters} />;
}

function deliveryStatus(value: string): DeliveryFiltersState["status"] {
  if (value === "approved" || value === "pending" || value === "delivered" || value === "rejected") {
    return value;
  }
  return "all";
}

function deliverySort(value: string): DeliveryFiltersState["sort"] {
  if (value === "recent" || value === "requester" || value === "item" || value === "status") {
    return value;
  }
  return "ready";
}
