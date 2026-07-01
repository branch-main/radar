"use client";

import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/dashboard/actions";
import { useNotificationsQuery } from "@/app/dashboard/_lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/supabase/format";
import type { AppNotification } from "@/lib/supabase/types";

import { NotificationSearch } from "./notification-search";

export type NotificationTab = "all" | "unread" | "read";
export type NotificationPageState = {
  tab: NotificationTab;
  query: string;
  page: number;
};

type NotificationsViewProps = {
  initialNotifications: AppNotification[];
  initialState: NotificationPageState;
};

const notificationsPerPage = 10;

export function NotificationsView({ initialNotifications, initialState }: NotificationsViewProps) {
  const { data: notifications } = useNotificationsQuery(initialNotifications);
  const [viewState, setViewState] = useState(() => ({
    active: initialState,
    syncedInitial: initialState,
  }));
  let currentViewState = viewState;

  if (!sameNotificationState(initialState, currentViewState.syncedInitial)) {
    currentViewState = {
      active: initialState,
      syncedInitial: initialState,
    };
    setViewState(currentViewState);
  }

  const { tab: activeTab, query, page } = currentViewState.active;

  const unread = useMemo(
    () => notifications.filter((notification) => !notification.read_at),
    [notifications],
  );
  const read = useMemo(
    () => notifications.filter((notification) => notification.read_at),
    [notifications],
  );
  const tabNotifications = useMemo(
    () => ({ all: notifications, unread, read })[activeTab],
    [activeTab, notifications, read, unread],
  );
  const filteredNotifications = useMemo(
    () => filterNotifications(tabNotifications, query),
    [query, tabNotifications],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotifications.length / notificationsPerPage),
  );
  const activePage = Math.min(page, totalPages);
  const pageStart = (activePage - 1) * notificationsPerPage;
  const pageNotifications = filteredNotifications.slice(
    pageStart,
    pageStart + notificationsPerPage,
  );
  const resultLabel =
    filteredNotifications.length > 0
      ? `${pageStart + 1}-${Math.min(pageStart + notificationsPerPage, filteredNotifications.length)} de ${filteredNotifications.length} notificaciones`
      : "";

  const replaceState = useCallback((nextState: NotificationPageState) => {
    setViewState((currentState) => ({
      ...currentState,
      active: nextState,
    }));
    replaceUrl(notificationHref(nextState));
  }, []);

  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      replaceState({ tab: activeTab, query: nextQuery, page: 1 });
    },
    [activeTab, replaceState],
  );

  function changeTab(tab: NotificationTab) {
    if (tab === activeTab) return;
    replaceState({ tab, query, page: 1 });
  }

  function changePage(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    if (safePage === activePage) return;
    replaceState({ tab: activeTab, query, page: safePage });
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Notificaciones
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Consulta alertas del sistema y mantén tu bandeja al día.
          </p>
        </div>

        {unread.length > 0 && (
          <form action={markAllNotificationsReadAction}>
            {unread.map((notification) => (
              <input
                key={notification.id}
                type="hidden"
                name="notification_id"
                value={notification.id}
              />
            ))}
            <Button
              type="submit"
              variant="outline"
              className="w-full bg-white hover:bg-white/80 sm:w-auto"
            >
              Marcar todas leídas
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <NotificationTabs
            activeTab={activeTab}
            counts={{
              all: notifications.length,
              unread: unread.length,
              read: read.length,
            }}
            onTabChange={changeTab}
          />
          <NotificationSearch query={query} onQueryChange={handleQueryChange} />
        </div>

        <Card className="gap-0 border-border py-0">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
            <h2 className="text-base leading-snug font-semibold tracking-tight">
              Bandeja
            </h2>
            <div className="flex items-center gap-2">
              {resultLabel && (
                <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                  {resultLabel}
                </span>
              )}
              {totalPages > 1 && (
                <PaginationControls
                  activePage={activePage}
                  totalPages={totalPages}
                  onPageChange={changePage}
                />
              )}
            </div>
          </div>

          <CardContent className="px-0 pt-0">
            {filteredNotifications.length === 0 ? (
              <EmptyState tab={activeTab} />
            ) : (
              <div className="divide-y divide-border">
                {pageNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`grid gap-4 px-4 py-4 transition hover:bg-muted/50 xl:grid-cols-[1fr_auto] ${
                      notification.read_at
                        ? "bg-slate-100 dark:bg-slate-800/50 opacity-75"
                        : "bg-white dark:bg-card"
                    }`}
                  >
                    <div className="min-w-0">
                      <h3
                        className={`truncate text-sm ${
                          notification.read_at
                            ? "font-medium text-muted-foreground"
                            : "font-bold text-foreground"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <p
                        className={`mt-1 text-sm leading-6 ${
                          notification.read_at
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {notification.body}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{formatDateTime(notification.created_at)}</span>
                        {notification.report_id && (
                          <span>Reporte: {notification.report_id}</span>
                        )}
                      </div>
                    </div>

                    {notification.read_at && (
                      <div className="flex items-end justify-end text-xs text-muted-foreground">
                        Leída: {formatDateTime(notification.read_at)}
                      </div>
                    )}

                    {!notification.read_at && (
                      <form
                        action={markNotificationReadAction}
                        className="flex items-end"
                      >
                        <input
                          type="hidden"
                          name="notification_id"
                          value={notification.id}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="border-transparent bg-muted/70 text-foreground hover:bg-muted"
                        >
                          Marcar leída
                        </Button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NotificationTabs({
  activeTab,
  counts,
  onTabChange,
}: {
  activeTab: NotificationTab;
  counts: Record<NotificationTab, number>;
  onTabChange: (tab: NotificationTab) => void;
}) {
  const tabs: Array<{ value: NotificationTab; label: string }> = [
    { value: "all", label: "Todas" },
    { value: "unread", label: "Sin leer" },
    { value: "read", label: "Leídas" },
  ];

  return (
    <nav aria-label="Filtro de notificaciones" className="overflow-x-auto">
      <div className="flex min-w-max gap-1 rounded-lg border border-border bg-white p-1 dark:bg-background">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-current={activeTab === tab.value ? "page" : undefined}
            onClick={() => onTabChange(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 text-xs ${
                activeTab === tab.value
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              }`}
            >
              {counts[tab.value]}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function PaginationControls({
  activePage,
  totalPages,
  onPageChange,
}: {
  activePage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Paginación de notificaciones"
      className="flex items-center gap-1"
    >
      <PaginationButton
        disabled={activePage === 1}
        ariaLabel="Página anterior"
        onClick={() => onPageChange(activePage - 1)}
      >
        <ChevronLeft className="size-4" />
      </PaginationButton>
      <PaginationButton
        disabled={activePage === totalPages}
        ariaLabel="Página siguiente"
        onClick={() => onPageChange(activePage + 1)}
      >
        <ChevronRight className="size-4" />
      </PaginationButton>
    </nav>
  );
}

function PaginationButton({
  disabled = false,
  ariaLabel,
  onClick,
  children,
}: {
  disabled?: boolean;
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-lg bg-transparent text-muted-foreground transition hover:bg-muted hover:text-foreground ${disabled ? "cursor-default opacity-45" : ""}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ tab }: { tab: NotificationTab }) {
  const content = {
    all: {
      title: "No hay notificaciones",
      description: "Las nuevas alertas aparecerán en esta bandeja.",
    },
    unread: {
      title: "No hay notificaciones sin leer",
      description: "Todas las alertas están atendidas.",
    },
    read: {
      title: "No hay notificaciones leídas",
      description: "Las alertas marcadas como leídas aparecerán aquí.",
    },
  }[tab];

  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-5" />
      </div>
      <p className="text-sm font-medium">{content.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {content.description}
      </p>
    </div>
  );
}

export function positiveInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function notificationTab(value: string): NotificationTab {
  if (value === "unread" || value === "read") return value;
  return "all";
}

function sameNotificationState(
  state: NotificationPageState,
  otherState: NotificationPageState,
) {
  return (
    state.tab === otherState.tab &&
    state.query === otherState.query &&
    state.page === otherState.page
  );
}

function notificationHref(state: NotificationPageState) {
  const params = new URLSearchParams();
  const cleanQuery = state.query.trim();

  if (state.tab !== "all") params.set("tab", state.tab);
  if (cleanQuery) params.set("q", cleanQuery);
  if (state.page > 1) params.set("page", String(state.page));

  const search = params.toString();
  return search
    ? `/dashboard/notificaciones?${search}`
    : "/dashboard/notificaciones";
}

function filterNotifications(notifications: AppNotification[], query: string) {
  const cleanQuery = normalize(query);
  if (!cleanQuery) return notifications;

  return notifications.filter((notification) => {
    const haystack = normalize(
      [
        notification.id,
        notification.title,
        notification.body,
        notification.report_id,
        notification.read_at ? "leída leida" : "sin leer pendiente",
        formatDateTime(notification.created_at),
        notification.read_at ? formatDateTime(notification.read_at) : null,
      ].join(" "),
    );

    return cleanQuery.split(/\s+/).every((term) => haystack.includes(term));
  });
}

function replaceUrl(href: string) {
  window.history.replaceState(null, "", href);
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
