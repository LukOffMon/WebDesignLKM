import type {
  CutPart,
  CutPlan,
  CutSheet,
  GuillotineCut,
  MaterialCutPlan,
  MaterialId,
  OptimizerSettings,
  Panel,
  Placement,
  SheetRect,
  UnplacedPart,
} from '@/types/carpentry';
import { getMaterial } from './materials';

/**
 * 2D guillotine bin packing (Jylänki, "A Thousand Ways to Pack the Bin").
 *
 * Every placement splits its free rectangle with two straight, edge-to-edge
 * cuts, so the resulting plan can be executed on a panel saw or a table saw.
 * The saw kerf is reserved after every part by packing (w + kerf) × (h + kerf)
 * into a bin enlarged by one kerf (the last part on an edge needs no cut).
 * Several sort orders, fit scores and split rules are tried and the plan with
 * the fewest sheets and the largest reusable offcut wins.
 */

export const DEFAULT_OPTIMIZER_SETTINGS: OptimizerSettings = {
  kerf: 3,
  trim: 10,
  allowRotation: true,
};

type SortRule = 'area' | 'long-side' | 'perimeter' | 'width';
type FitRule = 'best-area' | 'best-short-side' | 'best-long-side';
type SplitRule = 'shorter-leftover' | 'longer-leftover' | 'max-area';

interface Heuristic {
  sort: SortRule;
  fit: FitRule;
  split: SplitRule;
}

const SORT_RULES: readonly SortRule[] = ['area', 'long-side', 'perimeter', 'width'];
const FIT_RULES: readonly FitRule[] = ['best-area', 'best-short-side', 'best-long-side'];
const SPLIT_RULES: readonly SplitRule[] = ['shorter-leftover', 'longer-leftover', 'max-area'];

const HEURISTIC_LABELS: Readonly<Record<SortRule | FitRule | SplitRule, string>> = {
  area: 'área',
  'long-side': 'lado largo',
  perimeter: 'perímetro',
  width: 'ancho',
  'best-area': 'mejor área',
  'best-short-side': 'mejor lado corto',
  'best-long-side': 'mejor lado largo',
  'shorter-leftover': 'eje sobrante corto',
  'longer-leftover': 'eje sobrante largo',
  'max-area': 'máxima área libre',
};

export const describeHeuristic = (h: Heuristic): string =>
  `Orden por ${HEURISTIC_LABELS[h.sort]} · ${HEURISTIC_LABELS[h.fit]} · corte por ${HEURISTIC_LABELS[h.split]}`;

// ---------------------------------------------------------------------------
// Part extraction
// ---------------------------------------------------------------------------

/**
 * One cut part per panel, at saw size (finished size minus edge banding).
 * The part length follows the panel grain direction.
 */
export const panelsToCutParts = (panels: readonly Panel[], settings: OptimizerSettings): CutPart[] =>
  panels.map((panel) => ({
    id: `part-${panel.id}`,
    panelId: panel.id,
    code: panel.code,
    label: panel.name,
    materialId: panel.materialId,
    length: panel.cutLength,
    width: panel.cutWidth,
    thickness: panel.thickness,
    canRotate: settings.allowRotation && !panel.grainLocked,
    edgeBanding: panel.edgeBanding,
  }));

// ---------------------------------------------------------------------------
// Packing state
// ---------------------------------------------------------------------------

interface WorkingSheet {
  freeRects: SheetRect[];
  placements: Placement[];
  cuts: GuillotineCut[];
}

interface Candidate {
  sheetIndex: number;
  rectIndex: number;
  rotated: boolean;
  /** Footprint including kerf. */
  w: number;
  h: number;
  primary: number;
  secondary: number;
}

interface PackContext {
  sheetLength: number;
  sheetWidth: number;
  trim: number;
  kerf: number;
  /** Right / bottom limits of the usable area, without the kerf allowance. */
  maxX: number;
  maxY: number;
}

const sortParts = (parts: readonly CutPart[], rule: SortRule): CutPart[] => {
  const key = (p: CutPart): number => {
    switch (rule) {
      case 'area':
        return p.length * p.width;
      case 'long-side':
        return Math.max(p.length, p.width) * 1e6 + Math.min(p.length, p.width);
      case 'perimeter':
        return p.length + p.width;
      case 'width':
        return Math.min(p.length, p.width) * 1e6 + Math.max(p.length, p.width);
    }
  };
  return [...parts].sort((a, b) => key(b) - key(a) || a.code.localeCompare(b.code));
};

const scoreFit = (rect: SheetRect, w: number, h: number, rule: FitRule): [number, number] => {
  const leftoverW = rect.w - w;
  const leftoverH = rect.h - h;
  const shortSide = Math.min(leftoverW, leftoverH);
  const longSide = Math.max(leftoverW, leftoverH);
  switch (rule) {
    case 'best-area':
      return [rect.w * rect.h - w * h, shortSide];
    case 'best-short-side':
      return [shortSide, longSide];
    case 'best-long-side':
      return [longSide, shortSide];
  }
};

const findCandidate = (sheets: readonly WorkingSheet[], part: CutPart, kerf: number, fit: FitRule): Candidate | null => {
  const orientations: Array<{ rotated: boolean; w: number; h: number }> = [
    { rotated: false, w: part.length + kerf, h: part.width + kerf },
  ];
  if (part.canRotate && part.length !== part.width) {
    orientations.push({ rotated: true, w: part.width + kerf, h: part.length + kerf });
  }

  // First fit across sheets (keeps earlier sheets full), best fit inside a sheet.
  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex += 1) {
    const sheet = sheets[sheetIndex];
    if (!sheet) continue;
    let best: Candidate | null = null;
    sheet.freeRects.forEach((rect, rectIndex) => {
      for (const o of orientations) {
        if (o.w > rect.w + 1e-6 || o.h > rect.h + 1e-6) continue;
        const [primary, secondary] = scoreFit(rect, o.w, o.h, fit);
        if (!best || primary < best.primary || (primary === best.primary && secondary < best.secondary)) {
          best = { sheetIndex, rectIndex, rotated: o.rotated, w: o.w, h: o.h, primary, secondary };
        }
      }
    });
    if (best) return best;
  }
  return null;
};

const chooseHorizontalSplit = (rect: SheetRect, w: number, h: number, rule: SplitRule): boolean => {
  const leftoverW = rect.w - w;
  const leftoverH = rect.h - h;
  switch (rule) {
    case 'shorter-leftover':
      return leftoverW <= leftoverH;
    case 'longer-leftover':
      return leftoverW > leftoverH;
    case 'max-area': {
      // Keep the single largest free rectangle as big as possible.
      const horizontalBest = Math.max(rect.w * leftoverH, leftoverW * h);
      const verticalBest = Math.max(leftoverW * rect.h, w * leftoverH);
      return horizontalBest >= verticalBest;
    }
  }
};

/**
 * Places a part in the top-left corner of a free rectangle and splits the
 * remainder into two rectangles with one full-length cut and one partial cut.
 */
const placeAndSplit = (sheet: WorkingSheet, candidate: Candidate, part: CutPart, ctx: PackContext, split: SplitRule): void => {
  const rect = sheet.freeRects[candidate.rectIndex];
  if (!rect) throw new Error('Free rectangle vanished during placement');
  const { w, h } = candidate;
  const actualW = w - ctx.kerf;
  const actualH = h - ctx.kerf;

  sheet.placements.push({ part, rotated: candidate.rotated, x: rect.x, y: rect.y, w: actualW, h: actualH });

  const horizontal = chooseHorizontalSplit(rect, w, h, split);
  const leftoverW = rect.w - w;
  const leftoverH = rect.h - h;
  const next: SheetRect[] = [];
  const clipX = (x: number, length: number): number => Math.max(0, Math.min(length, ctx.maxX - x));
  const clipY = (y: number, length: number): number => Math.max(0, Math.min(length, ctx.maxY - y));
  const cutX = rect.x + actualW + ctx.kerf / 2;
  const cutY = rect.y + actualH + ctx.kerf / 2;

  if (horizontal) {
    // Full-width horizontal cut first, then a vertical cut inside the part strip.
    if (leftoverH > 0) {
      next.push({ x: rect.x, y: rect.y + h, w: rect.w, h: leftoverH });
      if (cutY < ctx.maxY) {
        sheet.cuts.push({ orientation: 'horizontal', x: rect.x, y: cutY, length: clipX(rect.x, rect.w) });
      }
    }
    if (leftoverW > 0) {
      next.push({ x: rect.x + w, y: rect.y, w: leftoverW, h });
      if (cutX < ctx.maxX) {
        sheet.cuts.push({ orientation: 'vertical', x: cutX, y: rect.y, length: clipY(rect.y, actualH) });
      }
    }
  } else {
    // Full-height vertical cut first, then a horizontal cut inside the part strip.
    if (leftoverW > 0) {
      next.push({ x: rect.x + w, y: rect.y, w: leftoverW, h: rect.h });
      if (cutX < ctx.maxX) {
        sheet.cuts.push({ orientation: 'vertical', x: cutX, y: rect.y, length: clipY(rect.y, rect.h) });
      }
    }
    if (leftoverH > 0) {
      next.push({ x: rect.x, y: rect.y + h, w, h: leftoverH });
      if (cutY < ctx.maxY) {
        sheet.cuts.push({ orientation: 'horizontal', x: rect.x, y: cutY, length: clipX(rect.x, actualW) });
      }
    }
  }

  sheet.freeRects.splice(candidate.rectIndex, 1, ...next.filter((r) => r.w > 0.5 && r.h > 0.5));
};

const createWorkingSheet = (ctx: PackContext): WorkingSheet => ({
  freeRects: [
    {
      x: ctx.trim,
      y: ctx.trim,
      w: ctx.sheetLength - 2 * ctx.trim + ctx.kerf,
      h: ctx.sheetWidth - 2 * ctx.trim + ctx.kerf,
    },
  ],
  placements: [],
  cuts: [],
});

const fitsEmptySheet = (part: CutPart, ctx: PackContext): { fits: boolean; reason: string } => {
  const usableL = ctx.sheetLength - 2 * ctx.trim;
  const usableW = ctx.sheetWidth - 2 * ctx.trim;
  const straight = part.length <= usableL && part.width <= usableW;
  const rotated = part.width <= usableL && part.length <= usableW;
  if (straight || (part.canRotate && rotated)) return { fits: true, reason: '' };
  if (rotated && !part.canRotate) {
    return { fits: false, reason: 'Solo cabe girada 90°, pero la veta del tablero lo impide.' };
  }
  return {
    fits: false,
    reason: `Mide ${part.length} × ${part.width} mm y el área útil del tablero es ${usableL} × ${usableW} mm.`,
  };
};

interface PackResult {
  sheets: WorkingSheet[];
  unplaced: UnplacedPart[];
}

const pack = (parts: readonly CutPart[], ctx: PackContext, heuristic: Heuristic): PackResult => {
  const sheets: WorkingSheet[] = [];
  const unplaced: UnplacedPart[] = [];

  for (const part of sortParts(parts, heuristic.sort)) {
    const check = fitsEmptySheet(part, ctx);
    if (!check.fits) {
      unplaced.push({ part, reason: check.reason });
      continue;
    }
    let candidate = findCandidate(sheets, part, ctx.kerf, heuristic.fit);
    if (!candidate) {
      sheets.push(createWorkingSheet(ctx));
      candidate = findCandidate(sheets.slice(-1), part, ctx.kerf, heuristic.fit);
      if (candidate) candidate = { ...candidate, sheetIndex: sheets.length - 1 };
    }
    const sheet = candidate ? sheets[candidate.sheetIndex] : undefined;
    if (!candidate || !sheet) {
      unplaced.push({ part, reason: 'No se encontró espacio libre suficiente.' });
      continue;
    }
    placeAndSplit(sheet, candidate, part, ctx, heuristic.split);
  }
  return { sheets, unplaced };
};

const largestFreeArea = (sheets: readonly WorkingSheet[]): number =>
  sheets.reduce((best, sheet) => Math.max(best, ...sheet.freeRects.map((r) => r.w * r.h), 0), 0);

const isBetter = (a: PackResult, b: PackResult): boolean => {
  if (a.unplaced.length !== b.unplaced.length) return a.unplaced.length < b.unplaced.length;
  if (a.sheets.length !== b.sheets.length) return a.sheets.length < b.sheets.length;
  return largestFreeArea(a.sheets) > largestFreeArea(b.sheets);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const optimizeMaterial = (
  materialId: MaterialId,
  parts: readonly CutPart[],
  settings: OptimizerSettings,
): MaterialCutPlan => {
  const material = getMaterial(materialId);
  const kerf = Math.max(0, settings.kerf);
  const trim = Math.max(0, settings.trim);
  const ctx: PackContext = {
    sheetLength: material.sheetLength,
    sheetWidth: material.sheetWidth,
    trim,
    kerf,
    maxX: material.sheetLength - trim,
    maxY: material.sheetWidth - trim,
  };

  let best: { result: PackResult; heuristic: Heuristic } | null = null;
  for (const sort of SORT_RULES) {
    for (const fit of FIT_RULES) {
      for (const split of SPLIT_RULES) {
        const heuristic: Heuristic = { sort, fit, split };
        const result = pack(parts, ctx, heuristic);
        if (!best || isBetter(result, best.result)) best = { result, heuristic };
      }
    }
  }
  if (!best) throw new Error('The optimizer ran no heuristic');

  const sheetArea = material.sheetLength * material.sheetWidth;
  const sheets: CutSheet[] = best.result.sheets.map((sheet, index) => {
    const usedArea = sheet.placements.reduce((sum, p) => sum + p.w * p.h, 0);
    return {
      id: `${materialId}-${index + 1}`,
      index: index + 1,
      materialId,
      sheetLength: material.sheetLength,
      sheetWidth: material.sheetWidth,
      trim,
      placements: sheet.placements,
      // Report offcuts without the kerf allowance that sits past the usable edge.
      freeRects: sheet.freeRects
        .map((r) => ({ ...r, w: Math.min(r.w, ctx.maxX - r.x), h: Math.min(r.h, ctx.maxY - r.y) }))
        .filter((r) => r.w > 0 && r.h > 0),
      cuts: sheet.cuts,
      usedArea,
      wasteArea: sheetArea - usedArea,
      efficiency: usedArea / sheetArea,
    };
  });

  const partsArea = sheets.reduce((sum, s) => sum + s.usedArea, 0);
  const sheetsArea = sheets.length * sheetArea;
  return {
    materialId,
    sheets,
    unplaced: best.result.unplaced,
    heuristic: describeHeuristic(best.heuristic),
    partsArea,
    sheetsArea,
    efficiency: sheetsArea > 0 ? partsArea / sheetsArea : 0,
    totalCutLength: sheets.reduce((sum, s) => sum + s.cuts.reduce((acc, c) => acc + c.length, 0), 0),
  };
};

/** Groups the panels by board and optimizes each board independently. */
export const optimizeCuts = (panels: readonly Panel[], settings: OptimizerSettings, now: number = Date.now()): CutPlan => {
  const parts = panelsToCutParts(panels, settings);
  const byMaterial = new Map<MaterialId, CutPart[]>();
  for (const part of parts) {
    const list = byMaterial.get(part.materialId) ?? [];
    list.push(part);
    byMaterial.set(part.materialId, list);
  }

  const materials = [...byMaterial.entries()].map(([materialId, list]) => optimizeMaterial(materialId, list, settings));
  const partsArea = materials.reduce((sum, m) => sum + m.partsArea, 0);
  const sheetsArea = materials.reduce((sum, m) => sum + m.sheetsArea, 0);
  return {
    settings,
    materials,
    totalSheets: materials.reduce((sum, m) => sum + m.sheets.length, 0),
    overallEfficiency: sheetsArea > 0 ? partsArea / sheetsArea : 0,
    generatedAt: now,
  };
};

/** True when no two placements on a sheet overlap (kerf included). Used by tests. */
export const validateSheet = (sheet: CutSheet, kerf: number): boolean => {
  const { placements } = sheet;
  for (let i = 0; i < placements.length; i += 1) {
    const a = placements[i];
    if (!a) continue;
    if (a.x < sheet.trim - 1e-6 || a.y < sheet.trim - 1e-6) return false;
    if (a.x + a.w > sheet.sheetLength - sheet.trim + 1e-6) return false;
    if (a.y + a.h > sheet.sheetWidth - sheet.trim + 1e-6) return false;
    for (let j = i + 1; j < placements.length; j += 1) {
      const b = placements[j];
      if (!b) continue;
      const separated =
        a.x + a.w + kerf <= b.x + 1e-6 ||
        b.x + b.w + kerf <= a.x + 1e-6 ||
        a.y + a.h + kerf <= b.y + 1e-6 ||
        b.y + b.h + kerf <= a.y + 1e-6;
      if (!separated) return false;
    }
  }
  return true;
};
