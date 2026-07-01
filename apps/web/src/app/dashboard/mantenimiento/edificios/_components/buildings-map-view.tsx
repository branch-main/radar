"use client";

import {
  Building2,
  Compass,
  Crosshair,
  Layers,
  MapPin,
  Pencil,
  Plus,
  ScanLine,
  Search,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type ComponentType, type MouseEvent, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import type { CampusZone } from "@/lib/supabase/types";

type CreateZoneAction = (formData: FormData) => Promise<CampusZone | void>;
type UpdateZoneAction = (formData: FormData) => Promise<void>;
type GeoZone = CampusZone & { latitude: number; longitude: number };
type BuildingGroup = {
  building: string;
  zones: CampusZone[];
  floors: string[];
  areaTypes: string[];
  geoLocated: number;
};
type ZoneMapPoint = {
  id: string;
  building: string;
  name: string;
  floor: string | null;
  areaType: string | null;
  x: number;
  y: number;
  signal: "Mapa" | "Referencia";
};
type CreatePoint = {
  key: number;
  x: number;
  y: number;
  latitude: string;
  longitude: string;
};
type MapPosition = { x: number; y: number };
type DragState = {
  zoneId: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

type BuildingsMapViewProps = {
  zones: CampusZone[];
  createZoneAction: CreateZoneAction;
  updateZoneAction: UpdateZoneAction;
};

export function BuildingsMapView({ zones, createZoneAction, updateZoneAction }: BuildingsMapViewProps) {
  const [createPoint, setCreatePoint] = useState<CreatePoint | null>(null);
  const [activeBuilding, setActiveBuilding] = useState<string | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draftPositions, setDraftPositions] = useState<Record<string, MapPosition>>({});
  const [savingPositions, setSavingPositions] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  const zonesByBuilding = useMemo(() => groupZonesByBuilding(zones), [zones]);
  const buildingGroups = useMemo(() => createBuildingGroups(zonesByBuilding), [zonesByBuilding]);
  const mapPoints = useMemo(() => createZoneMapPoints(zones, draftPositions), [draftPositions, zones]);
  const geoLocatedZones = zones.filter(hasLocalCoordinates).length;
  const floorCount = uniqueValues(zones.map((zone) => zone.floor)).length;
  const visibleGroups = useMemo(() => filterGroups(buildingGroups, query), [buildingGroups, query]);
  const hasPositionChanges = Object.keys(draftPositions).length > 0;

  function openCreateForm(event: MouseEvent<HTMLDivElement>) {
    if (!mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 6, 94);

    setCreatePoint({
      key: Date.now(),
      x,
      y,
      latitude: formatCoordinate(100 - y),
      longitude: formatCoordinate(x),
    });
  }

  function selectZone(point: ZoneMapPoint) {
    setActiveBuilding(point.building);
    setActiveZoneId(point.id);
    setCreatePoint(null);
  }

  function selectBuilding(building: string) {
    setActiveBuilding(building);
    setActiveZoneId(null);
    setCreatePoint(null);
  }

  function selectCreatedZone(zone: CampusZone | void, formData: FormData) {
    const building = String(formData.get("building") ?? "").trim();

    setCreatePoint(null);
    setActiveBuilding(zone?.building || building || null);
    setActiveZoneId(zone?.id ?? null);
  }

  function startDragging(event: PointerEvent<HTMLButtonElement>, point: ZoneMapPoint) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      zoneId: point.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }

  function dragPoint(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 6, 94);

    if (distance <= 2) return;

    drag.moved = true;
    suppressClickRef.current = true;

    setDraftPositions((current) => ({
      ...current,
      [drag.zoneId]: { x, y },
    }));
  }

  function stopDragging(event: PointerEvent<HTMLButtonElement>, point: ZoneMapPoint) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;

    setActiveBuilding(point.building);
    setActiveZoneId(point.id);
  }

  async function savePositions() {
    const changedZones = Object.entries(draftPositions)
      .map(([zoneId, position]) => ({ zone: zones.find((zone) => zone.id === zoneId), position }))
      .filter((item): item is { zone: CampusZone; position: MapPosition } => Boolean(item.zone));

    if (changedZones.length === 0) return;

    setSavingPositions(true);

    try {
      await Promise.all(
        changedZones.map(({ zone, position }) => {
          const formData = new FormData();
          formData.set("zone_id", zone.id);
          formData.set("building", zone.building);
          formData.set("name", zone.name);
          formData.set("floor", zone.floor ?? "");
          formData.set("area_type", zone.area_type ?? "");
          formData.set("latitude", formatCoordinate(100 - position.y));
          formData.set("longitude", formatCoordinate(position.x));
          return updateZoneAction(formData);
        }),
      );
      setDraftPositions({});
    } finally {
      setSavingPositions(false);
    }
  }

  function discardPositions() {
    setDraftPositions({});
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-[#e7f0f2] bg-[linear-gradient(135deg,#f8fcfd_0%,#e9f6f8_58%,#d9edf0_100%)] p-6">
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              <Compass className="size-3.5" />
              Plano operativo
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Edificios y zonas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Haz clic en el mapa para ubicar una zona nueva. Los puntos creados quedan en la misma posición donde los marcaste.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MetricStat label="Edificios" value={buildingGroups.length} icon={Building2} />
            <MetricStat label="Zonas" value={zones.length} icon={Layers} />
            <MetricStat label="En mapa" value={geoLocatedZones} icon={MapPin} />
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">Mapa del campus</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Presiona un punto libre para crear</h2>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>{mapPoints.length} puntos</span>
            <span>{buildingGroups.length} edificios</span>
            <span>{floorCount} pisos</span>
          </div>
        </div>

        <div
          ref={mapRef}
          role="button"
          tabIndex={0}
          onClick={openCreateForm}
          className="relative min-h-[680px] cursor-crosshair overflow-hidden rounded-[1.75rem] border bg-[#e8f1f0] outline-none transition focus:ring-4 focus:ring-primary/15"
        >
          <MapArtwork />

          <div className="absolute left-5 top-5 z-20 max-w-[310px] rounded-2xl bg-white/75 p-3 text-xs text-slate-600 backdrop-blur">
            <div className="flex items-start gap-2 font-semibold text-slate-800">
              <ScanLine className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Clic para crear. Arrastra un punto para moverlo.</span>
            </div>
          </div>

          {hasPositionChanges && (
            <div
              className="absolute bottom-5 right-5 z-30 flex items-center gap-2 rounded-2xl bg-white/90 p-2 backdrop-blur"
              onClick={(event) => event.stopPropagation()}
            >
              <Button type="button" size="sm" variant="outline" onClick={discardPositions} disabled={savingPositions}>
                Descartar
              </Button>
              <Button type="button" size="sm" onClick={savePositions} disabled={savingPositions}>
                {savingPositions ? "Guardando" : "Guardar posición"}
              </Button>
            </div>
          )}

          {createPoint && (
            <div
              className="absolute right-4 top-4 z-30 w-[min(330px,calc(100%-2rem))]"
              onClick={(event) => event.stopPropagation()}
            >
              <CreateZoneForm
                key={createPoint.key}
                point={createPoint}
                action={createZoneAction}
                onClose={() => setCreatePoint(null)}
                onCreated={selectCreatedZone}
              />
            </div>
          )}

          {createPoint && (
            <div
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${createPoint.x}%`, top: `${createPoint.y}%` }}
            >
              <div className="relative flex size-14 items-center justify-center rounded-full bg-white/90">
                <span className="absolute inset-[-9px] rounded-full border border-primary/30" />
                <Crosshair className="size-6 text-primary" />
              </div>
            </div>
          )}

          {mapPoints.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="max-w-sm rounded-[1.5rem] bg-white/90 p-6">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MapPin className="size-6" />
                </div>
                <p className="mt-4 text-sm font-semibold">Presiona el mapa para empezar</p>
                <p className="mt-2 text-sm text-muted-foreground">El primer punto abrirá el formulario para crear una zona.</p>
              </div>
            </div>
          ) : (
            mapPoints.map((point) => (
              <button
                key={point.id}
                type="button"
                onPointerDown={(event) => startDragging(event, point)}
                onPointerMove={dragPoint}
                onPointerUp={(event) => stopDragging(event, point)}
                onPointerCancel={(event) => stopDragging(event, point)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  selectZone(point);
                }}
                className="absolute z-10 touch-none -translate-x-1/2 -translate-y-1/2 cursor-grab text-left outline-none transition hover:z-20 hover:scale-105 focus:z-20 focus:scale-105 active:cursor-grabbing"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                <div className="relative mx-auto flex size-14 items-center justify-center">
                  <span className={`absolute inset-0 rounded-full ${activeZoneId === point.id ? "bg-primary/15" : "bg-slate-900/10"}`} />
                  <div className={`relative flex size-11 items-center justify-center rounded-2xl ${activeZoneId === point.id ? "bg-primary text-primary-foreground" : "bg-slate-900 text-white"}`}>
                    <Building2 className="size-5" />
                  </div>
                </div>
                <div className={`mt-1 min-w-40 rounded-2xl px-3 py-2 text-center text-xs backdrop-blur ${activeZoneId === point.id ? "bg-primary text-primary-foreground" : "bg-white/90 text-slate-800"}`}>
                  <p className="truncate font-semibold">{point.name}</p>
                  <p className="mt-0.5 truncate text-[10px] opacity-70">{point.building} · {point.signal}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <BuildingDirectory
        groups={visibleGroups}
        query={query}
        onQueryChange={setQuery}
        activeBuilding={activeBuilding}
        onSelectBuilding={selectBuilding}
        updateZoneAction={updateZoneAction}
      />
    </div>
  );
}

function MapArtwork() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,75,90,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(15,75,90,0.07)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.75),transparent_20%),radial-gradient(circle_at_78%_72%,rgba(0,144,184,0.13),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.4),transparent_45%)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 680" preserveAspectRatio="none" aria-hidden="true">
        <path d="M80 470 C210 410 315 520 435 455 C580 376 690 430 920 340" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="34" strokeLinecap="round" />
        <path d="M95 458 C225 398 318 505 430 442 C575 363 690 416 913 326" fill="none" stroke="rgba(0,116,148,0.16)" strokeWidth="2" strokeDasharray="10 14" />
        <path d="M280 80 C340 190 310 275 420 360 C520 438 600 480 642 620" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="28" strokeLinecap="round" />
        <path d="M300 95 C352 196 325 274 430 350 C528 420 610 470 655 604" fill="none" stroke="rgba(0,116,148,0.14)" strokeWidth="2" strokeDasharray="10 14" />
        <path d="M112 132 C188 82 285 100 330 162 C375 225 328 292 240 288 C140 284 42 210 112 132Z" fill="rgba(0,116,148,0.08)" />
        <path d="M690 105 C780 70 910 118 935 210 C960 306 835 345 742 302 C656 262 610 138 690 105Z" fill="rgba(0,116,148,0.1)" />
        <path d="M120 555 C220 500 350 545 372 626 L92 626 C76 602 82 576 120 555Z" fill="rgba(15,75,90,0.07)" />
        <rect x="430" y="145" width="160" height="82" rx="24" fill="rgba(255,255,255,0.42)" stroke="rgba(255,255,255,0.75)" />
        <rect x="606" y="248" width="118" height="72" rx="22" fill="rgba(255,255,255,0.38)" stroke="rgba(255,255,255,0.68)" />
        <rect x="165" y="330" width="140" height="76" rx="24" fill="rgba(255,255,255,0.38)" stroke="rgba(255,255,255,0.68)" />
      </svg>
      <div className="absolute bottom-5 left-5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 backdrop-blur">
        Coordenadas internas 0 a 100
      </div>
    </>
  );
}

function CreateZoneForm({
  point,
  action,
  onClose,
  onCreated,
}: {
  point: CreatePoint;
  action: CreateZoneAction;
  onClose: () => void;
  onCreated: (zone: CampusZone | void, formData: FormData) => void;
}) {
  async function submit(formData: FormData) {
    const zone = await action(formData);
    onCreated(zone, formData);
  }

  return (
    <form action={submit} className="rounded-2xl border border-[#e7f0f2] bg-white/95 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Nuevo punto</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight">Crear zona aquí</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        <TextField label="Edificio" name="building" required autoFocus />
        <TextField label="Zona" name="name" required />
      </div>
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-primary">Agregar piso, tipo o ajustar coordenadas</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField label="Piso" name="floor" />
          <TextField label="Tipo de área" name="area_type" />
          <TextField label="Latitud" name="latitude" type="number" step="any" defaultValue={point.latitude} />
          <TextField label="Longitud" name="longitude" type="number" step="any" defaultValue={point.longitude} />
        </div>
      </details>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[11px] text-muted-foreground">
          Punto {point.x.toFixed(1)}%, {point.y.toFixed(1)}%
        </span>
        <Button type="submit" size="sm">
          <Plus className="size-3.5" />
          Crear
        </Button>
      </div>
    </form>
  );
}

function BuildingDirectory({
  groups,
  query,
  activeBuilding,
  onQueryChange,
  onSelectBuilding,
  updateZoneAction,
}: {
  groups: BuildingGroup[];
  query: string;
  activeBuilding: string | null;
  onQueryChange: (query: string) => void;
  onSelectBuilding: (building: string) => void;
  updateZoneAction: UpdateZoneAction;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">Directorio</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Zonas registradas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Lista limpia por edificio. Abre una fila solo cuando necesites editar.</p>
        </div>
        <div className="relative w-full xl:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar edificio, zona, piso o tipo..."
            className="h-11 w-full rounded-2xl border border-input bg-white pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">No hay zonas que coincidan con la búsqueda.</p>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-[#e7f0f2] bg-white/90">
          {groups.map((group) => (
            <section key={group.building} className="border-b border-slate-100 last:border-b-0">
              <button
                type="button"
                onClick={() => onSelectBuilding(group.building)}
                className={`flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition ${activeBuilding === group.building ? "bg-primary/5" : "hover:bg-slate-50"}`}
              >
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold tracking-tight">{group.building}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.zones.length} zonas · {group.geoLocated} en mapa
                    {group.floors.length > 0 ? ` · Pisos ${group.floors.join(", ")}` : ""}
                  </p>
                </div>
                <MapPin className="size-4 shrink-0 text-primary" />
              </button>

              <div className="divide-y divide-slate-100 px-5 pb-4">
                {group.zones.map((zone) => (
                  <ZoneEditor key={zone.id} zone={zone} action={updateZoneAction} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function ZoneEditor({ zone, action }: { zone: CampusZone; action: UpdateZoneAction }) {
  return (
    <details className="group py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{zone.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {zone.floor || "Sin piso"} · {zone.area_type || "Sin tipo"} · {hasLocalCoordinates(zone) ? `${zone.longitude.toFixed(1)}%, ${(100 - zone.latitude).toFixed(1)}%` : "Sin punto en mapa"}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition group-open:text-primary">
          <Pencil className="size-3" />
          Editar
        </span>
      </summary>

      <form action={action} className="mt-4 rounded-2xl bg-slate-50 p-4">
        <input type="hidden" name="zone_id" value={zone.id} />
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="Edificio" name="building" defaultValue={zone.building} required />
          <TextField label="Zona" name="name" defaultValue={zone.name} required />
          <TextField label="Piso" name="floor" defaultValue={zone.floor ?? ""} />
          <TextField label="Tipo" name="area_type" defaultValue={zone.area_type ?? ""} />
          <TextField label="Latitud" name="latitude" type="number" step="any" defaultValue={zone.latitude ?? ""} />
          <TextField label="Longitud" name="longitude" type="number" step="any" defaultValue={zone.longitude ?? ""} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="truncate text-xs text-muted-foreground">ID: {zone.id}</span>
          <Button type="submit" size="sm" variant="outline">
            Guardar
          </Button>
        </div>
      </form>
    </details>
  );
}

function MetricStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 text-primary" />
      <div>
        <p className="text-2xl font-semibold leading-none tabular-nums text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function TextField({
  label,
  name,
  type = "text",
  required = false,
  step,
  defaultValue,
  autoFocus = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
  defaultValue?: string | number;
  autoFocus?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        className="h-9 w-full min-w-0 rounded-xl border border-input bg-white px-3 text-sm font-normal text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </label>
  );
}

function groupZonesByBuilding(zones: CampusZone[]) {
  return zones.reduce<Record<string, CampusZone[]>>((groups, zone) => {
    const building = zone.building || "Sin edificio";
    groups[building] = [...(groups[building] ?? []), zone];
    return groups;
  }, {});
}

function createBuildingGroups(zonesByBuilding: Record<string, CampusZone[]>): BuildingGroup[] {
  return Object.entries(zonesByBuilding)
    .map(([building, zones]) => ({
      building,
      zones,
      floors: uniqueValues(zones.map((zone) => zone.floor)),
      areaTypes: uniqueValues(zones.map((zone) => zone.area_type)),
      geoLocated: zones.filter(hasLocalCoordinates).length,
    }))
    .sort((left, right) => left.building.localeCompare(right.building, "es"));
}

function createZoneMapPoints(zones: CampusZone[], draftPositions: Record<string, MapPosition>): ZoneMapPoint[] {
  return zones.map((zone, index) => {
    const fallback = fallbackPosition(index, zones.length);
    const savedPosition = hasLocalCoordinates(zone)
      ? { x: clamp(zone.longitude, 4, 96), y: clamp(100 - zone.latitude, 6, 94) }
      : fallback;
    const position = draftPositions[zone.id] ?? savedPosition;

    return {
      id: zone.id,
      building: zone.building || "Sin edificio",
      name: zone.name,
      floor: zone.floor,
      areaType: zone.area_type,
      ...position,
      signal: hasLocalCoordinates(zone) ? "Mapa" : "Referencia",
    };
  });
}

function filterGroups(groups: BuildingGroup[], query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return groups;

  return groups
    .map((group) => ({
      ...group,
      zones: group.zones.filter((zone) =>
        normalize([zone.building, zone.name, zone.floor, zone.area_type, zone.id].join(" ")).includes(normalizedQuery),
      ),
    }))
    .filter((group) => group.zones.length > 0 || normalize(group.building).includes(normalizedQuery));
}

function fallbackPosition(index: number, total: number) {
  const positions = [
    { x: 22, y: 28 },
    { x: 50, y: 22 },
    { x: 76, y: 34 },
    { x: 32, y: 58 },
    { x: 62, y: 62 },
    { x: 84, y: 54 },
    { x: 18, y: 74 },
    { x: 48, y: 80 },
  ];

  if (index < positions.length) return positions[index];

  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;

  return {
    x: 50 + Math.cos(angle) * 34,
    y: 52 + Math.sin(angle) * 30,
  };
}

function hasCoordinates(zone: CampusZone): zone is GeoZone {
  return (
    typeof zone.latitude === "number" &&
    Number.isFinite(zone.latitude) &&
    typeof zone.longitude === "number" &&
    Number.isFinite(zone.longitude)
  );
}

function hasLocalCoordinates(zone: CampusZone): zone is GeoZone {
  return hasCoordinates(zone) && isLocalCoordinate(zone.latitude) && isLocalCoordinate(zone.longitude);
}

function uniqueValues(values: Array<string | null>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatCoordinate(value: number) {
  return Number(value.toFixed(6)).toString();
}

function isLocalCoordinate(value: number) {
  return value >= 0 && value <= 100;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
