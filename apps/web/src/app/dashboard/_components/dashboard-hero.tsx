import { ArrowRight, Package } from "lucide-react";
import Link from "next/link";

import { formatDateTime } from "@/lib/supabase/format";

import type { DashboardModel } from "./types";

export function DashboardHero({ model }: { model: DashboardModel }) {
  const { kpis, now } = model;

  return (
    <section className="space-y-4">
      <div className="min-w-0 rounded-2xl border border-[#e7f0f2] bg-[linear-gradient(135deg,#dae9eb_0%,#edf6f7_100%)] p-5 md:p-6">
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold tracking-[0.16em] text-primary uppercase">
            Centro de operaciones
          </span>
          <span className="text-muted-foreground sm:text-right">
            {formatDateTime(now.toISOString())}
          </span>
        </div>

        <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Panel de prioridad del campus
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Primero muestra lo que necesita decisión, luego contexto para mantenimiento, objetos perdidos y capacidad del equipo.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/dashboard/mantenimiento/incidencias"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Revisar incidencias
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/dashboard/objetos-perdidos/catalogo"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/60 px-4 text-sm font-medium transition-colors hover:bg-white/80"
          >
            Objetos perdidos
            <Package className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="group rounded-xl border border-[#e7f0f2] bg-white/78 p-4 transition-colors hover:bg-white/85"
          >
            <div>
              <p className="text-base tracking-tight text-foreground">{kpi.label}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tabular-nums tracking-tight">{kpi.value}</span>
                {kpi.suffix && <span className="text-sm text-muted-foreground">{kpi.suffix}</span>}
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{kpi.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
