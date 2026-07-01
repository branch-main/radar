"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export function NotificationSearch({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const [inputState, setInputState] = useState(() => ({
    editVersion: 0,
    pendingQuery: null as { query: string; version: number } | null,
    syncedQuery: query,
    value: query,
  }));
  let currentState = inputState;

  if (query !== currentState.syncedQuery) {
    const cleanQuery = query.trim();
    const pendingQuery = currentState.pendingQuery;
    let nextPendingQuery = pendingQuery;
    let shouldSyncValue = true;

    if (pendingQuery?.query === cleanQuery) {
      nextPendingQuery = null;
      shouldSyncValue = pendingQuery.version === currentState.editVersion;
    } else if (pendingQuery) {
      if (currentState.value.trim() !== cleanQuery) {
        shouldSyncValue = false;
      } else {
        nextPendingQuery = null;
      }
    }

    currentState = {
      ...currentState,
      pendingQuery: nextPendingQuery,
      syncedQuery: query,
      value: shouldSyncValue ? query : currentState.value,
    };
    setInputState(currentState);
  }

  const { editVersion, value } = currentState;

  useEffect(() => {
    const cleanValue = value.trim();
    if (cleanValue === query.trim()) return;

    const queryVersion = editVersion;
    const timeout = window.setTimeout(() => {
      setInputState((currentState) => ({
        ...currentState,
        pendingQuery: { query: cleanValue, version: queryVersion },
      }));
      onQueryChange(cleanValue);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [editVersion, onQueryChange, query, value]);

  return (
    <div role="search" className="w-full lg:max-w-xl">
      <label className="relative block">
        <span className="sr-only">Buscar notificaciones</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            setInputState((currentState) => ({
              ...currentState,
              editVersion: currentState.editVersion + 1,
              value: nextValue,
            }));
          }}
          placeholder="Buscar por título, mensaje o reporte"
          className="h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15 dark:bg-background"
        />
      </label>
    </div>
  );
}
