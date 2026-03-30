import { AlertTriangle } from "lucide-react";

export default function MantenimientoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border/50 pb-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <AlertTriangle className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Mantenimiento
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión de incidencias y mantenimiento del campus
          </p>
        </div>
      </div>
    </div>
  );
}
