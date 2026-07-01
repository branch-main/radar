import { healthScoreLabel, healthScoreTone } from "./dashboard-calculations";
import { Panel, PanelTitle } from "./shared";

export function OperationalHealth({
  healthScore,
  riskCount,
  resolutionRate,
}: {
  healthScore: number;
  riskCount: number;
  resolutionRate: number;
}) {
  return (
    <Panel className="flex h-full flex-col bg-card/75">
      <PanelTitle eyebrow="Estado" title="Salud operativa" />

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={`text-sm font-medium ${healthScoreTone(healthScore)}`}>
            {healthScoreLabel(healthScore)}
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">
            {healthScore}
            <span className="ml-1 text-sm font-medium text-muted-foreground">/100</span>
          </p>
        </div>
        <p className="max-w-36 text-right text-xs leading-5 text-muted-foreground">
          SLA, criticidad, asignaciones y reclamos.
        </p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted/70">
        <div className="h-full rounded-full bg-primary" style={{ width: `${healthScore}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-2 rounded-lg bg-muted/45 p-3">
        <HealthMiniMetric label="Riesgo" value={riskCount} helper="señales" />
        <div className="border-l border-border pl-4">
          <HealthMiniMetric label="Cierre" value={`${resolutionRate}%`} helper="resolución" />
        </div>
      </div>
    </Panel>
  );
}

function HealthMiniMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{helper}</p>
    </div>
  );
}
