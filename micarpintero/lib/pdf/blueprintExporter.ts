import { jsPDF } from 'jspdf';
import { autoTable, type RowInput, type UserOptions } from 'jspdf-autotable';
import { TEMPLATE_LABELS } from '@/lib/engine/calculator';
import { groupParts } from '@/lib/engine/cutList';
import { slugify } from '@/lib/download';
import { getMaterial } from '@/lib/engine/materials';
import type {
  BillOfMaterials,
  CheckSeverity,
  CutPlan,
  CutSheet,
  FurnitureModel,
  PanelRole,
} from '@/types/carpentry';

/**
 * Client-side blueprint generator. Produces a multi-page A4 PDF with cover and
 * 3D snapshot, orthographic views, grouped cut list, hardware & costs,
 * structural checks, one guillotine cut map per sheet and the assembly steps.
 * Everything is drawn with jsPDF vector primitives; nothing leaves the browser.
 */

export interface BlueprintInput {
  model: FurnitureModel;
  plan: CutPlan;
  bom: BillOfMaterials;
  /** PNG data URL of the 3D viewport, or null when unavailable. */
  snapshot: string | null;
  appName: string;
  generatedAt?: Date;
}

type RGB = [number, number, number];

const COLORS = {
  ink: [28, 25, 23] as RGB,
  muted: [120, 113, 108] as RGB,
  line: [214, 211, 209] as RGB,
  paper: [250, 249, 247] as RGB,
  accent: [180, 83, 9] as RGB,
  accentSoft: [254, 243, 199] as RGB,
  blueprint: [30, 64, 175] as RGB,
  ok: [21, 128, 61] as RGB,
  warning: [180, 83, 9] as RGB,
  critical: [185, 28, 28] as RGB,
};

const SEVERITY_COLOR: Readonly<Record<CheckSeverity, RGB>> = {
  ok: COLORS.ok,
  warning: COLORS.warning,
  critical: COLORS.critical,
};

const SEVERITY_LABEL: Readonly<Record<CheckSeverity, string>> = {
  ok: 'Correcto',
  warning: 'Atención',
  critical: 'Crítico',
};

const ROLE_FILL: Readonly<Record<PanelRole, RGB>> = {
  side: [231, 229, 228],
  top: [214, 211, 209],
  bottom: [214, 211, 209],
  shelf: [254, 243, 199],
  divider: [231, 229, 228],
  back: [245, 245, 244],
  kick: [168, 162, 158],
  door: [219, 234, 254],
  'drawer-front': [219, 234, 254],
  'drawer-side': [237, 233, 254],
  'drawer-back': [237, 233, 254],
  'drawer-inner-front': [237, 233, 254],
  'drawer-bottom': [245, 245, 244],
};

const PORTRAIT = { w: 210, h: 297 };
const LANDSCAPE = { w: 297, h: 210 };
const MARGIN = 14;

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/[–—]/g, '-'],
  [/…/g, '...'],
  [/[“”]/g, '"'],
  [/[‘’]/g, "'"],
  [/≤/g, '<='],
  [/≥/g, '>='],
  [/⁴/g, '^4'],
  [/³/g, '^3'],
  [/→/g, '->'],
  [/•/g, '-'],
];

/** The standard PDF fonts only cover Latin-1; replace or drop anything else. */
export const pdfText = (text: string): string => {
  let out = text;
  for (const [pattern, replacement] of REPLACEMENTS) out = out.replace(pattern, replacement);
  return [...out].filter((ch) => (ch.codePointAt(0) ?? 0) <= 0xff).join('');
};

const money = (value: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);

const unitMoney = (value: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(value);

const mm = (value: number): string => `${Math.round(value)}`;

const setFill = (doc: jsPDF, color: RGB): void => {
  doc.setFillColor(color[0], color[1], color[2]);
};
const setDraw = (doc: jsPDF, color: RGB): void => {
  doc.setDrawColor(color[0], color[1], color[2]);
};
const setText = (doc: jsPDF, color: RGB): void => {
  doc.setTextColor(color[0], color[1], color[2]);
};

const write = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: { size?: number; style?: 'normal' | 'bold' | 'italic'; color?: RGB; align?: 'left' | 'center' | 'right'; maxWidth?: number } = {},
): number => {
  doc.setFont('helvetica', options.style ?? 'normal');
  doc.setFontSize(options.size ?? 10);
  setText(doc, options.color ?? COLORS.ink);
  const clean = pdfText(text);
  const lines: string[] = options.maxWidth ? doc.splitTextToSize(clean, options.maxWidth) : [clean];
  doc.text(lines, x, y, { align: options.align ?? 'left', baseline: 'top' });
  const lineHeight = ((options.size ?? 10) * 0.3528 * 1.25);
  return y + lines.length * lineHeight;
};

interface AutoTableCarrier {
  lastAutoTable?: { finalY?: number };
}

const lastTableY = (doc: jsPDF, fallback: number): number => {
  const carrier = doc as unknown as AutoTableCarrier;
  return carrier.lastAutoTable?.finalY ?? fallback;
};

const table = (doc: jsPDF, options: UserOptions): number => {
  autoTable(doc, {
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN, top: 28, bottom: 18 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, lineColor: COLORS.line, lineWidth: 0.15, textColor: COLORS.ink },
    headStyles: { fillColor: COLORS.ink, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLORS.paper },
    ...options,
  });
  return lastTableY(doc, 28);
};

const sectionTitle = (doc: jsPDF, title: string, subtitle: string): number => {
  write(doc, title, MARGIN, MARGIN, { size: 16, style: 'bold' });
  write(doc, subtitle, MARGIN, MARGIN + 7.5, { size: 9, color: COLORS.muted });
  const width = doc.internal.pageSize.getWidth();
  setDraw(doc, COLORS.accent);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, MARGIN + 13, width - MARGIN, MARGIN + 13);
  return MARGIN + 18;
};

// ---------------------------------------------------------------------------
// Cover
// ---------------------------------------------------------------------------

const drawCover = (doc: jsPDF, input: BlueprintInput, date: Date): void => {
  const { model, plan, bom } = input;
  const { config } = model;
  const material = getMaterial(config.materialId);

  setFill(doc, COLORS.ink);
  doc.rect(0, 0, PORTRAIT.w, 62, 'F');
  write(doc, input.appName.toUpperCase(), MARGIN, 14, { size: 9, style: 'bold', color: [253, 230, 138] });
  write(doc, 'Plano de fabricación', MARGIN, 21, { size: 10, color: [214, 211, 209] });
  write(doc, config.name, MARGIN, 30, { size: 24, style: 'bold', color: [255, 255, 255], maxWidth: PORTRAIT.w - 2 * MARGIN });
  write(
    doc,
    `${TEMPLATE_LABELS[config.template]} · ${config.dimensions.width} × ${config.dimensions.height} × ${config.dimensions.depth} mm · ${material.name}`,
    MARGIN,
    47,
    { size: 10, color: [231, 229, 228] },
  );

  // Snapshot frame.
  const frame = { x: MARGIN, y: 72, w: PORTRAIT.w - 2 * MARGIN, h: 120 };
  setFill(doc, COLORS.paper);
  setDraw(doc, COLORS.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(frame.x, frame.y, frame.w, frame.h, 2, 2, 'FD');
  if (input.snapshot) {
    const props = doc.getImageProperties(input.snapshot);
    const ratio = Math.min((frame.w - 8) / props.width, (frame.h - 8) / props.height);
    const w = props.width * ratio;
    const h = props.height * ratio;
    doc.addImage(input.snapshot, 'PNG', frame.x + (frame.w - w) / 2, frame.y + (frame.h - h) / 2, w, h, undefined, 'FAST');
  } else {
    write(doc, 'Vista 3D no disponible', frame.x + frame.w / 2, frame.y + frame.h / 2 - 3, { align: 'center', color: COLORS.muted });
  }

  // Key figures.
  const stats: Array<[string, string]> = [
    ['Piezas', `${model.panels.length}`],
    ['Tableros', `${plan.totalSheets}`],
    ['Aprovechamiento', `${Math.round(plan.overallEfficiency * 100)} %`],
    ['Peso aprox.', `${model.totalWeightKg.toFixed(1)} kg`],
    ['Costo estimado', money(bom.total)],
  ];
  const boxW = (PORTRAIT.w - 2 * MARGIN - 4 * 3) / 5;
  stats.forEach(([label, value], i) => {
    const x = MARGIN + i * (boxW + 3);
    setFill(doc, i === 4 ? COLORS.accentSoft : [255, 255, 255]);
    setDraw(doc, COLORS.line);
    doc.roundedRect(x, 200, boxW, 22, 1.5, 1.5, 'FD');
    write(doc, label, x + 3, 203, { size: 7.5, color: COLORS.muted });
    write(doc, value, x + 3, 210, { size: 12, style: 'bold' });
  });

  // Specification list.
  const specs: Array<[string, string]> = [
    ['Tablero del casco', material.name],
    ['Fondo', config.hasBack ? getMaterial(config.backMaterialId).name : 'Sin fondo'],
    ['Unión', config.joinery === 'confirmat' ? 'Tornillo confirmat' : config.joinery === 'cam-lock' ? 'Excéntrica + perno' : 'Taquete y pegamento'],
    ['Zócalo', config.hasKick ? `${config.kickHeight} mm` : 'Niveladores'],
    ['Canto', `${config.edgeBandThickness} mm · ${bom.edgeBandMeters.toFixed(1)} m lineales`],
    ['Disco de corte', `${plan.settings.kerf} mm de kerf · refilado ${plan.settings.trim} mm`],
  ];
  let y = 232;
  for (const [label, value] of specs) {
    write(doc, label, MARGIN, y, { size: 9, color: COLORS.muted });
    write(doc, value, MARGIN + 45, y, { size: 9, style: 'bold' });
    y += 6;
  }
  if (config.notes.trim()) {
    write(doc, `Notas: ${config.notes.trim()}`, MARGIN, y + 2, { size: 8.5, color: COLORS.muted, maxWidth: PORTRAIT.w - 2 * MARGIN });
  }

  write(
    doc,
    `Generado el ${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}. Medidas en milímetros.`,
    MARGIN,
    PORTRAIT.h - 24,
    { size: 8, color: COLORS.muted },
  );
};

// ---------------------------------------------------------------------------
// Orthographic views
// ---------------------------------------------------------------------------

type View = 'front' | 'side';

const FRONT_ROLES: ReadonlySet<PanelRole> = new Set(['door', 'drawer-front']);

const drawDimension = (
  doc: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  offset: number,
): void => {
  const horizontal = Math.abs(y1 - y2) < 1e-6;
  setDraw(doc, COLORS.blueprint);
  doc.setLineWidth(0.2);
  if (horizontal) {
    const y = y1 + offset;
    doc.line(x1, y1, x1, y + Math.sign(offset) * 1.5);
    doc.line(x2, y2, x2, y + Math.sign(offset) * 1.5);
    doc.line(x1, y, x2, y);
    doc.line(x1, y, x1 + 1.6, y - 0.8);
    doc.line(x1, y, x1 + 1.6, y + 0.8);
    doc.line(x2, y, x2 - 1.6, y - 0.8);
    doc.line(x2, y, x2 - 1.6, y + 0.8);
    write(doc, label, (x1 + x2) / 2, y + (offset > 0 ? 0.8 : -4.2), { size: 7.5, color: COLORS.blueprint, align: 'center' });
  } else {
    const x = x1 + offset;
    doc.line(x1, y1, x + Math.sign(offset) * 1.5, y1);
    doc.line(x2, y2, x + Math.sign(offset) * 1.5, y2);
    doc.line(x, y1, x, y2);
    doc.line(x, y1, x - 0.8, y1 + 1.6);
    doc.line(x, y1, x + 0.8, y1 + 1.6);
    doc.line(x, y2, x - 0.8, y2 - 1.6);
    doc.line(x, y2, x + 0.8, y2 - 1.6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setText(doc, COLORS.blueprint);
    doc.text(pdfText(label), x - 1.2, (y1 + y2) / 2, { angle: 90, align: 'center' });
  }
};

const drawElevation = (
  doc: jsPDF,
  model: FurnitureModel,
  view: View,
  box: { x: number; y: number; w: number; h: number },
): void => {
  const { bounds } = model;
  const hIndex = view === 'front' ? 0 : 2;
  const depthIndex = view === 'front' ? 2 : 0;
  const spanH = (bounds.max[hIndex] ?? 0) - (bounds.min[hIndex] ?? 0);
  const spanV = (bounds.max[1] ?? 0) - (bounds.min[1] ?? 0);
  const scale = Math.min(box.w / spanH, box.h / spanV);
  const originX = box.x + (box.w - spanH * scale) / 2;
  const originY = box.y + (box.h + spanV * scale) / 2;
  const toX = (v: number): number => originX + (v - (bounds.min[hIndex] ?? 0)) * scale;
  const toY = (v: number): number => originY - (v - (bounds.min[1] ?? 0)) * scale;

  const solid = model.panels
    .filter((p) => !(view === 'front' && FRONT_ROLES.has(p.role)))
    .sort((a, b) => (a.worldBounds.min[depthIndex] ?? 0) - (b.worldBounds.min[depthIndex] ?? 0));

  doc.setLineWidth(0.2);
  setDraw(doc, COLORS.ink);
  for (const panel of solid) {
    const x1 = toX(panel.worldBounds.min[hIndex] ?? 0);
    const x2 = toX(panel.worldBounds.max[hIndex] ?? 0);
    const y1 = toY(panel.worldBounds.max[1] ?? 0);
    const y2 = toY(panel.worldBounds.min[1] ?? 0);
    setFill(doc, ROLE_FILL[panel.role]);
    doc.rect(x1, y1, Math.max(0.2, x2 - x1), Math.max(0.2, y2 - y1), 'FD');
  }

  if (view === 'front') {
    // Doors and drawer fronts as dashed outlines so the interior stays readable.
    doc.setLineDashPattern([1.2, 0.8], 0);
    setDraw(doc, COLORS.blueprint);
    for (const panel of model.panels.filter((p) => FRONT_ROLES.has(p.role))) {
      const x1 = toX(panel.worldBounds.min[0] ?? 0);
      const x2 = toX(panel.worldBounds.max[0] ?? 0);
      const y1 = toY(panel.worldBounds.max[1] ?? 0);
      const y2 = toY(panel.worldBounds.min[1] ?? 0);
      doc.rect(x1, y1, x2 - x1, y2 - y1, 'S');
    }
    doc.setLineDashPattern([], 0);
  }

  const left = toX(bounds.min[hIndex] ?? 0);
  const right = toX(bounds.max[hIndex] ?? 0);
  const top = toY(bounds.max[1] ?? 0);
  const bottom = toY(bounds.min[1] ?? 0);
  drawDimension(doc, left, bottom, right, bottom, `${mm(spanH)} mm`, 7);
  drawDimension(doc, left, bottom, left, top, `${mm(spanV)} mm`, -7);

  // Shelf heights from the floor on the front view.
  if (view === 'front') {
    const levels = [...new Set(model.panels.filter((p) => p.role === 'shelf').map((p) => Math.round(p.worldBounds.max[1] ?? 0)))];
    for (const level of levels.sort((a, b) => a - b)) {
      write(doc, `${level}`, right + 2, toY(level) - 1.5, { size: 6.5, color: COLORS.muted });
    }
  }
};

const drawViewsPage = (doc: jsPDF, model: FurnitureModel): void => {
  let y = sectionTitle(doc, 'Vistas ortogonales', 'Frente sin puertas ni frentes (líneas punteadas) y costado. Cotas generales en mm.');
  y += 4;
  const usableW = PORTRAIT.w - 2 * MARGIN;
  write(doc, 'VISTA FRONTAL', MARGIN, y, { size: 8, style: 'bold', color: COLORS.muted });
  drawElevation(doc, model, 'front', { x: MARGIN + 12, y: y + 6, w: usableW - 30, h: 112 });
  y += 132;
  write(doc, 'VISTA LATERAL (fondo a la izquierda, frente a la derecha)', MARGIN, y, { size: 8, style: 'bold', color: COLORS.muted });
  drawElevation(doc, model, 'side', { x: MARGIN + 12, y: y + 6, w: usableW - 30, h: 78 });

  // Legend.
  const legend: Array<[PanelRole, string]> = [
    ['side', 'Costados / divisores'],
    ['top', 'Techo / piso'],
    ['shelf', 'Entrepaños'],
    ['door', 'Puertas / frentes'],
    ['drawer-side', 'Cajas de cajón'],
  ];
  let lx = MARGIN;
  const ly = PORTRAIT.h - 26;
  for (const [role, label] of legend) {
    setFill(doc, ROLE_FILL[role]);
    setDraw(doc, COLORS.ink);
    doc.rect(lx, ly, 4, 4, 'FD');
    write(doc, label, lx + 5.5, ly + 0.3, { size: 7.5 });
    lx += 37;
  }
};

// ---------------------------------------------------------------------------
// Cut list, hardware, checks
// ---------------------------------------------------------------------------

const drawCutListPage = (doc: jsPDF, model: FurnitureModel, bom: BillOfMaterials): void => {
  const y = sectionTitle(
    doc,
    'Despiece',
    'Largo = sentido de la veta. Corte = medida de sierra (terminada menos canto). Cantos: L1/L2 largos, W1/W2 cortos.',
  );
  const rows: RowInput[] = groupParts(model.panels).map((g) => [
    g.codes.join(', '),
    g.name,
    `${g.codes.length}`,
    `${mm(g.length)} × ${mm(g.width)}`,
    `${g.cutLength} × ${g.cutWidth}`,
    `${g.thickness}`,
    g.material,
    g.banding,
    g.grain ? 'Sí' : '-',
  ]);
  const endY = table(doc, {
    startY: y,
    head: [['Código', 'Pieza', 'Cant.', 'Terminada', 'Corte', 'Esp.', 'Material', 'Cantos', 'Veta']],
    body: rows.map((row) => (row as string[]).map(pdfText)),
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right' },
      8: { halign: 'center' },
    },
  });
  write(
    doc,
    `${model.panels.length} piezas · canto requerido: ${bom.edgeBandMeters.toFixed(1)} m (incluye 30 mm de desperdicio por canto).`,
    MARGIN,
    endY + 4,
    { size: 8.5, color: COLORS.muted },
  );
};

const drawHardwarePage = (doc: jsPDF, input: BlueprintInput): void => {
  const { bom, model } = input;
  let y = sectionTitle(doc, 'Herrajes y presupuesto', 'Precios de referencia en MXN; ajústalos con tu proveedor.');
  y = table(doc, {
    startY: y,
    head: [['Herraje', 'Especificación', 'Cant.', 'Unidad', 'P. unitario', 'Importe']],
    body: model.hardware.map((h) => [
      pdfText(h.name),
      pdfText(h.spec),
      `${h.quantity}`,
      h.unit,
      unitMoney(h.unitPrice),
      money(h.quantity * h.unitPrice),
    ]),
    columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
  });

  const costRows: RowInput[] = [
    ...bom.materials.map((m) => [pdfText(m.name), `${m.sheets} tablero(s) × ${money(m.pricePerSheet)}`, money(m.subtotal)]),
    ['Canto', `${bom.edgeBandMeters.toFixed(1)} m`, money(bom.edgeBandCost)],
    ['Herrajes', `${model.hardware.length} conceptos`, money(bom.hardwareCost)],
  ];
  y = table(doc, {
    startY: y + 8,
    head: [['Concepto', 'Detalle', 'Importe']],
    body: costRows,
    foot: [['Total estimado', '', money(bom.total)]],
    footStyles: { fillColor: COLORS.accentSoft, textColor: COLORS.ink, fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'right' } },
  });

  y = table(doc, {
    startY: y + 8,
    head: [['Revisión estructural', 'Estado', 'Detalle']],
    body: model.checks.map((c) => [pdfText(c.title), SEVERITY_LABEL[c.severity], pdfText(c.message)]),
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 20, fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 1) return;
      const check = model.checks[data.row.index];
      if (check) data.cell.styles.textColor = SEVERITY_COLOR[check.severity];
    },
  });
  write(
    doc,
    'Flecha calculada con viga simplemente apoyada y carga uniforme (5wL^4/384EI) más fluencia a largo plazo según el material.',
    MARGIN,
    y + 4,
    { size: 7.5, color: COLORS.muted, maxWidth: PORTRAIT.w - 2 * MARGIN },
  );
};

// ---------------------------------------------------------------------------
// Cut maps
// ---------------------------------------------------------------------------

const drawSheet = (doc: jsPDF, sheet: CutSheet, totalForMaterial: number, heuristic: string): void => {
  const material = getMaterial(sheet.materialId);
  const y0 = sectionTitle(
    doc,
    `Plano de corte · ${material.name}`,
    `Tablero ${sheet.index} de ${totalForMaterial} · ${sheet.sheetLength} × ${sheet.sheetWidth} mm · aprovechamiento ${Math.round(
      sheet.efficiency * 100,
    )} % · ${heuristic}`,
  );
  const area = { x: MARGIN, y: y0 + 2, w: LANDSCAPE.w - 2 * MARGIN, h: 128 };
  const scale = Math.min(area.w / sheet.sheetLength, area.h / sheet.sheetWidth);
  const ox = area.x + (area.w - sheet.sheetLength * scale) / 2;
  const oy = area.y;
  const sx = (v: number): number => ox + v * scale;
  const sy = (v: number): number => oy + v * scale;

  // Sheet and trim.
  setFill(doc, [245, 240, 232]);
  setDraw(doc, COLORS.ink);
  doc.setLineWidth(0.4);
  doc.rect(sx(0), sy(0), sheet.sheetLength * scale, sheet.sheetWidth * scale, 'FD');
  if (sheet.trim > 0) {
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([0.8, 0.8], 0);
    setDraw(doc, COLORS.muted);
    doc.rect(sx(sheet.trim), sy(sheet.trim), (sheet.sheetLength - 2 * sheet.trim) * scale, (sheet.sheetWidth - 2 * sheet.trim) * scale, 'S');
    doc.setLineDashPattern([], 0);
  }

  // Reusable offcuts (≥ 100 × 100 mm).
  for (const rect of sheet.freeRects.filter((r) => r.w >= 100 && r.h >= 100)) {
    setFill(doc, [236, 252, 203]);
    doc.rect(sx(rect.x), sy(rect.y), rect.w * scale, rect.h * scale, 'F');
    if (rect.w * scale > 22 && rect.h * scale > 6) {
      write(doc, `Retazo ${mm(rect.w)}×${mm(rect.h)}`, sx(rect.x + rect.w / 2), sy(rect.y + rect.h / 2) - 1.5, {
        size: 6,
        color: [77, 124, 15],
        align: 'center',
      });
    }
  }

  // Parts.
  doc.setLineWidth(0.25);
  for (const p of sheet.placements) {
    setFill(doc, [255, 255, 255]);
    setDraw(doc, COLORS.ink);
    doc.rect(sx(p.x), sy(p.y), p.w * scale, p.h * scale, 'FD');
    const cx = sx(p.x + p.w / 2);
    const cy = sy(p.y + p.h / 2);
    const boxW = p.w * scale;
    const boxH = p.h * scale;
    if (boxW > 8 && boxH > 4) {
      const size = Math.max(5, Math.min(10, boxH * 1.4, boxW * 0.9));
      write(doc, p.part.code, cx, cy - size * 0.3528 * (boxH > 10 ? 1.1 : 0.55), { size, style: 'bold', align: 'center' });
      if (boxH > 10 && boxW > 20) {
        write(doc, `${mm(p.part.length)} × ${mm(p.part.width)}${p.rotated ? ' (girada)' : ''}`, cx, cy + 0.8, {
          size: 6,
          color: COLORS.muted,
          align: 'center',
        });
      }
    }
    // Edge banding marks on the drawn rectangle (thicker accent lines).
    const band = p.part.edgeBanding;
    setDraw(doc, COLORS.accent);
    doc.setLineWidth(0.7);
    const x1 = sx(p.x);
    const y1 = sy(p.y);
    const x2 = sx(p.x + p.w);
    const y2 = sy(p.y + p.h);
    // Long edges run along X unless the part was rotated on the sheet.
    const longEdges: Array<[number, number, number, number]> = p.rotated
      ? [[x2, y1, x2, y2], [x1, y1, x1, y2]]
      : [[x1, y2, x2, y2], [x1, y1, x2, y1]];
    const shortEdges: Array<[number, number, number, number]> = p.rotated
      ? [[x1, y2, x2, y2], [x1, y1, x2, y1]]
      : [[x2, y1, x2, y2], [x1, y1, x1, y2]];
    const marks = [
      band.L1 ? longEdges[0] : undefined,
      band.L2 ? longEdges[1] : undefined,
      band.W1 ? shortEdges[0] : undefined,
      band.W2 ? shortEdges[1] : undefined,
    ];
    for (const mark of marks) if (mark) doc.line(mark[0], mark[1], mark[2], mark[3]);
    doc.setLineWidth(0.25);
  }

  // Cut lines.
  setDraw(doc, COLORS.critical);
  doc.setLineWidth(0.15);
  doc.setLineDashPattern([1.5, 1], 0);
  for (const cut of sheet.cuts) {
    if (cut.orientation === 'horizontal') doc.line(sx(cut.x), sy(cut.y), sx(cut.x + cut.length), sy(cut.y));
    else doc.line(sx(cut.x), sy(cut.y), sx(cut.x), sy(cut.y + cut.length));
  }
  doc.setLineDashPattern([], 0);

  // Grain direction arrow.
  if (material.hasGrain) {
    const gy = sy(sheet.sheetWidth) + 4;
    setDraw(doc, COLORS.muted);
    doc.setLineWidth(0.3);
    doc.line(sx(0), gy, sx(0) + 30, gy);
    doc.line(sx(0) + 30, gy, sx(0) + 28, gy - 1);
    doc.line(sx(0) + 30, gy, sx(0) + 28, gy + 1);
    write(doc, 'Veta', sx(0) + 32, gy - 1.6, { size: 7, color: COLORS.muted });
  }

  // Part list for this sheet.
  const listY = sy(sheet.sheetWidth) + 9;
  const entries = [...sheet.placements]
    .sort((a, b) => a.part.code.localeCompare(b.part.code, 'es', { numeric: true }))
    .map((p) => `${p.part.code} ${p.part.label} ${mm(p.part.length)}×${mm(p.part.width)}`);
  write(doc, entries.join('   ·   '), MARGIN, listY, { size: 7, color: COLORS.ink, maxWidth: LANDSCAPE.w - 2 * MARGIN });
  write(
    doc,
    `Líneas rojas punteadas: cortes de guillotina (${sheet.cuts.length}). Naranja: cantos a enchapar. Verde: retazos aprovechables.`,
    MARGIN,
    LANDSCAPE.h - 22,
    { size: 7, color: COLORS.muted },
  );
};

const drawUnplacedPage = (doc: jsPDF, plan: CutPlan): void => {
  const unplaced = plan.materials.flatMap((m) => m.unplaced);
  if (unplaced.length === 0) return;
  doc.addPage('a4', 'portrait');
  const y = sectionTitle(doc, 'Piezas que no caben en un tablero', 'Requieren un tablero mayor, unión de dos piezas o cambiar medidas.');
  table(doc, {
    startY: y,
    head: [['Código', 'Pieza', 'Medida', 'Motivo']],
    body: unplaced.map((u) => [u.part.code, pdfText(u.part.label), `${mm(u.part.length)} × ${mm(u.part.width)}`, pdfText(u.reason)]),
    headStyles: { fillColor: COLORS.critical },
  });
};

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const HARDWARE_SHORT: Readonly<Record<string, string>> = {
  'confirmat-screw': 'confirmat',
  'cam-lock': 'excéntricas',
  'cam-bolt': 'pernos',
  dowel: 'taquetes',
  'wood-glue': 'pegamento',
  'shelf-pin': 'soportes',
  hinge: 'bisagras',
  'drawer-slide': 'pares de correderas',
  handle: 'jaladeras',
  'back-nail': 'clavos',
  'wood-screw': 'pijas',
  leveler: 'niveladores',
  'wall-anchor': 'kit antivuelco',
};

const drawAssembly = (doc: jsPDF, model: FurnitureModel): void => {
  doc.addPage('a4', 'portrait');
  let y = sectionTitle(doc, 'Instrucciones de armado', `${model.assemblySteps.length} pasos · sigue el orden para mantener el mueble a escuadra.`);
  const codeOf = new Map(model.panels.map((p) => [p.id, p.code]));
  const width = PORTRAIT.w - 2 * MARGIN - 14;

  for (const step of model.assemblySteps) {
    const codes = step.panelIds.map((id) => codeOf.get(id)).filter((c): c is string => Boolean(c));
    const partsText = codes.length === 0 ? '' : codes.length === model.panels.length ? 'Todas las piezas' : `Piezas: ${codes.join(', ')}`;
    const hwText = step.hardware.map((h) => `${h.quantity} ${HARDWARE_SHORT[h.kind] ?? h.kind}`).join(' · ');
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(pdfText(step.description), width).length;
    const estimated = 10 + descLines * 4.2 + (partsText ? 5 : 0) + (hwText ? 5 : 0) + (step.tip ? 9 : 0);
    if (y + estimated > PORTRAIT.h - 20) {
      doc.addPage('a4', 'portrait');
      y = sectionTitle(doc, 'Instrucciones de armado', 'Continuación');
    }

    setFill(doc, COLORS.accent);
    doc.circle(MARGIN + 4.5, y + 3.2, 4, 'F');
    write(doc, `${step.order}`, MARGIN + 4.5, y + 1, { size: 10, style: 'bold', color: [255, 255, 255], align: 'center' });
    let ty = write(doc, step.title, MARGIN + 13, y, { size: 11.5, style: 'bold' });
    ty = write(doc, step.description, MARGIN + 13, ty + 1, { size: 9, maxWidth: width });
    if (partsText) ty = write(doc, partsText, MARGIN + 13, ty + 1, { size: 8, color: COLORS.muted, maxWidth: width });
    if (hwText) ty = write(doc, `Herrajes: ${hwText}`, MARGIN + 13, ty + 0.5, { size: 8, color: COLORS.blueprint, maxWidth: width });
    if (step.tip) {
      const tipLines: string[] = doc.splitTextToSize(pdfText(`Consejo: ${step.tip}`), width - 4);
      const tipH = tipLines.length * 3.6 + 3;
      setFill(doc, COLORS.accentSoft);
      doc.roundedRect(MARGIN + 13, ty + 1.5, width, tipH, 1, 1, 'F');
      write(doc, `Consejo: ${step.tip}`, MARGIN + 15, ty + 3, { size: 8, maxWidth: width - 4 });
      ty += tipH + 2;
    }
    y = ty + 6;
  }
};

// ---------------------------------------------------------------------------
// Footer & entry points
// ---------------------------------------------------------------------------

const drawFooters = (doc: jsPDF, input: BlueprintInput): void => {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    setDraw(doc, COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, h - 12, w - MARGIN, h - 12);
    write(doc, `${input.appName} · ${input.model.config.name}`, MARGIN, h - 10, { size: 7.5, color: COLORS.muted });
    write(doc, `Página ${page} de ${pages}`, w - MARGIN, h - 10, { size: 7.5, color: COLORS.muted, align: 'right' });
  }
};

export const createBlueprintPdf = (input: BlueprintInput): jsPDF => {
  const date = input.generatedAt ?? new Date();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  doc.setProperties({
    title: pdfText(`${input.model.config.name} - plano de fabricación`),
    subject: 'Despiece, plano de corte e instrucciones de armado',
    creator: input.appName,
    author: input.appName,
  });

  drawCover(doc, input, date);
  doc.addPage('a4', 'portrait');
  drawViewsPage(doc, input.model);
  doc.addPage('a4', 'portrait');
  drawCutListPage(doc, input.model, input.bom);
  doc.addPage('a4', 'portrait');
  drawHardwarePage(doc, input);

  for (const materialPlan of input.plan.materials) {
    for (const sheet of materialPlan.sheets) {
      doc.addPage('a4', 'landscape');
      drawSheet(doc, sheet, materialPlan.sheets.length, materialPlan.heuristic);
    }
  }
  drawUnplacedPage(doc, input.plan);
  drawAssembly(doc, input.model);
  drawFooters(doc, input);
  return doc;
};

/** Builds the PDF and triggers a browser download. Returns the file name. */
export const exportBlueprint = (input: BlueprintInput): string => {
  const doc = createBlueprintPdf(input);
  const fileName = `${slugify(input.model.config.name)}-plano.pdf`;
  doc.save(fileName);
  return fileName;
};
