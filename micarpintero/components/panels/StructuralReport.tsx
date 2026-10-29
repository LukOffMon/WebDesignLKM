'use client';

import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CheckSeverity, FurnitureModel } from '@/types/carpentry';

const STYLE: Readonly<Record<CheckSeverity, { icon: typeof CheckCircle2; ring: string; text: string; bar: string; label: string }>> = {
  ok: { icon: CheckCircle2, ring: 'ring-green-200 bg-green-50/50', text: 'text-green-700', bar: 'bg-green-500', label: 'Correcto' },
  warning: { icon: AlertTriangle, ring: 'ring-amber-200 bg-amber-50/60', text: 'text-amber-700', bar: 'bg-amber-500', label: 'Atención' },
  critical: { icon: AlertOctagon, ring: 'ring-red-200 bg-red-50/60', text: 'text-red-700', bar: 'bg-red-500', label: 'Crítico' },
};

export function StructuralReport({ model, onSelectPanel }: { model: FurnitureModel; onSelectPanel: (id: string | null) => void }) {
  const counts = model.checks.reduce<Record<CheckSeverity, number>>(
    (acc, c) => ({ ...acc, [c.severity]: acc[c.severity] + 1 }),
    { ok: 0, warning: 0, critical: 0 },
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        {(['critical', 'warning', 'ok'] as const).map((s) => (
          <span key={s} className={cn('rounded-full px-2.5 py-1 ring-1', STYLE[s].ring, STYLE[s].text)}>
            {counts[s]} {STYLE[s].label.toLowerCase()}
          </span>
        ))}
      </div>
      <ul className="space-y-2">
        {model.checks.map((check) => {
          const style = STYLE[check.severity];
          const Icon = style.icon;
          const ratio = check.limit > 0 ? Math.min(1.6, check.value / check.limit) : 0;
          return (
            <li key={check.id}>
              <button
                type="button"
                disabled={!check.panelId}
                onClick={() => onSelectPanel(check.panelId)}
                className={cn('w-full rounded-xl p-3 text-left ring-1 transition enabled:hover:shadow-sm', style.ring)}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style.text)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-900">{check.title}</p>
                      <span className={cn('text-[11px] font-bold uppercase tracking-wide', style.text)}>{style.label}</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-stone-600">{check.message}</p>
                    {check.kind === 'shelf-deflection' && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200" aria-hidden>
                        <div className={cn('h-full rounded-full', style.bar)} style={{ width: `${(ratio / 1.6) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] leading-relaxed text-stone-500">
        Flecha según Euler-Bernoulli para viga simplemente apoyada con carga uniforme: δ = 5·w·L⁴ / (384·E·I), con I = b·h³/12, más
        fluencia a largo plazo (factor del material). Límite recomendado: claro/200. Es una guía de diseño, no sustituye el criterio de un
        profesional.
      </p>
    </div>
  );
}
