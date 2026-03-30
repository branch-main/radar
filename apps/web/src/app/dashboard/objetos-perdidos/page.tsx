import { Package } from "lucide-react";

export default function ObjetosPerdidosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border/50 pb-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Package className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Objetos Perdidos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión de objetos perdidos y encontrados
          </p>
        </div>
      </div>
    </div>
  );
}
