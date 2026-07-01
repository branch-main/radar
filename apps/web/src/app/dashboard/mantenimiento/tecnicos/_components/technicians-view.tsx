"use client";

import {
  CheckCircle2,
  CircleOff,
  ClipboardList,
  FilterX,
  Mail,
  Search,
  UserCog,
  UsersRound,
  Wrench,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";

import {
  createTechnicianAction,
  updateTechnicianAction,
} from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import type {
  MaintenanceCategory,
  MaintenanceIncident,
  Profile,
  Technician,
} from "@/lib/supabase/types";

type Option = readonly [string, string];
type StatusFilter = "all" | "active" | "inactive";
type SortMode = "workload" | "name" | "newest" | "specialty";
type Workload = {
  total: number;
  open: number;
  critical: number;
  overdue: number;
  resolved: number;
};
type TechnicianRow = {
  technician: Technician;
  name: string;
  email: string;
  role: string;
  specialty: string;
  haystack: string;
  workload: Workload;
};

type TechniciansViewProps = {
  technicians: Technician[];
  profiles: Profile[];
  incidents: MaintenanceIncident[];
  renderedAt: string;
};

const specialtyOptions = [
  ["", "General"],
  ["electrical", "Eléctrico"],
  ["plumbing", "Gasfitería"],
  ["cleaning", "Limpieza"],
  ["hvac", "Climatización"],
  ["infrastructure", "Infraestructura"],
  ["security", "Seguridad"],
  ["other", "Otro"],
] satisfies Array<readonly [MaintenanceCategory | "", string]>;

const specialtyLabels = Object.fromEntries(specialtyOptions) as Record<string, string>;
const closedStatuses = new Set(["resolved", "closed", "cancelled"]);

export function TechniciansView({ technicians, profiles, incidents, renderedAt }: TechniciansViewProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [specialty, setSpecialty] = useState("all");
  const [sort, setSort] = useState<SortMode>("workload");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);

  const now = useMemo(() => new Date(renderedAt), [renderedAt]);
  const availableProfiles = useMemo(
    () => profiles.filter((profile) => !technicians.some((technician) => technician.id === profile.id)),
    [profiles, technicians],
  );
  const workloadByTechnician = useMemo(() => createWorkloadMap(incidents, now), [incidents, now]);
  const normalizedQuery = normalize(query);

  const activeTechnicians = technicians.filter((technician) => technician.active);
  const inactiveTechnicians = technicians.filter((technician) => !technician.active);
  const openAssigned = Array.from(workloadByTechnician.values()).reduce((sum, workload) => sum + workload.open, 0);
  const maxOpenLoad = Math.max(...Array.from(workloadByTechnician.values()).map((workload) => workload.open), 1);

  const rows = useMemo<TechnicianRow[]>(
    () =>
      technicians
        .map((technician) => {
          const name = technicianName(technician);
          const email = technician.profiles?.email ?? "Sin correo";
          const role = roleLabel(technician.profiles?.role);
          const specialtyText = specialtyLabel(technician.specialty);
          const workload = workloadByTechnician.get(technician.id) ?? emptyWorkload();
          const haystack = normalize(
            [
              technician.id,
              name,
              email,
              role,
              specialtyText,
              technician.active ? "activo" : "inactivo",
            ].join(" "),
          );

          return { technician, name, email, role, specialty: specialtyText, haystack, workload };
        })
        .filter((row) => {
          if (normalizedQuery && !row.haystack.includes(normalizedQuery)) return false;
          if (status === "active" && !row.technician.active) return false;
          if (status === "inactive" && row.technician.active) return false;
          if (specialty !== "all" && (row.technician.specialty ?? "") !== specialty) return false;
          return true;
        })
        .sort((left, right) => sortTechnicians(left, right, sort)),
    [normalizedQuery, sort, specialty, status, technicians, workloadByTechnician],
  );

  const selectedRow = rows.find((row) => row.technician.id === selectedTechnicianId) ?? rows[0] ?? null;
  const selectedTechnician = selectedRow?.technician ?? null;
  const hasFilters = Boolean(query || status !== "all" || specialty !== "all" || sort !== "workload");

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setSpecialty("all");
    setSort("workload");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-[#e7f0f2] bg-[linear-gradient(135deg,#f8fcfd_0%,#edf8fa_54%,#dbeff2_100%)] p-6">
        <div className="absolute -right-24 -top-28 size-80 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 size-64 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              <UserCog className="size-3.5" />
              CRM técnico
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Técnicos</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Directorio operativo para ver disponibilidad, carga de incidencias y editar el equipo desde un panel lateral.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Activos" value={activeTechnicians.length} icon={CheckCircle2} tone="emerald" />
            <MetricCard label="Inactivos" value={inactiveTechnicians.length} icon={CircleOff} tone="slate" />
            <MetricCard label="Incidencias abiertas" value={openAssigned} icon={ClipboardList} tone="blue" />
            <MetricCard label="Perfiles libres" value={availableProfiles.length} icon={UsersRound} tone="amber" />
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, correo, especialidad, rol o ID..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SelectControl
              value={status}
              onChange={(value) => setStatus(value as StatusFilter)}
              options={[
                ["all", "Estado"],
                ["active", "Activos"],
                ["inactive", "Inactivos"],
              ]}
            />
            <SelectControl
              value={specialty}
              onChange={setSpecialty}
              options={[["all", "Especialidad"], ...specialtyOptions]}
            />
            <SelectControl
              value={sort}
              onChange={(value) => setSort(value as SortMode)}
              options={[
                ["workload", "Más carga"],
                ["name", "Nombre"],
                ["newest", "Más recientes"],
                ["specialty", "Especialidad"],
              ]}
            />
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="h-12 rounded-2xl border-slate-200 bg-white"
            >
              <FilterX className="size-4" />
              Limpiar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_420px]">
          <div className="overflow-hidden rounded-[1.75rem] border border-[#e7f0f2] bg-white/90">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">Directorio</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">{rows.length} técnicos encontrados</h2>
              </div>
              <p className="text-xs text-muted-foreground">Carga máxima actual: {maxOpenLoad} abiertas</p>
            </div>

            {rows.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-muted-foreground">
                  <Wrench className="size-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">Sin resultados</h3>
                <p className="mt-1 text-sm text-muted-foreground">Ajusta los filtros o registra un nuevo técnico.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1080px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Técnico</th>
                      <th className="px-4 py-3 font-semibold">Especialidad</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 font-semibold">Carga CRM</th>
                      <th className="px-4 py-3 font-semibold">Riesgo</th>
                      <th className="px-4 py-3 font-semibold">Alta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => {
                      const isSelected = selectedTechnician?.id === row.technician.id;
                      const loadPercent = Math.max(8, Math.round((row.workload.open / maxOpenLoad) * 100));

                      return (
                        <tr key={row.technician.id} className={isSelected ? "bg-primary/5" : "transition hover:bg-slate-50"}>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => setSelectedTechnicianId(row.technician.id)}
                              className="flex min-w-0 items-center gap-3 text-left outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                            >
                              <Avatar name={row.name} active={row.technician.active} />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-foreground">{row.name}</span>
                                <span className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <Mail className="size-3" />
                                  {row.email}
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                              {row.specialty}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={row.technician.active ? activeBadgeClass : inactiveBadgeClass}>
                              {row.technician.active ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="min-w-40">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{row.workload.open} abiertas</span>
                                <span>{row.workload.total} total</span>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${loadPercent}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              <RiskBadge label={`${row.workload.critical} críticas`} active={row.workload.critical > 0} tone="amber" />
                              <RiskBadge label={`${row.workload.overdue} vencidas`} active={row.workload.overdue > 0} tone="red" />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-xs text-muted-foreground">
                            {formatDate(row.technician.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <div className="overflow-hidden rounded-[1.75rem] border border-[#e7f0f2] bg-white/90">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">Ficha técnica</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">
                  {selectedRow ? selectedRow.name : "Selecciona un técnico"}
                </h2>
              </div>

              {selectedRow && selectedTechnician ? (
                <div className="space-y-5 p-5">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={selectedRow.name} active={selectedTechnician.active} large />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-foreground">{selectedRow.name}</h3>
                          <span className={selectedTechnician.active ? activeBadgeClass : inactiveBadgeClass}>
                            {selectedTechnician.active ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{selectedRow.email}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Rol: {selectedRow.role}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat label="Abiertas" value={selectedRow.workload.open} />
                    <MiniStat label="Críticas" value={selectedRow.workload.critical} />
                    <MiniStat label="Vencidas" value={selectedRow.workload.overdue} />
                  </div>

                  <form key={selectedTechnician.id} action={updateTechnicianAction} className="space-y-4 rounded-2xl border border-slate-100 p-4">
                    <input type="hidden" name="technician_id" value={selectedTechnician.id} />
                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Especialidad</label>
                      <select
                        name="specialty"
                        defaultValue={selectedTechnician.specialty ?? ""}
                        className="h-10 rounded-xl border border-input bg-white px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      >
                        {specialtyOptions.map(([value, label]) => (
                          <option key={value || "general"} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex h-10 items-center justify-between rounded-xl border border-input px-3 text-sm text-muted-foreground">
                      <span>Disponible para asignación</span>
                      <input
                        type="checkbox"
                        name="active"
                        value="true"
                        defaultChecked={selectedTechnician.active}
                        className="size-4 accent-primary"
                      />
                    </label>

                    <Button type="submit" size="lg" className="h-10 w-full rounded-xl">
                      Guardar cambios
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="p-5 text-sm text-muted-foreground">No hay técnicos registrados todavía.</div>
              )}
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-[#e7f0f2] bg-white/90">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">Alta rápida</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">Agregar técnico</h2>
              </div>
              <form action={createTechnicianAction} className="space-y-4 p-5">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Perfil</label>
                  <select
                    name="profile_id"
                    required
                    disabled={availableProfiles.length === 0}
                    className="h-10 rounded-xl border border-input bg-white px-3 text-sm text-foreground outline-none transition disabled:opacity-50 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">Selecciona un perfil</option>
                    {availableProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profileLabel(profile)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Especialidad</label>
                  <select
                    name="specialty"
                    defaultValue=""
                    className="h-10 rounded-xl border border-input bg-white px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    {specialtyOptions.map(([value, label]) => (
                      <option key={value || "general"} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button type="submit" size="lg" disabled={availableProfiles.length === 0} className="h-10 w-full rounded-xl">
                  Crear técnico
                </Button>

                {availableProfiles.length === 0 && (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Todos los perfiles registrados ya están asociados a técnicos.
                  </p>
                )}
              </form>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone: "emerald" | "slate" | "blue" | "amber";
}) {
  const toneClass = {
    emerald: "bg-emerald-500/10 text-emerald-700",
    slate: "bg-slate-500/10 text-slate-700",
    blue: "bg-blue-500/10 text-blue-700",
    amber: "bg-amber-500/10 text-amber-700",
  }[tone];

  return (
    <div className="min-w-36 rounded-2xl border border-[#e7f0f2] bg-white/78 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`flex size-8 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function SelectControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue || "general"} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Avatar({ name, active, large = false }: { name: string; active: boolean; large?: boolean }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "T";

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#e8f8fb,#cdeef4)] font-semibold text-primary ${
        large ? "size-14 text-base" : "size-11 text-sm"
      }`}
    >
      {initials}
      <span
        className={`absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white ${
          active ? "bg-emerald-500" : "bg-slate-300"
        }`}
      />
    </span>
  );
}

function RiskBadge({
  label,
  active,
  tone,
}: {
  label: string;
  active: boolean;
  tone: "amber" | "red";
}) {
  const activeClass = tone === "amber" ? "bg-amber-500/10 text-amber-700" : "bg-red-500/10 text-red-700";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${active ? activeClass : "bg-slate-100 text-slate-500"}`}>
      {label}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function createWorkloadMap(incidents: MaintenanceIncident[], now: Date) {
  const map = new Map<string, Workload>();

  for (const incident of incidents) {
    if (!incident.assigned_to) continue;

    const workload = map.get(incident.assigned_to) ?? emptyWorkload();
    const status = incident.reports?.status ?? "classified";
    const isClosed = closedStatuses.has(status);

    workload.total += 1;
    if (isClosed) {
      workload.resolved += 1;
    } else {
      workload.open += 1;
      if (incident.urgency === "critical") workload.critical += 1;
      if (isOverdue(incident.due_at, now)) workload.overdue += 1;
    }

    map.set(incident.assigned_to, workload);
  }

  return map;
}

function emptyWorkload(): Workload {
  return { total: 0, open: 0, critical: 0, overdue: 0, resolved: 0 };
}

function sortTechnicians(left: TechnicianRow, right: TechnicianRow, sort: SortMode) {
  if (sort === "workload") {
    return right.workload.open - left.workload.open || left.name.localeCompare(right.name, "es");
  }
  if (sort === "newest") {
    return new Date(right.technician.created_at).getTime() - new Date(left.technician.created_at).getTime();
  }
  if (sort === "specialty") {
    return left.specialty.localeCompare(right.specialty, "es") || left.name.localeCompare(right.name, "es");
  }
  return left.name.localeCompare(right.name, "es");
}

function isOverdue(value: string | null, now: Date) {
  if (!value) return false;
  return new Date(value).getTime() < now.getTime();
}

function technicianName(technician: Technician) {
  return technician.profiles?.full_name || technician.profiles?.email || technician.id;
}

function profileLabel(profile: Profile) {
  const name = profile.full_name || profile.email;
  return `${name} · ${roleLabel(profile.role)}`;
}

function roleLabel(role?: string) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    technician: "Técnico",
    student: "Estudiante",
  };
  return labels[role ?? ""] ?? "Sin rol";
}

function specialtyLabel(value: string | null) {
  return specialtyLabels[value ?? ""] ?? value ?? "General";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const activeBadgeClass =
  "inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700";
const inactiveBadgeClass =
  "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500";
