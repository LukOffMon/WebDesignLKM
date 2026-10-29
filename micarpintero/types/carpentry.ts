/**
 * Domain model for MiCarpintero.
 *
 * Units: every length is in millimetres, every mass in kilograms, every price
 * in the project currency (MXN by default). The world coordinate system is
 * right-handed with Y up: X runs left → right across the width, Y runs floor →
 * ceiling, Z runs back → front. The origin sits on the floor at the centre of
 * the furniture footprint.
 */

export type Vec3 = readonly [number, number, number];

/** Column-major 4x4 matrix, the layout Three.js `Matrix4.fromArray` expects. */
export type Matrix4Tuple = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

export type Axis = 'x' | 'y' | 'z';

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

export type MaterialId =
  | 'melamine-white-18'
  | 'melamine-oak-18'
  | 'mdf-18'
  | 'mdf-15'
  | 'plywood-birch-18'
  | 'pine-solid-19'
  | 'hdf-3'
  | 'plywood-6';

export type MaterialFamily = 'melamine' | 'mdf' | 'plywood' | 'solid' | 'hdf';

export interface SheetMaterial {
  id: MaterialId;
  name: string;
  family: MaterialFamily;
  thickness: number;
  /** Stock sheet size; length runs along the grain when `hasGrain` is true. */
  sheetLength: number;
  sheetWidth: number;
  pricePerSheet: number;
  densityKgM3: number;
  /** Modulus of elasticity (bending), MPa = N/mm². */
  elasticModulusMPa: number;
  /** Long-term deflection multiplier (creep) applied to static loads. */
  creepFactor: number;
  hasGrain: boolean;
  /** Base colour for the viewport and the PDF swatches (CSS hex). */
  color: string;
  /** Secondary colour used to paint procedural grain lines. */
  grainColor: string;
  /** Edge banding price per linear metre that matches this board. */
  edgeBandPricePerMeter: number;
  /** True for thin panels meant for backs and drawer bottoms only. */
  backPanelOnly: boolean;
}

// ---------------------------------------------------------------------------
// Configuration (what the user edits)
// ---------------------------------------------------------------------------

export type FurnitureTemplate = 'bookshelf' | 'cabinet' | 'dresser';

export type JoineryMethod = 'confirmat' | 'cam-lock' | 'dowel';

export type LoadProfile = 'decor' | 'clothes' | 'books' | 'heavy';

export interface FurnitureDimensions {
  width: number;
  height: number;
  depth: number;
  /** Carcass board thickness; it always mirrors the selected material. */
  thickness: number;
}

export interface FurnitureConfig {
  id: string;
  name: string;
  template: FurnitureTemplate;
  dimensions: FurnitureDimensions;
  materialId: MaterialId;
  backMaterialId: MaterialId;
  /** Vertical bays separated by dividers (bookshelf only). */
  bayCount: number;
  /** Adjustable shelves per bay (bookshelf, cabinet). */
  shelfCount: number;
  /** Overlay doors (cabinet only). */
  doorCount: number;
  /** Stacked drawers (dresser only). */
  drawerCount: number;
  hasBack: boolean;
  hasKick: boolean;
  kickHeight: number;
  joinery: JoineryMethod;
  loadProfile: LoadProfile;
  /** Gap between overlay fronts (doors, drawer fronts), mm. */
  frontGap: number;
  edgeBandThickness: number;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Geometry output (what the engine derives)
// ---------------------------------------------------------------------------

export type PanelRole =
  | 'side'
  | 'top'
  | 'bottom'
  | 'shelf'
  | 'divider'
  | 'back'
  | 'kick'
  | 'door'
  | 'drawer-front'
  | 'drawer-side'
  | 'drawer-back'
  | 'drawer-inner-front'
  | 'drawer-bottom';

/**
 * Edge banding flags. L1/L2 are the two long edges, W1/W2 the two short
 * edges of the cut part. L1 and W1 are the "front" and "first" edges.
 */
export interface EdgeBanding {
  L1: boolean;
  L2: boolean;
  W1: boolean;
  W2: boolean;
}

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

export interface Panel {
  id: string;
  /** Short human code printed on labels and cut maps, e.g. "A1". */
  code: string;
  name: string;
  role: PanelRole;
  materialId: MaterialId;
  /** Finished cut length (the grain direction when the board has grain). */
  length: number;
  /** Finished cut width. */
  width: number;
  thickness: number;
  /** Saw size along the length: finished length minus banding on W1/W2. */
  cutLength: number;
  /** Saw size along the width: finished width minus banding on L1/L2. */
  cutWidth: number;
  /** World axis the panel thickness lies along (its face normal). */
  normalAxis: Axis;
  /** World axis the cut length lies along. */
  lengthAxis: Axis;
  /** Centre of the panel in world space. */
  position: Vec3;
  /** Extents along world X, Y, Z. */
  size: Vec3;
  /** Local AABB, centred on the origin (half-extents ±size/2). */
  localBounds: BoundingBox;
  /** World-space AABB. */
  worldBounds: BoundingBox;
  /** Local → world transform. */
  matrix: Matrix4Tuple;
  /** Unit vector the panel travels along in the exploded view. */
  explodeDirection: Vec3;
  /** Exploded-view travel at factor 1, mm. */
  explodeDistance: number;
  edgeBanding: EdgeBanding;
  /** When true the optimizer may not rotate the part on the sheet. */
  grainLocked: boolean;
  /** Assembly step that installs this panel. */
  assemblyStep: number;
  /** Group used to keep drawer parts together in lists. */
  group: string;
}

export type HardwareKind =
  | 'confirmat-screw'
  | 'cam-lock'
  | 'cam-bolt'
  | 'dowel'
  | 'wood-glue'
  | 'shelf-pin'
  | 'hinge'
  | 'drawer-slide'
  | 'handle'
  | 'back-nail'
  | 'wood-screw'
  | 'leveler'
  | 'wall-anchor';

export interface HardwareItem {
  id: string;
  kind: HardwareKind;
  name: string;
  spec: string;
  quantity: number;
  unit: 'pz' | 'par' | 'ml' | 'juego';
  unitPrice: number;
  /** Assembly step where this hardware is first used. */
  assemblyStep: number;
}

export interface AssemblyStep {
  order: number;
  title: string;
  description: string;
  panelIds: string[];
  hardware: Array<{ kind: HardwareKind; quantity: number }>;
  tip: string | null;
}

export type CheckSeverity = 'ok' | 'warning' | 'critical';

export interface StructuralCheck {
  id: string;
  kind: 'shelf-deflection' | 'span-limit' | 'tip-over' | 'hinge-count' | 'drawer-depth' | 'proportion';
  panelId: string | null;
  title: string;
  severity: CheckSeverity;
  message: string;
  /** Measured value (e.g. deflection, mm) and its allowed limit. */
  value: number;
  limit: number;
  unit: string;
}

export interface ShelfDeflectionResult {
  spanMm: number;
  depthMm: number;
  thicknessMm: number;
  loadKg: number;
  selfWeightKg: number;
  /** Instant elastic deflection, mm. */
  instantMm: number;
  /** Long-term deflection including creep, mm. */
  longTermMm: number;
  /** Allowed long-term sag (span / 200), mm. */
  limitMm: number;
  ratio: number;
  severity: CheckSeverity;
}

export interface FurnitureModel {
  config: FurnitureConfig;
  panels: Panel[];
  hardware: HardwareItem[];
  assemblySteps: AssemblyStep[];
  checks: StructuralCheck[];
  bounds: BoundingBox;
  totalWeightKg: number;
}

// ---------------------------------------------------------------------------
// Cut optimization
// ---------------------------------------------------------------------------

export interface OptimizerSettings {
  /** Saw blade kerf, mm. */
  kerf: number;
  /** Factory edge trimmed from every side of a sheet, mm. */
  trim: number;
  /** Lets non-grain parts rotate 90° on the sheet. */
  allowRotation: boolean;
}

export interface CutPart {
  id: string;
  panelId: string;
  code: string;
  label: string;
  materialId: MaterialId;
  /** Required size along the sheet length (X on the cut map). */
  length: number;
  /** Required size along the sheet width (Y on the cut map). */
  width: number;
  thickness: number;
  canRotate: boolean;
  edgeBanding: EdgeBanding;
}

/** Axis-aligned rectangle on a sheet, origin at the sheet's top-left corner. */
export interface SheetRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Placement extends SheetRect {
  part: CutPart;
  rotated: boolean;
}

export interface GuillotineCut {
  orientation: 'horizontal' | 'vertical';
  /** Start point and length of the cut line, sheet coordinates. */
  x: number;
  y: number;
  length: number;
}

export interface CutSheet {
  id: string;
  index: number;
  materialId: MaterialId;
  sheetLength: number;
  sheetWidth: number;
  trim: number;
  placements: Placement[];
  freeRects: SheetRect[];
  cuts: GuillotineCut[];
  usedArea: number;
  wasteArea: number;
  /** usedArea / full sheet area, 0..1 */
  efficiency: number;
}

export interface UnplacedPart {
  part: CutPart;
  reason: string;
}

export interface MaterialCutPlan {
  materialId: MaterialId;
  sheets: CutSheet[];
  unplaced: UnplacedPart[];
  heuristic: string;
  partsArea: number;
  sheetsArea: number;
  efficiency: number;
  totalCutLength: number;
}

export interface CutPlan {
  settings: OptimizerSettings;
  materials: MaterialCutPlan[];
  totalSheets: number;
  overallEfficiency: number;
  generatedAt: number;
}

// ---------------------------------------------------------------------------
// Bill of materials / costing
// ---------------------------------------------------------------------------

export interface MaterialLine {
  materialId: MaterialId;
  name: string;
  sheets: number;
  pricePerSheet: number;
  subtotal: number;
}

export interface BillOfMaterials {
  materials: MaterialLine[];
  hardware: HardwareItem[];
  edgeBandMeters: number;
  edgeBandCost: number;
  hardwareCost: number;
  materialCost: number;
  total: number;
}

// ---------------------------------------------------------------------------
// PDF tutorial ingestion
// ---------------------------------------------------------------------------

export interface ExtractedLine {
  page: number;
  text: string;
  /** Average glyph height, used to tell headings from body text. */
  fontSize: number;
  y: number;
}

export interface GuideStep {
  id: string;
  order: number;
  title: string;
  body: string;
  page: number;
  dimensions: string[];
  tools: string[];
  hardware: string[];
  warnings: string[];
  completed: boolean;
  completedAt: number | null;
  /** Milliseconds spent with this step active. */
  elapsedMs: number;
  note: string;
}

export type GuideSource = 'pdf' | 'project';

export interface ParsedGuide {
  id: string;
  source: GuideSource;
  title: string;
  fileName: string;
  pageCount: number;
  parsedAt: number;
  detection: 'numbered-headings' | 'font-headings' | 'paragraphs' | 'project';
  steps: GuideStep[];
  activeStepId: string | null;
  tools: string[];
}
