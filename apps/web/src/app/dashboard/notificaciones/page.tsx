import type { Metadata } from "next";

import { getNotifications } from "@/lib/supabase/dashboard";

import { NotificationsView, type NotificationPageState } from "./_components/notifications-view";

export const metadata: Metadata = {
  title: "Notificaciones",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NotificacionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const notifications = await getNotifications();
  const initialState: NotificationPageState = {
    tab: notificationTab(paramValue(params, "tab", "all")),
    query: paramValue(params, "q").trim(),
    page: positiveInteger(paramValue(params, "page"), 1),
  };

  return <NotificationsView initialNotifications={notifications} initialState={initialState} />;
}

function notificationTab(value: string): NotificationPageState["tab"] {
  if (value === "unread" || value === "read") return value;
  return "all";
}

function positiveInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function paramValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback = "",
) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}
