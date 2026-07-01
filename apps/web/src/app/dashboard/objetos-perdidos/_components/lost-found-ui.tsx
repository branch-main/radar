import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowUpRight, FilterX, Radar, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { badgeClass, statusLabel } from "@/lib/supabase/format";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export type SelectOption = {
  value: string;
  label: string;
};

const navItems = [
  { href: "/dashboard/objetos-perdidos", label: "Catálogo" },
  { href: "/dashboard/objetos-perdidos/matches", label: "Matches" },
  { href: "/dashboard/objetos-perdidos/entregas", label: "Entregas" },
];

export function paramValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback = "",
) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export function uniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
    .sort((left, right) => left.localeCompare(right, "es"))
    .map((value) => ({ value, label: statusLabel(value) }));
}

export function textMatches(query: string, values: Array<string | number | null | undefined>) {
  const cleanQuery = query.trim().toLocaleLowerCase("es");
  if (!cleanQuery) return true;
  const haystack = values
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLocaleLowerCase("es");
  return cleanQuery
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export function compareText(left: string | null | undefined, right: string | null | undefined) {
  return (left ?? "").localeCompare(right ?? "", "es");
}

export function PageHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  activePath,
  stats,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  activePath: string;
  stats: Array<{ label: string; value: string | number }>;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#e7f0f2] bg-[radial-gradient(circle_at_12%_10%,rgba(0,144,184,0.22),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(232,242,246,0.84))] p-5 dark:border-white/10 dark:bg-[radial-gradient(circle_at_12%_10%,rgba(0,165,212,0.28),transparent_34%),linear-gradient(135deg,rgba(22,34,48,0.98),rgba(15,26,36,0.92))] sm:p-6">
      <div className="absolute -right-16 -top-20 size-56 rounded-full border border-primary/20" />
      <div className="absolute -right-6 top-8 size-28 rounded-full border border-primary/20" />
      <div className="absolute bottom-0 right-0 h-px w-2/3 bg-gradient-to-l from-primary/40 to-transparent" />
      <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            <Icon className="size-3.5" />
            {eyebrow}
          </div>
          <h1 className="font-heading text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[390px]">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-[#e7f0f2] bg-white/78 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              activePath === item.href
                ? "bg-foreground text-background"
                : "border border-border bg-background/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function FilterPanel({
  action,
  query,
  placeholder,
  children,
  resultLabel,
}: {
  action: string;
  query: string;
  placeholder: string;
  children: ReactNode;
  resultLabel: string;
}) {
  return (
    <form action={action} className="rounded-[1.6rem] border border-[#e7f0f2] bg-white/88 p-3 backdrop-blur xl:sticky xl:top-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={query}
            placeholder={placeholder}
            className="h-11 w-full rounded-2xl border border-input bg-background/80 pl-10 pr-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
          />
        </label>
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Radar className="size-4 text-primary" />
          <span className="whitespace-nowrap font-medium">{resultLabel}</span>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button type="submit" size="sm">
          <Search className="size-3.5" />
          Aplicar filtros
        </Button>
        <Button size="sm" variant="outline" render={<Link href={action} />}>
          <FilterX className="size-3.5" />
          Limpiar
        </Button>
      </div>
    </form>
  );
}

export function SelectFilter({
  label,
  name,
  value,
  options,
  allLabel = "Todos",
}: {
  label: string;
  name: string;
  value: string;
  options: SelectOption[];
  allLabel?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <select
        name={name}
        defaultValue={value || "all"}
        className="h-10 rounded-xl border border-input bg-background/80 px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
      >
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone?: "primary" | "amber" | "emerald" | "slate";
}) {
  const tones = {
    primary: "from-primary/20 text-primary",
    amber: "from-amber-500/20 text-amber-700 dark:text-amber-300",
    emerald: "from-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    slate: "from-slate-500/15 text-slate-600 dark:text-slate-300",
  };

  return (
    <Card className="overflow-hidden border-[#e7f0f2] bg-white/88 py-0">
      <CardContent className="relative p-4">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tones[tone]} to-transparent`} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
              {value}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/60 p-2 text-muted-foreground">
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(value)}`}>
      {statusLabel(value)}
    </span>
  );
}

export function CrmTableShell({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-[#e7f0f2] bg-white/90 py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-[#e7f0f2] bg-muted/20 py-4">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
          {count} registros
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function CrmHeaderCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground ${className}`}>
      {children}
    </th>
  );
}

export function CrmCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 align-middle text-sm ${className}`}>
      {children}
    </td>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/25 px-5 py-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Search className="size-5" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function DetailLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button size="sm" variant="outline" render={<Link href={href} />}>
      {children}
      <ArrowUpRight className="size-3.5" />
    </Button>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
        <span>Señal</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-emerald-400"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
