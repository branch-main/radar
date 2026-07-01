import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { softIconClass } from "./dashboard-calculations";
import { Panel, PanelTitle, SoftRow } from "./shared";
import type { QueueItem } from "./types";

export function ActionQueue({ queue }: { queue: QueueItem[] }) {
  return (
    <Panel>
      <PanelTitle
        eyebrow="Prioridad ahora"
        title="Qué atender primero"
        action={
          <span className="rounded-lg bg-muted/45 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {queue.length}
          </span>
        }
      />

      {queue.length === 0 ? (
        <div className="rounded-lg bg-emerald-500/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Sin bloqueos críticos</p>
              <p className="mt-1 text-xs text-muted-foreground">No hay vencimientos, reclamos o coincidencias urgentes.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.slice(0, 5).map((item, index) => (
            <Link key={item.id} href={item.href} className="group block">
              <SoftRow className="flex items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-background text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${softIconClass(item.severity)}`}>
                  <item.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.detail}</span>
                </span>
                <ArrowRight className="mt-3 size-3.5 text-muted-foreground/45 transition-transform group-hover:translate-x-0.5" />
              </SoftRow>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}
