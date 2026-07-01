"use client";

import { AlertTriangle, ImageIcon, MapPin, Package, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { formatLocation } from "@/lib/supabase/format";
import type { LostItem, MaintenanceIncident } from "@/lib/supabase/types";

import { categoryLabels } from "./dashboard-constants";
import { Badge } from "./shared";

const MAX_DASHBOARD_LIST_ITEMS = 8;

export function CrmLists({
  incidents,
  lostItems,
}: {
  incidents: MaintenanceIncident[];
  lostItems: LostItem[];
}) {
  return (
    <div className="space-y-4">
      <IncidentsTable incidents={incidents} />
      <LostItemsTable lostItems={lostItems} />
    </div>
  );
}

function IncidentsTable({ incidents }: { incidents: MaintenanceIncident[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);
  const filteredIncidents = useMemo(
    () => incidents.filter((incident) => matchesIncident(incident, normalizedQuery)),
    [incidents, normalizedQuery],
  );
  const visibleIncidents = filteredIncidents.slice(0, MAX_DASHBOARD_LIST_ITEMS);

  return (
    <section className="overflow-hidden rounded-xl border border-[#e7f0f2] bg-white/90">
      <TableHeader
        title="Lista de incidencias"
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por título, ubicación, estado, categoría o ID..."
      />

      {filteredIncidents.length === 0 ? (
        <EmptyTable text="No hay incidencias con ese criterio." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2.5">Incidencia</th>
                <th className="px-2.5 py-2.5">Ubicación</th>
                <th className="px-2.5 py-2.5">Estado</th>
                <th className="px-2.5 py-2.5">Urgencia</th>
                <th className="px-2.5 py-2.5">Categoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleIncidents.map((incident) => (
                <tr key={incident.report_id} className="bg-white transition hover:bg-slate-50/90">
                  <td className="max-w-[300px] px-4 py-2.5 align-middle">
                    <div className="flex items-start gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-muted-foreground">
                        {incident.reports?.photo_url ? <ImageIcon className="size-5" /> : <AlertTriangle className="size-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{incident.reports?.title ?? "Incidencia sin título"}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {incident.reports?.description || "Sin descripción registrada."}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[180px] px-2.5 py-2.5 align-middle">
                    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4 shrink-0" />
                      <span className="truncate">{formatLocation(incident.reports)}</span>
                    </div>
                  </td>
                  <td className="px-2.5 py-2.5 align-middle">
                    <Badge value={incident.reports?.status ?? "classified"} />
                  </td>
                  <td className="px-2.5 py-2.5 align-middle">
                    <Badge value={incident.urgency} />
                  </td>
                  <td className="px-2.5 py-2.5 align-middle text-sm text-muted-foreground">
                    {categoryLabels[incident.category] ?? incident.category}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LostItemsTable({ lostItems }: { lostItems: LostItem[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);
  const filteredLostItems = useMemo(
    () => lostItems.filter((item) => matchesLostItem(item, normalizedQuery)),
    [lostItems, normalizedQuery],
  );
  const visibleLostItems = filteredLostItems.slice(0, MAX_DASHBOARD_LIST_ITEMS);

  return (
    <section className="overflow-hidden rounded-xl border border-[#e7f0f2] bg-white/90">
      <TableHeader
        title="Lista de objetos perdidos"
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por objeto, categoría, color, marca, ubicación o estado..."
      />

      {filteredLostItems.length === 0 ? (
        <EmptyTable text="No hay objetos con ese criterio." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2.5">Objeto</th>
                <th className="px-2.5 py-2.5">Ubicación</th>
                <th className="px-2.5 py-2.5">Estado</th>
                <th className="px-2.5 py-2.5">Categoría</th>
                <th className="px-2.5 py-2.5">Color</th>
                <th className="px-2.5 py-2.5">Marca</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLostItems.map((item) => (
                <tr key={item.report_id} className="bg-white transition hover:bg-slate-50/90">
                  <td className="max-w-[300px] px-4 py-2.5 align-middle">
                    <div className="flex items-start gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-muted-foreground">
                        {item.reports?.photo_url ? <ImageIcon className="size-5" /> : <Package className="size-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.item_name || item.reports?.title || "Objeto sin nombre"}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {item.distinguishing_marks || item.reports?.description || "Sin descripción registrada."}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[180px] px-2.5 py-2.5 align-middle">
                    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4 shrink-0" />
                      <span className="truncate">{item.custody_location || formatLocation(item.reports)}</span>
                    </div>
                  </td>
                  <td className="px-2.5 py-2.5 align-middle">
                    <Badge value={item.status} />
                  </td>
                  <td className="px-2.5 py-2.5 align-middle text-sm text-muted-foreground">{item.item_category}</td>
                  <td className="px-2.5 py-2.5 align-middle text-sm text-muted-foreground">{item.color || "Sin dato"}</td>
                  <td className="px-2.5 py-2.5 align-middle text-sm text-muted-foreground">{item.brand || "Sin dato"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TableHeader({
  title,
  query,
  onQueryChange,
  placeholder,
}: {
  title: string;
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <div className="relative min-w-0 sm:w-96 lg:w-[28rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>
    </div>
  );
}

function EmptyTable({ text }: { text: string }) {
  return <p className="p-5 text-sm text-muted-foreground">{text}</p>;
}

function matchesIncident(incident: MaintenanceIncident, query: string) {
  if (!query) return true;
  return searchable([
    incident.report_id,
    incident.reports?.title,
    incident.reports?.description,
    incident.reports?.status,
    incident.urgency,
    incident.category,
    incident.reports?.campus_zones?.building,
    incident.reports?.campus_zones?.name,
  ]).includes(query);
}

function matchesLostItem(item: LostItem, query: string) {
  if (!query) return true;
  return searchable([
    item.report_id,
    item.item_name,
    item.item_category,
    item.color,
    item.brand,
    item.status,
    item.custody_location,
    item.reports?.title,
    item.reports?.campus_zones?.building,
    item.reports?.campus_zones?.name,
  ]).includes(query);
}

function searchable(values: Array<string | null | undefined>) {
  return normalize(values.filter(Boolean).join(" "));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

