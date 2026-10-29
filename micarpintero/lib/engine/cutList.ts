import type { EdgeBanding, Panel } from '@/types/carpentry';
import { edgeBandLengthMm, getRoleLabel } from './calculator';
import { getMaterial } from './materials';

export interface GroupedPart {
  codes: string[];
  panelIds: string[];
  name: string;
  material: string;
  length: number;
  width: number;
  cutLength: number;
  cutWidth: number;
  thickness: number;
  banding: string;
  grain: boolean;
  bandMm: number;
}

export const bandingLabel = (banding: EdgeBanding): string => {
  const edges = (['L1', 'L2', 'W1', 'W2'] as const).filter((edge) => banding[edge]);
  return edges.length === 0 ? '-' : edges.length === 4 ? '4 cantos' : edges.join(' ');
};

/** Identical parts (same board, saw size, banding and role) collapse into one row. */
export const groupParts = (panels: readonly Panel[]): GroupedPart[] => {
  const groups = new Map<string, GroupedPart>();
  for (const panel of panels) {
    const banding = bandingLabel(panel.edgeBanding);
    const key = `${panel.materialId}|${panel.cutLength}|${panel.cutWidth}|${banding}|${panel.role}`;
    const existing = groups.get(key);
    if (existing) {
      existing.codes.push(panel.code);
      existing.panelIds.push(panel.id);
      existing.bandMm += edgeBandLengthMm(panel);
    } else {
      groups.set(key, {
        codes: [panel.code],
        panelIds: [panel.id],
        name: getRoleLabel(panel.role),
        material: getMaterial(panel.materialId).name,
        length: panel.length,
        width: panel.width,
        cutLength: panel.cutLength,
        cutWidth: panel.cutWidth,
        thickness: panel.thickness,
        banding,
        grain: panel.grainLocked,
        bandMm: edgeBandLengthMm(panel),
      });
    }
  }
  return [...groups.values()];
};

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV (comma separated, UTF-8 with BOM for Excel) of the grouped cut list. */
export const cutListToCsv = (panels: readonly Panel[]): string => {
  const header = ['Codigos', 'Pieza', 'Cantidad', 'Largo terminado', 'Ancho terminado', 'Largo corte', 'Ancho corte', 'Espesor', 'Material', 'Cantos', 'Veta'];
  const rows = groupParts(panels).map((g) => [
    g.codes.join(' '),
    g.name,
    g.codes.length,
    g.length,
    g.width,
    g.cutLength,
    g.cutWidth,
    g.thickness,
    g.material,
    g.banding,
    g.grain ? 'si' : 'no',
  ]);
  return `﻿${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
};
