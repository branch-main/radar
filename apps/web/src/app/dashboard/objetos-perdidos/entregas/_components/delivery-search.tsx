"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export function DeliverySearch({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const [value, setValue] = useState(query);
  const [previousQuery, setPreviousQuery] = useState(query);

  if (query !== previousQuery) {
    setPreviousQuery(query);
    if (value !== query) setValue(query);
  }

  useEffect(() => {
    const cleanValue = value.trim();
    if (cleanValue === query.trim()) return;

    const timeout = window.setTimeout(() => {
      onQueryChange(cleanValue);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [onQueryChange, query, value]);

  return (
    <div role="search" className="relative min-w-0">
      <label>
        <span className="sr-only">Buscar entregas</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Buscar solicitante, objeto o custodia"
          className="h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15 dark:bg-background"
        />
      </label>
    </div>
  );
}
