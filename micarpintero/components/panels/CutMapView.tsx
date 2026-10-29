'use client';

import { AlertTriangle } from 'lucide-react';
import { getMaterial } from '@/lib/engine/materials';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import { NumberField } from '@/components/ui/NumberField';
import { SwitchField } from '@/components/ui/Switch';
import { useConfigurator } from '@/store/useConfigurator';
import type { CutPlan, CutSheet } from '@/types/carpentry';

function SheetSvg({ sheet, selectedPanelId, onSelectPanel }: {
  sheet: CutSheet;
  selectedPanelId: string | null;
  onSelectPanel: (id: string | null) => void;
}) {
  const material = getMaterial(sheet.materialId);
  const fontBase = Math.max(sheet.sheetLength, sheet.sheetWidth) / 60;
  return (
    <svg
      viewBox={`-20 -20 ${sheet.sheetLength + 40} ${sheet.sheetWidth + 40}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Tablero ${sheet.index} de ${material.name}`}
    >
      <defs>
        <pattern id={`offcut-${sheet.id}`} width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="40" stroke="#84cc16" strokeWidth="6" strokeOpacity="0.35" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={sheet.sheetLength} height={sheet.sheetWidth} fill="#f5efe6" stroke="#44403c" strokeWidth={4} />
      {sheet.trim > 0 && (
        <rect
          x={sheet.trim}
          y={sheet.trim}
          width={sheet.sheetLength - 2 * sheet.trim}
          height={sheet.sheetWidth - 2 * sheet.trim}
          fill="none"
          stroke="#a8a29e"
          strokeWidth={2}
          strokeDasharray="12 10"
        />
      )}
      {sheet.freeRects
        .filter((r) => r.w >= 100 && r.h >= 100)
        .map((r) => (
          <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={`url(#offcut-${sheet.id})`}>
            <title>{`Retazo ${Math.round(r.w)} × ${Math.round(r.h)} mm`}</title>
          </rect>
        ))}
      {sheet.placements.map((p) => {
        const selected = p.part.panelId === selectedPanelId;
        const showDims = p.w > fontBase * 7 && p.h > fontBase * 2.6;
        const codeSize = Math.min(fontBase * 1.4, p.h * 0.45, p.w * 0.3);
        return (
          <g key={p.part.id} className="cursor-pointer" onClick={() => onSelectPanel(selected ? null : p.part.panelId)}>
            <rect
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              fill={selected ? '#fde68a' : '#ffffff'}
              stroke={selected ? '#b45309' : '#57534e'}
              strokeWidth={selected ? 6 : 2.5}
            />
            <title>{`${p.part.code} · ${p.part.label} · ${p.part.length} × ${p.part.width} mm${p.rotated ? ' (girada)' : ''}`}</title>
            {codeSize > 8 && (
              <text
                x={p.x + p.w / 2}
                y={p.y + p.h / 2 - (showDims ? codeSize * 0.15 : -codeSize * 0.35)}
                textAnchor="middle"
                fontSize={codeSize}
                fontWeight={700}
                fill="#1c1917"
                fontFamily="ui-monospace, monospace"
              >
                {p.part.code}
              </text>
            )}
            {showDims && (
              <text x={p.x + p.w / 2} y={p.y + p.h / 2 + fontBase * 1.1} textAnchor="middle" fontSize={fontBase * 0.8} fill="#78716c">
                {p.part.length} × {p.part.width}
              </text>
            )}
          </g>
        );
      })}
      {sheet.cuts.map((c, i) => (
        <line
          key={i}
          x1={c.x}
          y1={c.y}
          x2={c.orientation === 'horizontal' ? c.x + c.length : c.x}
          y2={c.orientation === 'vertical' ? c.y + c.length : c.y}
          stroke="#dc2626"
          strokeWidth={2}
          strokeDasharray="14 10"
          opacity={0.7}
          pointerEvents="none"
        />
      ))}
    </svg>
  );
}

export function CutMapView({ plan, selectedPanelId, onSelectPanel }: {
  plan: CutPlan;
  selectedPanelId: string | null;
  onSelectPanel: (id: string | null) => void;
}) {
  const optimizer = useConfigurator((s) => s.optimizer);
  const setOptimizer = useConfigurator((s) => s.setOptimizer);
  const unplaced = plan.materials.flatMap((m) => m.unplaced);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200 sm:grid-cols-3">
        <NumberField label="Kerf (disco)" unit="mm" step={0.1} min={0} max={8} value={optimizer.kerf} onChange={(kerf) => setOptimizer({ kerf: Math.round(kerf * 10) / 10 })} />
        <NumberField label="Refilado por lado" unit="mm" step={1} min={0} max={30} value={optimizer.trim} onChange={(trim) => setOptimizer({ trim })} />
        <div className="flex items-end pb-1">
          <SwitchField
            label="Permitir girar piezas"
            description="Solo en tableros sin veta"
            checked={optimizer.allowRotation}
            onChange={(allowRotation) => setOptimizer({ allowRotation })}
          />
        </div>
      </div>

      {unplaced.length > 0 && (
        <div className="flex gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{unplaced.length} pieza(s) no caben en un tablero estándar</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
              {unplaced.map((u) => (
                <li key={u.part.id}>
                  <span className="font-mono font-bold">{u.part.code}</span> {u.part.label}: {u.reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {plan.materials.map((mp) => {
        const material = getMaterial(mp.materialId);
        return (
          <div key={mp.materialId} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-bold text-stone-900">
                {material.name} <span className="font-normal text-stone-500">· {material.sheetLength} × {material.sheetWidth} mm</span>
              </h4>
              <p className="text-xs text-stone-500">
                {mp.sheets.length} tablero(s) · aprovechamiento {formatPercent(mp.efficiency)} · {(mp.totalCutLength / 1000).toFixed(1)} m de corte
              </p>
            </div>
            <p className="text-[11px] text-stone-400">{mp.heuristic}</p>
            <div className="grid gap-4 xl:grid-cols-2">
              {mp.sheets.map((sheet) => (
                <figure key={sheet.id} className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
                  <SheetSvg sheet={sheet} selectedPanelId={selectedPanelId} onSelectPanel={onSelectPanel} />
                  <figcaption className="mt-2 flex items-center justify-between text-xs text-stone-500">
                    <span>
                      Tablero {sheet.index} · {sheet.placements.length} piezas · {sheet.cuts.length} cortes
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-semibold',
                        sheet.efficiency > 0.75 ? 'bg-green-100 text-green-800' : sheet.efficiency > 0.5 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600',
                      )}
                    >
                      {formatPercent(sheet.efficiency)}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-stone-500">
        Rojo punteado: secuencia de cortes de guillotina (de lado a lado). Verde rayado: retazos de 100 × 100 mm o más. Haz clic en una pieza
        para ubicarla en el modelo 3D.
      </p>
    </div>
  );
}
