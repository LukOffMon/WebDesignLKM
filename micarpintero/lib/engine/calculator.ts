import type {
  AssemblyStep,
  Axis,
  BillOfMaterials,
  BoundingBox,
  CheckSeverity,
  CutPlan,
  EdgeBanding,
  FurnitureConfig,
  FurnitureModel,
  FurnitureTemplate,
  HardwareItem,
  HardwareKind,
  MaterialId,
  MaterialLine,
  Matrix4Tuple,
  Panel,
  PanelRole,
  ShelfDeflectionResult,
  StructuralCheck,
  Vec3,
} from '@/types/carpentry';
import { LOAD_PROFILES, MATERIALS, RECOMMENDED_SPAN_PER_18MM, getMaterial } from './materials';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRAVITY = 9.81;
/** Standard side-mount slide clearance per side (1/2"). */
const SLIDE_CLEARANCE = 12.7;
const STANDARD_SLIDE_LENGTHS = [250, 300, 350, 400, 450, 500, 550, 600] as const;
const SHELF_SIDE_CLEARANCE = 1;
const SHELF_FRONT_SETBACK = 10;
const KICK_RECESS = 40;
/** Drawer box clearance above and below, measured from the front's edges. */
const DRAWER_VERTICAL_CLEARANCE = 5;
const MIN_DRAWER_BOX_HEIGHT = 60;
const MAX_DOOR_WIDTH = 600;
/** Long-term sag limits as a fraction of the span. */
const SAG_LIMIT_OK = 1 / 200;
const SAG_LIMIT_WARNING = 1 / 120;

export interface DimensionRange {
  min: number;
  max: number;
}

export interface TemplateLimits {
  width: DimensionRange;
  height: DimensionRange;
  depth: DimensionRange;
  bayCount: DimensionRange;
  shelfCount: DimensionRange;
  doorCount: DimensionRange;
  drawerCount: DimensionRange;
  kickHeight: DimensionRange;
}

export const TEMPLATE_LIMITS: Readonly<Record<FurnitureTemplate, TemplateLimits>> = {
  bookshelf: {
    width: { min: 300, max: 2400 },
    height: { min: 300, max: 2600 },
    depth: { min: 180, max: 600 },
    bayCount: { min: 1, max: 5 },
    shelfCount: { min: 0, max: 10 },
    doorCount: { min: 0, max: 0 },
    drawerCount: { min: 0, max: 0 },
    kickHeight: { min: 40, max: 150 },
  },
  cabinet: {
    width: { min: 300, max: 1800 },
    height: { min: 300, max: 2400 },
    depth: { min: 250, max: 700 },
    bayCount: { min: 1, max: 1 },
    shelfCount: { min: 0, max: 8 },
    doorCount: { min: 1, max: 4 },
    drawerCount: { min: 0, max: 0 },
    kickHeight: { min: 40, max: 150 },
  },
  dresser: {
    width: { min: 350, max: 1600 },
    height: { min: 350, max: 1400 },
    depth: { min: 330, max: 650 },
    bayCount: { min: 1, max: 1 },
    shelfCount: { min: 0, max: 0 },
    doorCount: { min: 0, max: 0 },
    drawerCount: { min: 1, max: 8 },
    kickHeight: { min: 40, max: 150 },
  },
};

export const TEMPLATE_LABELS: Readonly<Record<FurnitureTemplate, string>> = {
  bookshelf: 'Librero',
  cabinet: 'Gabinete con puertas',
  dresser: 'Cajonera',
};

const ROLE_LABELS: Readonly<Record<PanelRole, string>> = {
  side: 'Costado',
  top: 'Techo',
  bottom: 'Piso',
  shelf: 'Entrepaño',
  divider: 'Divisor',
  back: 'Fondo',
  kick: 'Zócalo',
  door: 'Puerta',
  'drawer-front': 'Frente de cajón',
  'drawer-side': 'Lateral de cajón',
  'drawer-back': 'Trasera de cajón',
  'drawer-inner-front': 'Contrafrente de cajón',
  'drawer-bottom': 'Fondo de cajón',
};

const ROLE_CODES: Readonly<Record<PanelRole, string>> = {
  side: 'A',
  top: 'B',
  bottom: 'B',
  divider: 'C',
  shelf: 'D',
  back: 'E',
  kick: 'F',
  door: 'G',
  'drawer-front': 'H',
  'drawer-side': 'J',
  'drawer-inner-front': 'K',
  'drawer-back': 'K',
  'drawer-bottom': 'L',
};

export const getRoleLabel = (role: PanelRole): string => ROLE_LABELS[role];

// ---------------------------------------------------------------------------
// Small math helpers
// ---------------------------------------------------------------------------

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round1 = (value: number): number => Math.round(value * 10) / 10;

const AXIS_INDEX: Readonly<Record<Axis, 0 | 1 | 2>> = { x: 0, y: 1, z: 2 };

const remainingAxis = (a: Axis, b: Axis): Axis => {
  const all: Axis[] = ['x', 'y', 'z'];
  const rest = all.find((axis) => axis !== a && axis !== b);
  if (!rest) throw new Error(`Axes ${a} and ${b} must differ`);
  return rest;
};

const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(v[0], v[1], v[2]);
  return length === 0 ? [0, 0, 0] : [v[0] / length, v[1] / length, v[2] / length];
};

/**
 * Composes translation · rotation(XYZ Euler) · scale into a column-major 4x4
 * matrix, matching Three.js `Matrix4.compose` with an 'XYZ' Euler order.
 */
export const composeTransform = (
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
  scale: Vec3 = [1, 1, 1],
): Matrix4Tuple => {
  const [rx, ry, rz] = rotation;
  const a = Math.cos(rx);
  const b = Math.sin(rx);
  const c = Math.cos(ry);
  const d = Math.sin(ry);
  const e = Math.cos(rz);
  const f = Math.sin(rz);
  const ae = a * e;
  const af = a * f;
  const be = b * e;
  const bf = b * f;
  const [sx, sy, sz] = scale;

  // Rotation matrix elements (row, column) for XYZ order.
  const m11 = c * e;
  const m12 = -c * f;
  const m13 = d;
  const m21 = af + be * d;
  const m22 = ae - bf * d;
  const m23 = -b * c;
  const m31 = bf - ae * d;
  const m32 = be + af * d;
  const m33 = a * c;

  return [
    m11 * sx, m21 * sx, m31 * sx, 0,
    m12 * sy, m22 * sy, m32 * sy, 0,
    m13 * sz, m23 * sz, m33 * sz, 0,
    position[0], position[1], position[2], 1,
  ];
};

/** Transforms a point by a column-major 4x4 matrix. */
export const transformPoint = (m: Matrix4Tuple, p: Vec3): Vec3 => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];

/** World AABB of a local box after an arbitrary affine transform. */
export const transformBounds = (m: Matrix4Tuple, local: BoundingBox): BoundingBox => {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let corner = 0; corner < 8; corner += 1) {
    const point: Vec3 = [
      corner & 1 ? local.max[0] : local.min[0],
      corner & 2 ? local.max[1] : local.min[1],
      corner & 4 ? local.max[2] : local.min[2],
    ];
    const world = transformPoint(m, point);
    for (let i = 0; i < 3; i += 1) {
      const value = world[i] ?? 0;
      min[i] = Math.min(min[i] ?? Infinity, value);
      max[i] = Math.max(max[i] ?? -Infinity, value);
    }
  }
  return { min, max };
};

export const mergeBounds = (boxes: readonly BoundingBox[]): BoundingBox => {
  if (boxes.length === 0) return { min: [0, 0, 0], max: [0, 0, 0] };
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const box of boxes) {
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i] ?? Infinity, box.min[i] ?? 0);
      max[i] = Math.max(max[i] ?? -Infinity, box.max[i] ?? 0);
    }
  }
  return { min, max };
};

// ---------------------------------------------------------------------------
// Panel factory
// ---------------------------------------------------------------------------

interface PanelSpec {
  id: string;
  role: PanelRole;
  name?: string;
  materialId: MaterialId;
  thickness: number;
  normalAxis: Axis;
  lengthAxis: Axis;
  length: number;
  width: number;
  position: Vec3;
  explodeDirection: Vec3;
  explodeDistance: number;
  edgeBanding: EdgeBanding;
  assemblyStep: number;
  group: string;
}

const NO_BANDING: EdgeBanding = { L1: false, L2: false, W1: false, W2: false };
const FRONT_BANDING: EdgeBanding = { L1: true, L2: false, W1: false, W2: false };
const ALL_BANDING: EdgeBanding = { L1: true, L2: true, W1: true, W2: true };

const createPanel = (spec: PanelSpec, code: string, bandThickness: number): Panel => {
  const material = getMaterial(spec.materialId);
  const widthAxis = remainingAxis(spec.normalAxis, spec.lengthAxis);
  const size: [number, number, number] = [0, 0, 0];
  size[AXIS_INDEX[spec.normalAxis]] = spec.thickness;
  size[AXIS_INDEX[spec.lengthAxis]] = spec.length;
  size[AXIS_INDEX[widthAxis]] = spec.width;

  const localBounds: BoundingBox = {
    min: [-size[0] / 2, -size[1] / 2, -size[2] / 2],
    max: [size[0] / 2, size[1] / 2, size[2] / 2],
  };
  const matrix = composeTransform(spec.position);

  return {
    id: spec.id,
    code,
    name: spec.name ?? ROLE_LABELS[spec.role],
    role: spec.role,
    materialId: spec.materialId,
    length: round1(spec.length),
    width: round1(spec.width),
    thickness: spec.thickness,
    cutLength: round1(spec.length - bandThickness * (Number(spec.edgeBanding.W1) + Number(spec.edgeBanding.W2))),
    cutWidth: round1(spec.width - bandThickness * (Number(spec.edgeBanding.L1) + Number(spec.edgeBanding.L2))),
    normalAxis: spec.normalAxis,
    lengthAxis: spec.lengthAxis,
    position: spec.position,
    size,
    localBounds,
    worldBounds: transformBounds(matrix, localBounds),
    matrix,
    explodeDirection: normalize(spec.explodeDirection),
    explodeDistance: spec.explodeDistance,
    edgeBanding: spec.edgeBanding,
    grainLocked: material.hasGrain,
    assemblyStep: spec.assemblyStep,
    group: spec.group,
  };
};

const assignCodes = (specs: readonly PanelSpec[], bandThickness: number): Panel[] => {
  const counters = new Map<string, number>();
  return specs.map((spec) => {
    const letter = ROLE_CODES[spec.role];
    const next = (counters.get(letter) ?? 0) + 1;
    counters.set(letter, next);
    return createPanel(spec, `${letter}${next}`, bandThickness);
  });
};

// ---------------------------------------------------------------------------
// Defaults & validation
// ---------------------------------------------------------------------------

const TEMPLATE_DEFAULTS: Readonly<
  Record<FurnitureTemplate, Pick<FurnitureConfig, 'dimensions' | 'bayCount' | 'shelfCount' | 'doorCount' | 'drawerCount' | 'loadProfile'>>
> = {
  bookshelf: {
    dimensions: { width: 900, height: 1800, depth: 320, thickness: 18 },
    bayCount: 2,
    shelfCount: 4,
    doorCount: 0,
    drawerCount: 0,
    loadProfile: 'books',
  },
  cabinet: {
    dimensions: { width: 800, height: 900, depth: 450, thickness: 18 },
    bayCount: 1,
    shelfCount: 1,
    doorCount: 2,
    drawerCount: 0,
    loadProfile: 'decor',
  },
  dresser: {
    dimensions: { width: 800, height: 850, depth: 480, thickness: 18 },
    bayCount: 1,
    shelfCount: 0,
    doorCount: 0,
    drawerCount: 4,
    loadProfile: 'clothes',
  },
};

export const createDefaultConfig = (
  template: FurnitureTemplate,
  id: string,
  name: string = TEMPLATE_LABELS[template],
  now: number = Date.now(),
): FurnitureConfig => {
  const defaults = TEMPLATE_DEFAULTS[template];
  return {
    id,
    name,
    template,
    dimensions: { ...defaults.dimensions },
    materialId: 'melamine-white-18',
    backMaterialId: 'hdf-3',
    bayCount: defaults.bayCount,
    shelfCount: defaults.shelfCount,
    doorCount: defaults.doorCount,
    drawerCount: defaults.drawerCount,
    hasBack: true,
    hasKick: true,
    kickHeight: 70,
    joinery: 'confirmat',
    loadProfile: defaults.loadProfile,
    frontGap: 3,
    edgeBandThickness: 1,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Brings any (possibly hand-edited or migrated) configuration back inside the
 * template limits and keeps the thickness in sync with the material.
 */
export const sanitizeConfig = (config: FurnitureConfig): FurnitureConfig => {
  const limits = TEMPLATE_LIMITS[config.template];
  const carcass = MATERIALS[config.materialId] ?? MATERIALS['melamine-white-18'];
  const back = MATERIALS[config.backMaterialId] ?? MATERIALS['hdf-3'];
  const intOr = (value: number, range: { min: number; max: number }): number =>
    clamp(Number.isFinite(value) ? Math.round(value) : range.min, range.min, range.max);

  const width = intOr(config.dimensions.width, limits.width);
  const height = intOr(config.dimensions.height, limits.height);
  const depth = intOr(config.dimensions.depth, limits.depth);
  const kickHeight = intOr(config.kickHeight, limits.kickHeight);

  // Bays must stay wide enough for a usable shelf (≥ 150 mm).
  const maxBaysByWidth = Math.max(1, Math.floor((width - carcass.thickness) / (150 + carcass.thickness)));
  // Drawer fronts need at least 100 mm each.
  const usableHeight = height - (config.hasKick ? kickHeight : 0);
  const maxDrawersByHeight = Math.max(1, Math.floor(usableHeight / 100));

  return {
    ...config,
    materialId: carcass.id,
    backMaterialId: back.id,
    dimensions: { width, height, depth, thickness: carcass.thickness },
    kickHeight,
    bayCount: Math.min(intOr(config.bayCount, limits.bayCount), maxBaysByWidth),
    shelfCount: intOr(config.shelfCount, limits.shelfCount),
    doorCount: intOr(config.doorCount, limits.doorCount),
    drawerCount: Math.min(intOr(config.drawerCount, limits.drawerCount), maxDrawersByHeight),
    frontGap: clamp(Number.isFinite(config.frontGap) ? config.frontGap : 3, 1, 6),
    edgeBandThickness: clamp(Number.isFinite(config.edgeBandThickness) ? config.edgeBandThickness : 1, 0.4, 3),
  };
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

interface Layout {
  W: number;
  H: number;
  D: number;
  t: number;
  backT: number;
  frontT: number;
  kick: number;
  carcassDepth: number;
  zBack: number;
  zFront: number;
  zCenter: number;
  innerWidth: number;
  innerBottom: number;
  innerTop: number;
  explodeBase: number;
}

const computeLayout = (config: FurnitureConfig): Layout => {
  const { width: W, height: H, depth: D, thickness: t } = config.dimensions;
  const backT = config.hasBack ? getMaterial(config.backMaterialId).thickness : 0;
  const hasFronts = config.template === 'cabinet' || config.template === 'dresser';
  const frontT = hasFronts ? t : 0;
  const kick = config.hasKick ? config.kickHeight : 0;
  const carcassDepth = D - backT - frontT;
  const zBack = -D / 2 + backT;
  const zFront = zBack + carcassDepth;
  return {
    W,
    H,
    D,
    t,
    backT,
    frontT,
    kick,
    carcassDepth,
    zBack,
    zFront,
    zCenter: (zBack + zFront) / 2,
    innerWidth: W - 2 * t,
    innerBottom: kick + t,
    innerTop: H - t,
    explodeBase: Math.max(W, H, D) * 0.18,
  };
};

const STEP = {
  base: 2,
  carcass: 3,
  dividers: 4,
  back: 5,
  shelves: 6,
  fronts: 7,
  finish: 8,
} as const;

const carcassSpecs = (config: FurnitureConfig, L: Layout): PanelSpec[] => {
  const specs: PanelSpec[] = [];
  const mat = config.materialId;

  for (const side of [-1, 1] as const) {
    specs.push({
      id: side < 0 ? 'side-left' : 'side-right',
      role: 'side',
      name: side < 0 ? 'Costado izquierdo' : 'Costado derecho',
      materialId: mat,
      thickness: L.t,
      normalAxis: 'x',
      lengthAxis: 'y',
      length: L.H,
      width: L.carcassDepth,
      position: [side * (L.W / 2 - L.t / 2), L.H / 2, L.zCenter],
      explodeDirection: [side, 0, 0],
      explodeDistance: L.explodeBase,
      edgeBanding: FRONT_BANDING,
      assemblyStep: STEP.carcass,
      group: 'carcass',
    });
  }

  specs.push({
    id: 'top',
    role: 'top',
    materialId: mat,
    thickness: L.t,
    normalAxis: 'y',
    lengthAxis: 'x',
    length: L.innerWidth,
    width: L.carcassDepth,
    position: [0, L.H - L.t / 2, L.zCenter],
    explodeDirection: [0, 1, 0],
    explodeDistance: L.explodeBase,
    edgeBanding: FRONT_BANDING,
    assemblyStep: STEP.carcass,
    group: 'carcass',
  });

  specs.push({
    id: 'bottom',
    role: 'bottom',
    materialId: mat,
    thickness: L.t,
    normalAxis: 'y',
    lengthAxis: 'x',
    length: L.innerWidth,
    width: L.carcassDepth,
    position: [0, L.kick + L.t / 2, L.zCenter],
    explodeDirection: [0, -1, 0],
    explodeDistance: L.explodeBase * 0.5,
    edgeBanding: FRONT_BANDING,
    assemblyStep: STEP.carcass,
    group: 'carcass',
  });

  if (config.hasKick) {
    specs.push({
      id: 'kick',
      role: 'kick',
      materialId: mat,
      thickness: L.t,
      normalAxis: 'z',
      lengthAxis: 'x',
      length: L.innerWidth,
      width: L.kick,
      position: [0, L.kick / 2, L.zFront - KICK_RECESS - L.t / 2],
      explodeDirection: [0, -0.35, 1],
      explodeDistance: L.explodeBase * 1.2,
      edgeBanding: NO_BANDING,
      assemblyStep: STEP.base,
      group: 'carcass',
    });
  }

  if (config.hasBack) {
    const backHeight = L.H - L.kick;
    specs.push({
      id: 'back',
      role: 'back',
      materialId: config.backMaterialId,
      thickness: L.backT,
      normalAxis: 'z',
      lengthAxis: 'y',
      length: backHeight,
      width: L.W,
      position: [0, L.kick + backHeight / 2, -L.D / 2 + L.backT / 2],
      explodeDirection: [0, 0, -1],
      explodeDistance: L.explodeBase * 1.4,
      edgeBanding: NO_BANDING,
      assemblyStep: STEP.back,
      group: 'carcass',
    });
  }

  return specs;
};

/** X centre and clear width of every bay (between sides and dividers). */
const computeBays = (config: FurnitureConfig, L: Layout): Array<{ center: number; width: number }> => {
  const bays = config.template === 'bookshelf' ? config.bayCount : 1;
  const bayWidth = (L.innerWidth - (bays - 1) * L.t) / bays;
  return Array.from({ length: bays }, (_, i) => ({
    center: -L.innerWidth / 2 + i * (bayWidth + L.t) + bayWidth / 2,
    width: bayWidth,
  }));
};

const dividerSpecs = (config: FurnitureConfig, L: Layout): PanelSpec[] => {
  if (config.template !== 'bookshelf' || config.bayCount < 2) return [];
  const bays = computeBays(config, L);
  const innerHeight = L.innerTop - L.innerBottom;
  return bays.slice(0, -1).map((bay, i) => ({
    id: `divider-${i + 1}`,
    role: 'divider' as const,
    name: `Divisor ${i + 1}`,
    materialId: config.materialId,
    thickness: L.t,
    normalAxis: 'x' as const,
    lengthAxis: 'y' as const,
    length: innerHeight,
    width: L.carcassDepth,
    position: [bay.center + bay.width / 2 + L.t / 2, L.innerBottom + innerHeight / 2, L.zCenter] as Vec3,
    explodeDirection: [0, 0, 1] as Vec3,
    explodeDistance: L.explodeBase * 2.2,
    edgeBanding: FRONT_BANDING,
    assemblyStep: STEP.dividers,
    group: 'carcass',
  }));
};

const shelfSpecs = (config: FurnitureConfig, L: Layout): PanelSpec[] => {
  if (config.template === 'dresser' || config.shelfCount === 0) return [];
  const bays = computeBays(config, L);
  const innerHeight = L.innerTop - L.innerBottom;
  const n = config.shelfCount;
  const gap = (innerHeight - n * L.t) / (n + 1);
  const setback = config.template === 'cabinet' ? SHELF_FRONT_SETBACK * 2 : SHELF_FRONT_SETBACK;
  const shelfDepth = L.carcassDepth - setback;
  const specs: PanelSpec[] = [];

  bays.forEach((bay, bayIndex) => {
    for (let j = 1; j <= n; j += 1) {
      specs.push({
        id: `shelf-${bayIndex + 1}-${j}`,
        role: 'shelf',
        name: bays.length > 1 ? `Entrepaño ${j} · módulo ${bayIndex + 1}` : `Entrepaño ${j}`,
        materialId: config.materialId,
        thickness: L.t,
        normalAxis: 'y',
        lengthAxis: 'x',
        length: bay.width - 2 * SHELF_SIDE_CLEARANCE,
        width: shelfDepth,
        position: [bay.center, L.innerBottom + j * gap + (j - 1) * L.t + L.t / 2, L.zCenter - setback / 2],
        explodeDirection: [0, 0, 1],
        explodeDistance: L.explodeBase * (1.2 + 0.25 * j),
        edgeBanding: FRONT_BANDING,
        assemblyStep: STEP.shelves,
        group: `shelves-${bayIndex + 1}`,
      });
    }
  });
  return specs;
};

export const hingesForDoorHeight = (doorHeight: number): number => {
  if (doorHeight <= 900) return 2;
  if (doorHeight <= 1600) return 3;
  if (doorHeight <= 2000) return 4;
  return 5;
};

const doorSpecs = (config: FurnitureConfig, L: Layout): PanelSpec[] => {
  if (config.template !== 'cabinet') return [];
  const n = config.doorCount;
  const gap = config.frontGap;
  const doorWidth = (L.W - n * gap) / n;
  const doorHeight = L.H - L.kick - gap;
  return Array.from({ length: n }, (_, i) => {
    const x = -L.W / 2 + gap / 2 + doorWidth / 2 + i * (doorWidth + gap);
    const side = n === 1 ? 1 : x < 0 ? -1 : 1;
    return {
      id: `door-${i + 1}`,
      role: 'door' as const,
      name: `Puerta ${i + 1}`,
      materialId: config.materialId,
      thickness: L.t,
      normalAxis: 'z' as const,
      lengthAxis: 'y' as const,
      length: doorHeight,
      width: doorWidth,
      position: [x, L.kick + gap / 2 + doorHeight / 2, L.zFront + L.t / 2] as Vec3,
      explodeDirection: [side * 0.35, 0, 1] as Vec3,
      explodeDistance: L.explodeBase * 2.6,
      edgeBanding: ALL_BANDING,
      assemblyStep: STEP.fronts,
      group: 'fronts',
    };
  });
};

export const pickSlideLength = (availableDepth: number): number | null => {
  let best: number | null = null;
  for (const length of STANDARD_SLIDE_LENGTHS) {
    if (length <= availableDepth) best = length;
  }
  return best;
};

interface DrawerGeometry {
  frontHeight: number;
  boxHeight: number;
  boxOuterWidth: number;
  slideLength: number | null;
  boxDepth: number;
}

const computeDrawerGeometry = (config: FurnitureConfig, L: Layout): DrawerGeometry => {
  const n = Math.max(1, config.drawerCount);
  const gap = config.frontGap;
  const bottomT = getMaterial(config.backMaterialId).thickness;
  const frontHeight = (L.H - L.kick - n * gap) / n;
  const boxHeight = frontHeight - 2 * (L.t + DRAWER_VERTICAL_CLEARANCE) - bottomT;
  const slideLength = pickSlideLength(L.carcassDepth - 15);
  return {
    frontHeight,
    boxHeight,
    boxOuterWidth: L.innerWidth - 2 * SLIDE_CLEARANCE,
    slideLength,
    boxDepth: slideLength ?? Math.max(100, L.carcassDepth - 15),
  };
};

const drawerSpecs = (config: FurnitureConfig, L: Layout): PanelSpec[] => {
  if (config.template !== 'dresser') return [];
  const g = computeDrawerGeometry(config, L);
  const gap = config.frontGap;
  const bottomMat = getMaterial(config.backMaterialId);
  const boxHeight = Math.max(40, g.boxHeight);
  const specs: PanelSpec[] = [];

  for (let i = 0; i < config.drawerCount; i += 1) {
    const n = i + 1;
    const group = `drawer-${n}`;
    const frontBottom = L.kick + gap / 2 + i * (g.frontHeight + gap);
    const frontCenterY = frontBottom + g.frontHeight / 2;
    const bottomY = frontBottom + L.t + DRAWER_VERTICAL_CLEARANCE;
    const boxCenterY = bottomY + bottomMat.thickness + boxHeight / 2;
    const travel = g.boxDepth * 0.85;
    const pull: Vec3 = [0, 0, 1];
    const common = { explodeDirection: pull, explodeDistance: travel, assemblyStep: STEP.fronts, group };

    specs.push({
      ...common,
      id: `${group}-front`,
      role: 'drawer-front',
      name: `Frente cajón ${n}`,
      materialId: config.materialId,
      thickness: L.t,
      normalAxis: 'z',
      lengthAxis: 'x',
      length: L.W - gap,
      width: g.frontHeight,
      position: [0, frontCenterY, L.zFront + L.t / 2],
      edgeBanding: ALL_BANDING,
    });

    for (const side of [-1, 1] as const) {
      specs.push({
        ...common,
        id: `${group}-side-${side < 0 ? 'l' : 'r'}`,
        role: 'drawer-side',
        name: `Lateral ${side < 0 ? 'izq.' : 'der.'} cajón ${n}`,
        materialId: config.materialId,
        thickness: L.t,
        normalAxis: 'x',
        lengthAxis: 'z',
        length: g.boxDepth,
        width: boxHeight,
        position: [side * (g.boxOuterWidth / 2 - L.t / 2), boxCenterY, L.zFront - g.boxDepth / 2],
        edgeBanding: FRONT_BANDING,
      });
    }

    const innerLength = g.boxOuterWidth - 2 * L.t;
    specs.push({
      ...common,
      id: `${group}-inner-front`,
      role: 'drawer-inner-front',
      name: `Contrafrente cajón ${n}`,
      materialId: config.materialId,
      thickness: L.t,
      normalAxis: 'z',
      lengthAxis: 'x',
      length: innerLength,
      width: boxHeight,
      position: [0, boxCenterY, L.zFront - L.t / 2],
      edgeBanding: FRONT_BANDING,
    });
    specs.push({
      ...common,
      id: `${group}-back`,
      role: 'drawer-back',
      name: `Trasera cajón ${n}`,
      materialId: config.materialId,
      thickness: L.t,
      normalAxis: 'z',
      lengthAxis: 'x',
      length: innerLength,
      width: boxHeight,
      position: [0, boxCenterY, L.zFront - g.boxDepth + L.t / 2],
      edgeBanding: FRONT_BANDING,
    });
    specs.push({
      ...common,
      id: `${group}-bottom`,
      role: 'drawer-bottom',
      name: `Fondo cajón ${n}`,
      materialId: config.backMaterialId,
      thickness: bottomMat.thickness,
      normalAxis: 'y',
      lengthAxis: 'x',
      length: g.boxOuterWidth,
      width: g.boxDepth,
      position: [0, bottomY + bottomMat.thickness / 2, L.zFront - g.boxDepth / 2],
      edgeBanding: NO_BANDING,
    });
  }
  return specs;
};

// ---------------------------------------------------------------------------
// Hardware
// ---------------------------------------------------------------------------

/** Fasteners for a butt joint of the given length (≥ 2, roughly every 200 mm). */
export const fastenersPerJoint = (jointLength: number): number => Math.max(2, Math.round(jointLength / 200) + 1);

interface HardwareCatalogEntry {
  name: string;
  spec: string;
  unit: HardwareItem['unit'];
  unitPrice: number;
}

const HARDWARE_CATALOG: Readonly<Record<HardwareKind, HardwareCatalogEntry>> = {
  'confirmat-screw': { name: 'Tornillo confirmat', spec: '7 × 50 mm, broca escalonada 5/7 mm', unit: 'pz', unitPrice: 1.5 },
  'cam-lock': { name: 'Excéntrica (minifix)', spec: 'Ø15 mm, barreno Ø15 × 12.5 mm', unit: 'pz', unitPrice: 6 },
  'cam-bolt': { name: 'Perno para excéntrica', spec: 'Rosca 5 mm, distancia 34 mm', unit: 'pz', unitPrice: 3 },
  dowel: { name: 'Taquete de madera', spec: 'Ø8 × 35 mm, estriado', unit: 'pz', unitPrice: 0.8 },
  'wood-glue': { name: 'Pegamento blanco para madera', spec: 'PVA tipo D3, botella 250 ml', unit: 'pz', unitPrice: 75 },
  'shelf-pin': { name: 'Soporte para entrepaño', spec: 'Pija Ø5 mm, sistema 32 mm', unit: 'pz', unitPrice: 1.2 },
  hinge: { name: 'Bisagra de cazoleta', spec: 'Ø35 mm, cierre suave, codo 0 (sobreponer)', unit: 'pz', unitPrice: 48 },
  'drawer-slide': { name: 'Corredera telescópica', spec: 'Extensión total, 45 kg', unit: 'par', unitPrice: 0 },
  handle: { name: 'Jaladera', spec: 'Barra 128 mm entre centros', unit: 'pz', unitPrice: 62 },
  'back-nail': { name: 'Clavo / grapa para fondo', spec: '25 mm (1")', unit: 'pz', unitPrice: 0.15 },
  'wood-screw': { name: 'Pija para aglomerado', spec: '4 × 30 mm, cabeza plana', unit: 'pz', unitPrice: 0.6 },
  leveler: { name: 'Nivelador ajustable', spec: 'M8, rango 0–20 mm', unit: 'pz', unitPrice: 15 },
  'wall-anchor': { name: 'Kit antivuelco a muro', spec: 'Escuadra + taquete Ø8 mm', unit: 'juego', unitPrice: 45 },
};

const slidePairPrice = (length: number): number => Math.round(160 + length * 0.32);

const buildHardware = (config: FurnitureConfig, L: Layout, panels: readonly Panel[]): HardwareItem[] => {
  const counts = new Map<HardwareKind, { quantity: number; step: number; spec?: string; price?: number }>();
  const add = (kind: HardwareKind, quantity: number, step: number, spec?: string, price?: number): void => {
    if (quantity <= 0) return;
    const current = counts.get(kind);
    counts.set(kind, {
      quantity: (current?.quantity ?? 0) + quantity,
      step: Math.min(current?.step ?? step, step),
      spec: spec ?? current?.spec,
      price: price ?? current?.price,
    });
  };

  // Carcass joints: top/bottom to each side, dividers to top and bottom, kick to sides.
  const jointPoints: Array<{ points: number; step: number }> = [];
  const perCarcassJoint = fastenersPerJoint(L.carcassDepth);
  jointPoints.push({ points: 4 * perCarcassJoint, step: STEP.carcass });
  const dividerCount = panels.filter((p) => p.role === 'divider').length;
  jointPoints.push({ points: dividerCount * 2 * perCarcassJoint, step: STEP.dividers });
  if (config.hasKick) jointPoints.push({ points: 2 * fastenersPerJoint(L.kick), step: STEP.base });

  for (const { points, step } of jointPoints) {
    if (points === 0) continue;
    switch (config.joinery) {
      case 'confirmat':
        add('confirmat-screw', points, step);
        break;
      case 'cam-lock':
        add('cam-lock', points, step);
        add('cam-bolt', points, step);
        add('dowel', points, step);
        break;
      case 'dowel':
        add('dowel', points * 2, step);
        break;
    }
  }
  const dowels = counts.get('dowel')?.quantity ?? 0;
  if (dowels > 0) add('wood-glue', Math.max(1, Math.ceil(dowels / 80)), STEP.carcass);

  const shelves = panels.filter((p) => p.role === 'shelf').length;
  add('shelf-pin', shelves * 4, STEP.shelves);

  if (config.hasBack) {
    const backHeight = L.H - L.kick;
    const perimeterNails = Math.ceil((2 * (L.W + backHeight)) / 100);
    const dividerNails = dividerCount * Math.ceil(backHeight / 150);
    add('back-nail', perimeterNails + dividerNails, STEP.back);
  }

  const doors = panels.filter((p) => p.role === 'door');
  for (const door of doors) {
    add('hinge', hingesForDoorHeight(door.length), STEP.fronts);
    add('handle', 1, STEP.fronts);
  }

  if (config.template === 'dresser') {
    const g = computeDrawerGeometry(config, L);
    const slideLength = g.slideLength ?? STANDARD_SLIDE_LENGTHS[0];
    add(
      'drawer-slide',
      config.drawerCount,
      STEP.fronts,
      `${slideLength} mm, extensión total, 45 kg`,
      slidePairPrice(slideLength),
    );
    const handlesPerFront = L.W - config.frontGap > 700 ? 2 : 1;
    add('handle', config.drawerCount * handlesPerFront, STEP.fronts);
    // 4 box corners × 2 screws + 4 screws to fix the front + 6 per slide pair.
    add('wood-screw', config.drawerCount * (8 + 4 + 12), STEP.fronts);
    const bottomNails = Math.ceil((2 * (g.boxOuterWidth + g.boxDepth)) / 100);
    add('back-nail', config.drawerCount * bottomNails, STEP.fronts);
  }

  if (!config.hasKick) add('leveler', L.W > 1200 ? 6 : 4, STEP.base);
  if (config.hasKick) add('wood-screw', 4, STEP.base);

  if (L.H >= 1000 || L.H / L.D > 3) add('wall-anchor', L.W > 1200 ? 2 : 1, STEP.finish);

  return [...counts.entries()].map(([kind, entry]) => {
    const catalog = HARDWARE_CATALOG[kind];
    return {
      id: `hw-${kind}`,
      kind,
      name: catalog.name,
      spec: entry.spec ?? catalog.spec,
      quantity: entry.quantity,
      unit: catalog.unit,
      unitPrice: entry.price ?? catalog.unitPrice,
      assemblyStep: entry.step,
    };
  });
};

// ---------------------------------------------------------------------------
// Assembly instructions
// ---------------------------------------------------------------------------

const JOINERY_LABEL: Readonly<Record<FurnitureConfig['joinery'], string>> = {
  confirmat: 'tornillos confirmat (barreno escalonado de 5/7 mm, a 9 mm del canto)',
  'cam-lock': 'excéntricas minifix y pernos, con un taquete de alineación por punto',
  dowel: 'taquetes de 8 mm con pegamento, prensando hasta que seque',
};

const buildAssemblySteps = (config: FurnitureConfig, panels: readonly Panel[], hardware: readonly HardwareItem[]): AssemblyStep[] => {
  const idsFor = (step: number): string[] => panels.filter((p) => p.assemblyStep === step).map((p) => p.id);
  const hwFor = (step: number): AssemblyStep['hardware'] =>
    hardware.filter((h) => h.assemblyStep === step).map((h) => ({ kind: h.kind, quantity: h.quantity }));

  const steps: Array<Omit<AssemblyStep, 'order'>> = [];

  steps.push({
    title: 'Revisa y marca las piezas',
    description:
      'Coloca todas las piezas sobre una superficie limpia y compáralas con el despiece. Marca cada una con su código (A1, B1…) en una cara que no quede a la vista. Marca los barrenos de soportes cada 32 mm en costados y divisores antes de armar.',
    panelIds: panels.map((p) => p.id),
    hardware: [],
    tip: 'Usa una escuadra y una plantilla de barrenos para que los entrepaños queden nivelados.',
  });

  steps.push({
    title: config.hasKick ? 'Arma el zócalo' : 'Coloca los niveladores',
    description: config.hasKick
      ? `Fija el zócalo F1 bajo el piso, retranqueado ${KICK_RECESS} mm del frente, con pijas desde el piso y uniéndolo a los costados.`
      : 'Atornilla los niveladores en las esquinas del piso, a 50 mm de los cantos.',
    panelIds: idsFor(STEP.base),
    hardware: hwFor(STEP.base),
    tip: null,
  });

  steps.push({
    title: 'Une costados, piso y techo',
    description: `Recuesta un costado sobre su cara exterior, presenta piso y techo y únelos con ${JOINERY_LABEL[config.joinery]}. Repite con el otro costado.`,
    panelIds: idsFor(STEP.carcass),
    hardware: hwFor(STEP.carcass),
    tip: 'Barrena con una guía a 90° para que el tornillo no se salga por la cara del tablero.',
  });

  if (idsFor(STEP.dividers).length > 0) {
    steps.push({
      title: 'Instala los divisores',
      description: 'Mide desde el costado y marca la posición de cada divisor en piso y techo. Fíjalos con la misma tornillería del casco.',
      panelIds: idsFor(STEP.dividers),
      hardware: hwFor(STEP.dividers),
      tip: 'Corta un separador de madera del ancho del módulo para posicionar los divisores sin medir cada vez.',
    });
  }

  if (config.hasBack) {
    steps.push({
      title: 'Escuadra el mueble y clava el fondo',
      description:
        'Mide las dos diagonales del casco: deben ser iguales (±1 mm). Con el mueble escuadrado, apoya el fondo y clávalo cada 100 mm en todo el perímetro y sobre los divisores.',
      panelIds: idsFor(STEP.back),
      hardware: hwFor(STEP.back),
      tip: 'El fondo es lo que da rigidez al mueble: no lo omitas en piezas altas.',
    });
  }

  if (idsFor(STEP.shelves).length > 0) {
    steps.push({
      title: 'Coloca los entrepaños',
      description: 'Inserta cuatro soportes por entrepaño a la altura deseada y apoya cada entrepaño con el canto enchapado hacia el frente.',
      panelIds: idsFor(STEP.shelves),
      hardware: hwFor(STEP.shelves),
      tip: null,
    });
  }

  if (config.template === 'cabinet') {
    steps.push({
      title: 'Monta las puertas',
      description:
        'Barrena las cazoletas de Ø35 mm a 22 mm del canto, atornilla las bisagras, cuelga las puertas y ajusta altura, profundidad y lado hasta dejar una holgura pareja de ' +
        `${config.frontGap} mm. Coloca las jaladeras.`,
      panelIds: idsFor(STEP.fronts),
      hardware: hwFor(STEP.fronts),
      tip: 'Taladra las cazoletas con broca Forstner y tope de profundidad (12.5 mm).',
    });
  }

  if (config.template === 'dresser') {
    steps.push({
      title: 'Arma e instala los cajones',
      description:
        'Arma cada caja (laterales, contrafrente y trasera) con pijas, clava el fondo verificando escuadra, fija las correderas en caja y costados y atornilla el frente desde el interior dejando ' +
        `${config.frontGap} mm de holgura entre frentes.`,
      panelIds: idsFor(STEP.fronts),
      hardware: hwFor(STEP.fronts),
      tip: 'Monta las correderas del casco con una regla espaciadora para que todas queden paralelas.',
    });
  }

  steps.push({
    title: 'Nivela, ancla y revisa',
    description:
      'Coloca el mueble en su lugar, nivélalo y, si es alto, fíjalo al muro con el kit antivuelco. Revisa que puertas y cajones cierren sin rozar.',
    panelIds: [],
    hardware: hwFor(STEP.finish),
    tip: 'Ancla siempre al muro los muebles altos, sobre todo donde hay niños.',
  });

  return steps.map((step, index) => ({ ...step, order: index + 1 }));
};

// ---------------------------------------------------------------------------
// Structural validation
// ---------------------------------------------------------------------------

export interface ShelfDeflectionInput {
  spanMm: number;
  depthMm: number;
  thicknessMm: number;
  elasticModulusMPa: number;
  densityKgM3: number;
  creepFactor: number;
  loadKg: number;
  /**
   * 'simple' for shelves on pins (5/384). 'semi-rigid' for panels screwed to
   * the sides with the back nailed on: halfway between pinned and fully fixed
   * ends (1/384), i.e. 3/384.
   */
  endFixity?: 'simple' | 'semi-rigid';
}

/**
 * Euler–Bernoulli mid-span deflection of a simply supported shelf under a
 * uniformly distributed load (live load plus self weight):
 *
 *   δ = 5 · w · L⁴ / (384 · E · I),   I = b · h³ / 12
 *
 * Shelves on pins behave as simply supported (the conservative case); fixed
 * tops and bottoms use a semi-rigid coefficient (see `endFixity`).
 * Long-term sag multiplies the elastic value by the material creep factor.
 */
export const computeShelfDeflection = (input: ShelfDeflectionInput): ShelfDeflectionResult => {
  const { spanMm: L, depthMm: b, thicknessMm: h, elasticModulusMPa: E } = input;
  const selfWeightKg = (L / 1000) * (b / 1000) * (h / 1000) * input.densityKgM3;
  const totalNewtons = (input.loadKg + selfWeightKg) * GRAVITY;
  const w = L > 0 ? totalNewtons / L : 0; // N/mm
  const I = (b * h ** 3) / 12; // mm⁴
  const coefficient = input.endFixity === 'semi-rigid' ? 3 : 5;
  const instantMm = I > 0 && E > 0 ? (coefficient * w * L ** 4) / (384 * E * I) : 0;
  const longTermMm = instantMm * input.creepFactor;
  const limitMm = L * SAG_LIMIT_OK;
  const severity: CheckSeverity =
    longTermMm <= L * SAG_LIMIT_OK ? 'ok' : longTermMm <= L * SAG_LIMIT_WARNING ? 'warning' : 'critical';
  return {
    spanMm: L,
    depthMm: b,
    thicknessMm: h,
    loadKg: input.loadKg,
    selfWeightKg,
    instantMm,
    longTermMm,
    limitMm,
    ratio: limitMm > 0 ? longTermMm / limitMm : 0,
    severity,
  };
};

/**
 * Recommended maximum shelf span for a board. Sag grows with L⁴ / h³, so the
 * span giving equal sag scales with h^(3/4).
 */
export const recommendedSpan = (materialId: MaterialId): number => {
  const material = getMaterial(materialId);
  const base = RECOMMENDED_SPAN_PER_18MM[material.family];
  return Math.round(base * (material.thickness / 18) ** 0.75);
};

const formatMm = (value: number): string => `${value.toFixed(1)} mm`;

const buildChecks = (config: FurnitureConfig, L: Layout, panels: readonly Panel[]): StructuralCheck[] => {
  const checks: StructuralCheck[] = [];
  const material = getMaterial(config.materialId);
  const profile = LOAD_PROFILES[config.loadProfile];

  // Shelf deflection: one representative per bay plus the fixed bottom/top.
  // In a dresser the slides carry the drawers into the sides, not the bottom.
  const horizontal = panels.filter(
    (p) => p.role === 'shelf' || p.role === 'top' || (p.role === 'bottom' && config.template !== 'dresser'),
  );
  const seen = new Set<string>();
  for (const panel of horizontal) {
    const key = `${panel.role}-${panel.length}-${panel.width}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // The top only carries decoration; shelves and bottom carry the profile load.
    const kgPerMeter = panel.role === 'top' ? LOAD_PROFILES.decor.kgPerMeter : profile.kgPerMeter;
    // Fixed panels only bend between the supports that actually hold them.
    const span = panel.role === 'shelf' ? panel.length : Math.max(...computeBays(config, L).map((b) => b.width));
    const result = computeShelfDeflection({
      spanMm: span,
      depthMm: panel.width,
      thicknessMm: panel.thickness,
      elasticModulusMPa: material.elasticModulusMPa,
      densityKgM3: material.densityKgM3,
      creepFactor: material.creepFactor,
      loadKg: (kgPerMeter * span) / 1000,
      endFixity: panel.role === 'shelf' ? 'simple' : 'semi-rigid',
    });
    const advice =
      result.severity === 'ok'
        ? 'Dentro del límite recomendado.'
        : 'Agrega un divisor, usa tablero más grueso o rígido (triplay) o refuerza el canto frontal con un listón.';
    checks.push({
      id: `deflection-${panel.id}`,
      kind: 'shelf-deflection',
      panelId: panel.id,
      title: `Flecha · ${panel.name} (${panel.code})`,
      severity: result.severity,
      message: `Claro de ${Math.round(span)} mm con ${result.loadKg.toFixed(1)} kg: ${formatMm(result.instantMm)} al cargar y ${formatMm(
        result.longTermMm,
      )} a largo plazo (límite ${formatMm(result.limitMm)}). ${advice}`,
      value: result.longTermMm,
      limit: result.limitMm,
      unit: 'mm',
    });
  }

  // Span limit for the widest shelf.
  const shelves = panels.filter((p) => p.role === 'shelf');
  if (shelves.length > 0) {
    const widest = shelves.reduce((a, b) => (b.length > a.length ? b : a));
    const limit = recommendedSpan(config.materialId);
    const ratio = widest.length / limit;
    checks.push({
      id: 'span-limit',
      kind: 'span-limit',
      panelId: widest.id,
      title: 'Claro máximo de entrepaño',
      severity: ratio <= 1 ? 'ok' : ratio <= 1.25 ? 'warning' : 'critical',
      message:
        ratio <= 1
          ? `El entrepaño más largo (${Math.round(widest.length)} mm) está dentro del claro recomendado de ${limit} mm para ${material.name}.`
          : `El entrepaño más largo mide ${Math.round(widest.length)} mm; para ${material.name} se recomienda no pasar de ${limit} mm.`,
      value: widest.length,
      limit,
      unit: 'mm',
    });
  }

  // Tip-over / anchoring.
  const slenderness = L.H / L.D;
  const tipSeverity: CheckSeverity = slenderness > 6 ? 'critical' : slenderness > 3 || L.H >= 1000 ? 'warning' : 'ok';
  checks.push({
    id: 'tip-over',
    kind: 'tip-over',
    panelId: null,
    title: 'Estabilidad al volteo',
    severity: tipSeverity,
    message:
      tipSeverity === 'ok'
        ? `Relación alto/fondo de ${slenderness.toFixed(1)}: estable sin anclaje.`
        : `Relación alto/fondo de ${slenderness.toFixed(1)}${L.H >= 1000 ? ` y ${L.H} mm de alto` : ''}: ancla el mueble al muro (incluido en herrajes).`,
    value: slenderness,
    limit: 3,
    unit: 'H/F',
  });

  if (!config.hasBack && L.H > 900) {
    checks.push({
      id: 'racking',
      kind: 'proportion',
      panelId: null,
      title: 'Rigidez sin fondo',
      severity: 'warning',
      message: 'Sin fondo el mueble puede descuadrarse (efecto paralelogramo). Agrega fondo o escuadras metálicas en las esquinas.',
      value: L.H,
      limit: 900,
      unit: 'mm',
    });
  }

  for (const door of panels.filter((p) => p.role === 'door')) {
    const hinges = hingesForDoorHeight(door.length);
    const weight = (door.length * door.width * door.thickness * material.densityKgM3) / 1e9;
    const tooWide = door.width > MAX_DOOR_WIDTH;
    checks.push({
      id: `hinges-${door.id}`,
      kind: 'hinge-count',
      panelId: door.id,
      title: `Bisagras · ${door.name}`,
      severity: tooWide ? 'warning' : 'ok',
      message: tooWide
        ? `La puerta mide ${Math.round(door.width)} mm de ancho (más de ${MAX_DOOR_WIDTH} mm) y pesa ${weight.toFixed(1)} kg: tiende a vencerse. Agrega otra puerta.`
        : `${hinges} bisagras para ${Math.round(door.length)} mm de alto y ${weight.toFixed(1)} kg.`,
      value: door.width,
      limit: MAX_DOOR_WIDTH,
      unit: 'mm',
    });
  }

  if (config.template === 'dresser') {
    const g = computeDrawerGeometry(config, L);
    const slideOk = g.slideLength !== null;
    const heightOk = g.boxHeight >= MIN_DRAWER_BOX_HEIGHT;
    checks.push({
      id: 'drawer-depth',
      kind: 'drawer-depth',
      panelId: null,
      title: 'Cajones y correderas',
      severity: slideOk && heightOk ? 'ok' : 'critical',
      message: !slideOk
        ? `El fondo útil (${Math.round(L.carcassDepth)} mm) no admite la corredera estándar más corta (250 mm). Aumenta la profundidad.`
        : !heightOk
          ? `Cada caja quedaría de ${Math.round(g.boxHeight)} mm de alto (mínimo ${MIN_DRAWER_BOX_HEIGHT} mm). Reduce el número de cajones.`
          : `Correderas de ${g.slideLength} mm; cajas de ${Math.round(g.boxOuterWidth)} × ${Math.round(g.boxHeight)} × ${g.boxDepth} mm.`,
      value: heightOk ? g.boxDepth : g.boxHeight,
      limit: heightOk ? 250 : MIN_DRAWER_BOX_HEIGHT,
      unit: 'mm',
    });
  }

  const order: Record<CheckSeverity, number> = { critical: 0, warning: 1, ok: 2 };
  return checks.sort((a, b) => order[a.severity] - order[b.severity]);
};

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export const panelWeightKg = (panel: Panel): number =>
  (panel.length * panel.width * panel.thickness * getMaterial(panel.materialId).densityKgM3) / 1e9;

/** Builds the full parametric model: panels, transforms, hardware, steps and checks. */
export const buildFurniture = (input: FurnitureConfig): FurnitureModel => {
  const config = sanitizeConfig(input);
  const L = computeLayout(config);
  const specs = [
    ...carcassSpecs(config, L),
    ...dividerSpecs(config, L),
    ...shelfSpecs(config, L),
    ...doorSpecs(config, L),
    ...drawerSpecs(config, L),
  ];
  const panels = assignCodes(specs, config.edgeBandThickness);
  const hardware = buildHardware(config, L, panels);
  return {
    config,
    panels,
    hardware,
    assemblySteps: buildAssemblySteps(config, panels, hardware),
    checks: buildChecks(config, L, panels),
    bounds: mergeBounds(panels.map((p) => p.worldBounds)),
    totalWeightKg: panels.reduce((sum, p) => sum + panelWeightKg(p), 0),
  };
};

/** Banded edge length of one panel, with 30 mm of waste per banded edge. */
export const edgeBandLengthMm = (panel: Panel): number => {
  const { L1, L2, W1, W2 } = panel.edgeBanding;
  const edges = [L1 ? panel.length : 0, L2 ? panel.length : 0, W1 ? panel.width : 0, W2 ? panel.width : 0];
  return edges.reduce((sum, edge) => sum + (edge > 0 ? edge + 30 : 0), 0);
};

export const computeBillOfMaterials = (model: FurnitureModel, plan: CutPlan): BillOfMaterials => {
  const materials: MaterialLine[] = plan.materials.map((mp) => {
    const material = getMaterial(mp.materialId);
    const sheets = mp.sheets.length;
    return {
      materialId: mp.materialId,
      name: material.name,
      sheets,
      pricePerSheet: material.pricePerSheet,
      subtotal: sheets * material.pricePerSheet,
    };
  });

  let edgeBandMeters = 0;
  let edgeBandCost = 0;
  for (const panel of model.panels) {
    const meters = edgeBandLengthMm(panel) / 1000;
    edgeBandMeters += meters;
    edgeBandCost += meters * getMaterial(panel.materialId).edgeBandPricePerMeter;
  }

  const hardwareCost = model.hardware.reduce((sum, h) => sum + h.quantity * h.unitPrice, 0);
  const materialCost = materials.reduce((sum, m) => sum + m.subtotal, 0);
  return {
    materials,
    hardware: model.hardware,
    edgeBandMeters: Math.ceil(edgeBandMeters * 10) / 10,
    edgeBandCost: Math.round(edgeBandCost),
    hardwareCost: Math.round(hardwareCost),
    materialCost,
    total: Math.round(materialCost + edgeBandCost + hardwareCost),
  };
};
