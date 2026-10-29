'use client';

import { Download } from 'lucide-react';
import { cutListToCsv, groupParts } from '@/lib/engine/cutList';
import { downloadBlob, slugify } from '@/lib/download';
import { formatInt } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import type { BillOfMaterials, FurnitureModel } from '@/types/carpentry';

export function CutListTable({ model, bom, selectedPanelId, onSelectPanel }: {
  model: FurnitureModel;
  bom: BillOfMaterials;
  selectedPanelId: string | null;
  onSelectPanel: (id: string | null) => void;
}) {
  const groups = groupParts(model.panels);
  const totalArea = model.panels.reduce((sum, p) => sum + p.length * p.width, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">
          <strong className="text-stone-900">{model.panels.length}</strong> piezas en {groups.length} medidas ·{' '}
          {(totalArea / 1e6).toFixed(2)} m² · canto {bom.edgeBandMeters.toFixed(1)} m
        </p>
        <Button
          size="sm"
          onClick={() => downloadBlob(cutListToCsv(model.panels), `${slugify(model.config.name)}-despiece.csv`, 'text/csv;charset=utf-8')}
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-stone-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Código</th>
              <th className="px-3 py-2 font-semibold">Pieza</th>
              <th className="px-3 py-2 text-center font-semibold">Cant.</th>
              <th className="px-3 py-2 text-right font-semibold">Terminada</th>
              <th className="px-3 py-2 text-right font-semibold">Corte</th>
              <th className="px-3 py-2 font-semibold">Material</th>
              <th className="px-3 py-2 font-semibold">Cantos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {groups.map((g) => {
              const active = selectedPanelId !== null && g.panelIds.includes(selectedPanelId);
              return (
                <tr
                  key={g.codes.join('-')}
                  onClick={() => onSelectPanel(active ? null : (g.panelIds[0] ?? null))}
                  className={cn('cursor-pointer transition', active ? 'bg-amber-50' : 'hover:bg-stone-50')}
                >
                  <td className="px-3 py-2 font-mono text-xs font-bold text-amber-700">{g.codes.join(', ')}</td>
                  <td className="px-3 py-2 text-stone-800">{g.name}</td>
                  <td className="px-3 py-2 text-center font-mono">{g.codes.length}</td>
                  <td className="px-3 py-2 text-right font-mono text-stone-500">
                    {formatInt(g.length)} × {formatInt(g.width)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-stone-900">
                    {g.cutLength} × {g.cutWidth} × {g.thickness}
                  </td>
                  <td className="px-3 py-2 text-xs text-stone-600">
                    {g.material}
                    {g.grain && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">veta</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-stone-600">{g.banding}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-stone-500">
        Corte = medida de sierra (terminada menos {model.config.edgeBandThickness} mm por cada canto enchapado). L1/L2 son los cantos largos,
        W1/W2 los cortos; L1 es el frontal.
      </p>
    </div>
  );
}
