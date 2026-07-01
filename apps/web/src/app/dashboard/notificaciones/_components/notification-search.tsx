"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type NotificationTab = "all" | "unread" | "read";

export function NotificationSearch({
  activeTab,
  query,
}: {
  activeTab: NotificationTab;
  query: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(query);

  useEffect(() => {
    const cleanValue = value.trim();
    if (cleanValue === query) return;

    const timeout = window.setTimeout(() => {
      router.replace(notificationHref(activeTab, cleanValue), { scroll: false });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [activeTab, query, router, value]);

  return (
    <div role="search" className="w-full lg:max-w-xl">
      <label>
        <span className="sr-only">Buscar notificaciones</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Buscar por título, mensaje o reporte"
          className="h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-foreground dark:bg-background"
        />
      </label>

    </div>
  );
}

function notificationHref(tab: NotificationTab, query = "") {
  const params = new URLSearchParams();
  const cleanQuery = query.trim();

  if (tab !== "all") params.set("tab", tab);
  if (cleanQuery) params.set("q", cleanQuery);

  const search = params.toString();
  return search ? `/dashboard/notificaciones?${search}` : "/dashboard/notificaciones";
}
