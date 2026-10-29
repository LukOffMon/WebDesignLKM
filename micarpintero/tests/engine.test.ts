import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildFurniture,
  composeTransform,
  computeBillOfMaterials,
  computeShelfDeflection,
  createDefaultConfig,
  transformPoint,
} from '../lib/engine/calculator';
import { DEFAULT_OPTIMIZER_SETTINGS, optimizeCuts, validateSheet } from '../lib/engine/cutOptimizer';
import type { FurnitureTemplate } from '../types/carpentry';

const TEMPLATES: FurnitureTemplate[] = ['bookshelf', 'cabinet', 'dresser'];

test('composeTransform matches a pure translation and a 90° Y rotation', () => {
  const t = composeTransform([10, 20, 30]);
  assert.deepEqual(transformPoint(t, [1, 2, 3]), [11, 22, 33]);
  const r = composeTransform([0, 0, 0], [0, Math.PI / 2, 0]);
  const p = transformPoint(r, [1, 0, 0]);
  assert.ok(Math.abs(p[0]) < 1e-9 && Math.abs(p[2] + 1) < 1e-9);
});

for (const template of TEMPLATES) {
  test(`${template}: panels stay inside the envelope and do not overlap`, () => {
    const model = buildFurniture(createDefaultConfig(template, 't', template, 0));
    const { width, height, depth } = model.config.dimensions;
    assert.ok(model.panels.length > 4);
    assert.ok(model.bounds.min[0] >= -width / 2 - 1e-6 && model.bounds.max[0] <= width / 2 + 1e-6);
    assert.ok(model.bounds.min[1] >= -1e-6 && model.bounds.max[1] <= height + 1e-6);
    assert.ok(model.bounds.min[2] >= -depth / 2 - 1e-6 && model.bounds.max[2] <= depth / 2 + 1e-6);
    for (let i = 0; i < model.panels.length; i += 1) {
      for (let j = i + 1; j < model.panels.length; j += 1) {
        const a = model.panels[i]!.worldBounds;
        const b = model.panels[j]!.worldBounds;
        const overlap = [0, 1, 2].every((k) => Math.min(a.max[k]!, b.max[k]!) - Math.max(a.min[k]!, b.min[k]!) > 0.01);
        assert.ok(!overlap, `${model.panels[i]!.id} overlaps ${model.panels[j]!.id}`);
      }
    }
  });

  test(`${template}: cut plan places every part without collisions`, () => {
    const model = buildFurniture(createDefaultConfig(template, 't', template, 0));
    const plan = optimizeCuts(model.panels, DEFAULT_OPTIMIZER_SETTINGS, 0);
    const placed = plan.materials.reduce((n, m) => n + m.sheets.reduce((k, s) => k + s.placements.length, 0), 0);
    assert.equal(placed, model.panels.length);
    for (const m of plan.materials) for (const s of m.sheets) assert.ok(validateSheet(s, DEFAULT_OPTIMIZER_SETTINGS.kerf));
    const bom = computeBillOfMaterials(model, plan);
    assert.ok(bom.total > 0);
  });
}

test('shelf deflection follows 5wL⁴/384EI', () => {
  const r = computeShelfDeflection({
    spanMm: 1000, depthMm: 300, thicknessMm: 20, elasticModulusMPa: 10000, densityKgM3: 0, creepFactor: 2, loadKg: 1000 / 9.81,
  });
  // w = 1 N/mm, I = 300·8000/12 = 200000 mm⁴ → δ = 5e12 / (384 · 1e4 · 2e5) = 6.51 mm
  assert.ok(Math.abs(r.instantMm - 6.5104) < 1e-3);
  assert.ok(Math.abs(r.longTermMm - 2 * r.instantMm) < 1e-9);
});

test('oversized parts are reported instead of silently dropped', () => {
  const config = { ...createDefaultConfig('bookshelf', 't', 'x', 0), dimensions: { width: 900, height: 2600, depth: 320, thickness: 18 } };
  const model = buildFurniture(config);
  const plan = optimizeCuts(model.panels, DEFAULT_OPTIMIZER_SETTINGS, 0);
  const unplaced = plan.materials.flatMap((m) => m.unplaced);
  assert.ok(unplaced.some((u) => u.part.panelId === 'side-left'));
});

test('guide parser detects numbered headings and extracts entities', async () => {
  const { structureGuide } = await import('../lib/pdf/guideParser');
  const line = (page: number, text: string, fontSize = 10, y = 0) => ({ page, text, fontSize, y });
  const lines = [
    line(1, 'Manual de armado', 20, 800),
    line(1, 'Paso 1: Prepara las piezas', 12, 700),
    line(1, 'Necesitas un desarmador y 8 x tornillos confirmat de 7 x 50 mm.', 10, 680),
    line(1, 'Paso 2: Une los costados', 12, 600),
    line(1, 'Precaución: no aprietes en exceso.', 10, 580),
    line(2, 'Paso 3 - Coloca el fondo', 12, 700),
    line(2, 'Clava el fondo de 3 mm cada 100 mm.', 10, 680),
  ];
  const result = structureGuide(lines, 2, 'manual.pdf');
  assert.equal(result.detection, 'numbered-headings');
  assert.equal(result.title, 'Manual de armado');
  assert.deepEqual(result.steps.map((s) => s.title), ['Prepara las piezas', 'Une los costados', 'Coloca el fondo']);
  assert.ok(result.steps[0]!.tools.includes('Desarmador'));
  assert.ok(result.steps[0]!.dimensions.some((d) => d.includes('50 mm')));
  assert.equal(result.steps[1]!.warnings.length, 1);
});
