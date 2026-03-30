import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  Package,
} from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";

const stats = [
  {
    label: "Incidencias abiertas",
    value: 12,
    change: -3,
    changeLabel: "vs. semana pasada",
    icon: AlertTriangle,
    href: "/dashboard/mantenimiento",
    iconClass: "text-amber-600",
  },
  {
    label: "Objetos sin reclamar",
    value: 34,
    change: 8,
    changeLabel: "nuevos esta semana",
    icon: Package,
    href: "/dashboard/objetos-perdidos",
  },
  {
    label: "Notificaciones",
    value: 5,
    change: 0,
    changeLabel: "pendientes hoy",
    icon: Bell,
    href: "/dashboard/notificaciones",
  },
  {
    label: "Tasa de resolución",
    value: 87,
    unit: "%",
    change: 4,
    changeLabel: "vs. mes pasado",
    icon: CheckCircle2,
    href: "/dashboard/mantenimiento",
  },
];

const recentActivity = [
  { id: 1, title: "Fuga de agua en baño 2do piso", location: "Edificio A, Planta 2", time: "Hace 25 min", status: "abierta" as const },
  { id: 2, title: "Laptop HP encontrada", location: "Biblioteca Central", time: "Hace 1 hora", status: "pendiente" as const },
  { id: 3, title: "Aire acondicionado sin funcionar", location: "Edificio C, Aula 301", time: "Hace 2 horas", status: "en_progreso" as const },
  { id: 4, title: "Mochila negra reclamada", location: "Cafetería Principal", time: "Hace 3 horas", status: "resuelta" as const },
  { id: 5, title: "Luminaria fundida en pasillo", location: "Edificio B, Planta 1", time: "Hace 4 horas", status: "abierta" as const },
  { id: 6, title: "Llaves con llavero azul", location: "Estacionamiento Norte", time: "Hace 5 horas", status: "pendiente" as const },
];

const statusConfig = {
  abierta: { label: "Abierta", class: "text-amber-700 bg-amber-500/10" },
  pendiente: { label: "Pendiente", class: "text-primary bg-primary/10" },
  en_progreso: { label: "En progreso", class: "text-blue-700 bg-blue-500/10" },
  resuelta: { label: "Resuelta", class: "text-emerald-700 bg-emerald-500/10" },
};

const priorityIncidents = [
  { title: "Fuga de agua en baño", assignee: "Carlos M.", building: "Edificio A" },
  { title: "A/C sin funcionar", assignee: "Laura P.", building: "Edificio C" },
  { title: "Luminaria fundida", assignee: "Sin asignar", building: "Edificio B" },
];

const quickActions = [
  { label: "Reportar incidencia", href: "/dashboard/mantenimiento", icon: AlertTriangle, iconClass: "text-amber-600" },
  { label: "Registrar objeto", href: "/dashboard/objetos-perdidos", icon: Package },
  { label: "Enviar notificación", href: "/dashboard/notificaciones", icon: Bell },
];

function AvatarPlaceholder() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      ?
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Panel de control
        </h1>
        <p className="text-xs tabular-nums text-muted-foreground">
          Última actualización: hace 2 min
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="gap-2 py-4 transition-shadow duration-200 group-hover:shadow-md group-hover:shadow-primary/5">
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-muted-foreground">
                    {stat.label}
                  </span>
                  <stat.icon className={`size-4 ${stat.iconClass ?? "text-muted-foreground/50"}`} />
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tabular-nums tracking-tight">
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="text-sm text-muted-foreground">
                      {stat.unit}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.change !== 0 && (
                    <span className={stat.change < 0 ? "text-emerald-600" : "text-foreground/60"}>
                      {stat.change > 0 ? "+" : ""}{stat.change}{" "}
                    </span>
                  )}
                  {stat.changeLabel}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
            <CardAction>
              <Link
                href="/dashboard/mantenimiento"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Ver todo
                <ArrowUpRight className="size-3" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {recentActivity.map((item) => {
              const status = statusConfig[item.status];
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="mt-0.5">
                    <AvatarPlaceholder />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.location}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${status.class}`}>
                      {status.label}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-2.5" />
                      {item.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Incidencias prioritarias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {priorityIncidents.map((incident) => (
                  <div key={incident.title} className="flex items-center gap-3">
                    <AvatarPlaceholder />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{incident.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {incident.building} · {incident.assignee}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group/link flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5 text-sm transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-2.5">
                      <action.icon className={`size-4 ${action.iconClass ?? "text-muted-foreground/50"}`} />
                      <span>{action.label}</span>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover/link:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
