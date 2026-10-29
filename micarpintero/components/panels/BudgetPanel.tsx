'use client';

import { formatMoney, formatMoneyCents } from '@/lib/format';
import type { BillOfMaterials, FurnitureModel } from '@/types/carpentry';

export function BudgetPanel({ model, bom }: { model: FurnitureModel; bom: BillOfMaterials }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Tableros', bom.materialCost],
          ['Canto', bom.edgeBandCost],
          ['Herrajes', bom.hardwareCost],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
            <p className="text-xs text-stone-500">{label}</p>
            <p className="font-mono text-lg font-bold text-stone-900">{formatMoney(Number(value))}</p>
          </div>
        ))}
        <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <p className="text-xs text-amber-800">Total estimado</p>
          <p className="font-mono text-lg font-bold text-amber-900">{formatMoney(bom.total)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-stone-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Concepto</th>
              <th className="px-3 py-2">Detalle</th>
              <th className="px-3 py-2 text-right">Cant.</th>
              <th className="px-3 py-2 text-right">Unitario</th>
              <th className="px-3 py-2 text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {bom.materials.map((m) => (
              <tr key={m.materialId}>
                <td className="px-3 py-2 font-medium text-stone-900">{m.name}</td>
                <td className="px-3 py-2 text-xs text-stone-500">Tablero completo</td>
                <td className="px-3 py-2 text-right font-mono">{m.sheets}</td>
                <td className="px-3 py-2 text-right font-mono">{formatMoney(m.pricePerSheet)}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{formatMoney(m.subtotal)}</td>
              </tr>
            ))}
            <tr>
              <td className="px-3 py-2 font-medium text-stone-900">Canto PVC {model.config.edgeBandThickness} mm</td>
              <td className="px-3 py-2 text-xs text-stone-500">Incluye 30 mm de desperdicio por canto</td>
              <td className="px-3 py-2 text-right font-mono">{bom.edgeBandMeters.toFixed(1)} m</td>
              <td className="px-3 py-2 text-right font-mono">—</td>
              <td className="px-3 py-2 text-right font-mono font-semibold">{formatMoney(bom.edgeBandCost)}</td>
            </tr>
            {model.hardware.map((h) => (
              <tr key={h.id}>
                <td className="px-3 py-2 font-medium text-stone-900">{h.name}</td>
                <td className="px-3 py-2 text-xs text-stone-500">{h.spec}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {h.quantity} {h.unit}
                </td>
                <td className="px-3 py-2 text-right font-mono">{formatMoneyCents(h.unitPrice)}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{formatMoney(h.quantity * h.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-stone-500">
        Precios de referencia en MXN para estimar; no incluyen corte, enchapado ni mano de obra. Ajusta con tu proveedor.
      </p>
    </div>
  );
}
