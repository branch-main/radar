"use client";

import { useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  type DefinedUseQueryResult,
  type QueryKey,
} from "@tanstack/react-query";

import type { AppNotification, Claim, Match } from "@/lib/supabase/types";

export const dashboardQueryKeys = {
  claims: ["dashboard", "claims"] as const,
  matches: ["dashboard", "matches"] as const,
  notifications: ["dashboard", "notifications"] as const,
};

export function useClaimsQuery(initialData: Claim[]) {
  return useSeededQuery(dashboardQueryKeys.claims, "/api/dashboard/claims", initialData);
}

export function useMatchesQuery(initialData: Match[]) {
  return useSeededQuery(dashboardQueryKeys.matches, "/api/dashboard/matches", initialData);
}

export function useNotificationsQuery(initialData: AppNotification[]) {
  return useSeededQuery(dashboardQueryKeys.notifications, "/api/dashboard/notifications", initialData);
}

function useSeededQuery<TData>(
  queryKey: QueryKey,
  url: string,
  initialData: TData,
): DefinedUseQueryResult<TData, Error> {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.setQueryData(queryKey, initialData);
  }, [initialData, queryClient, queryKey]);

  return useQuery<TData, Error, TData, QueryKey>({
    queryKey,
    queryFn: () => fetchDashboardData<TData>(url),
    initialData,
  }) as DefinedUseQueryResult<TData, Error>;
}

async function fetchDashboardData<TData>(url: string) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar los datos del panel");
  }

  const payload = (await response.json()) as { data: TData };
  return payload.data;
}
