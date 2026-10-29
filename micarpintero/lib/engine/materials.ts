import type { LoadProfile, MaterialId, SheetMaterial } from '@/types/carpentry';

/**
 * Board catalogue. Prices are typical Mexican lumberyard prices (MXN, 2026)
 * and only serve as a starting estimate; mechanical values follow EN 312 /
 * EN 622-5 / EN 636 mean values, creep factors follow Eurocode 5 (1 + k_def,
 * service class 1).
 */
export const MATERIALS: Readonly<Record<MaterialId, SheetMaterial>> = {
  'melamine-white-18': {
    id: 'melamine-white-18',
    name: 'Melamina blanca 18 mm',
    family: 'melamine',
    thickness: 18,
    sheetLength: 2440,
    sheetWidth: 1830,
    pricePerSheet: 1290,
    densityKgM3: 650,
    elasticModulusMPa: 2500,
    creepFactor: 3.25,
    hasGrain: false,
    color: '#f1efe9',
    grainColor: '#e2dfd6',
    edgeBandPricePerMeter: 9,
    backPanelOnly: false,
  },
  'melamine-oak-18': {
    id: 'melamine-oak-18',
    name: 'Melamina roble 18 mm',
    family: 'melamine',
    thickness: 18,
    sheetLength: 2440,
    sheetWidth: 1830,
    pricePerSheet: 1490,
    densityKgM3: 650,
    elasticModulusMPa: 2500,
    creepFactor: 3.25,
    hasGrain: true,
    color: '#c99a63',
    grainColor: '#a8784a',
    edgeBandPricePerMeter: 12,
    backPanelOnly: false,
  },
  'mdf-18': {
    id: 'mdf-18',
    name: 'MDF 18 mm',
    family: 'mdf',
    thickness: 18,
    sheetLength: 2440,
    sheetWidth: 1220,
    pricePerSheet: 890,
    densityKgM3: 720,
    elasticModulusMPa: 3000,
    creepFactor: 3.25,
    hasGrain: false,
    color: '#b89a76',
    grainColor: '#a88a66',
    edgeBandPricePerMeter: 0,
    backPanelOnly: false,
  },
  'mdf-15': {
    id: 'mdf-15',
    name: 'MDF 15 mm',
    family: 'mdf',
    thickness: 15,
    sheetLength: 2440,
    sheetWidth: 1220,
    pricePerSheet: 760,
    densityKgM3: 730,
    elasticModulusMPa: 3000,
    creepFactor: 3.25,
    hasGrain: false,
    color: '#bb9d78',
    grainColor: '#ab8d68',
    edgeBandPricePerMeter: 0,
    backPanelOnly: false,
  },
  'plywood-birch-18': {
    id: 'plywood-birch-18',
    name: 'Triplay de abedul 18 mm',
    family: 'plywood',
    thickness: 18,
    sheetLength: 2440,
    sheetWidth: 1220,
    pricePerSheet: 2390,
    densityKgM3: 680,
    elasticModulusMPa: 8500,
    creepFactor: 1.8,
    hasGrain: true,
    color: '#e3c99f',
    grainColor: '#c9a978',
    edgeBandPricePerMeter: 14,
    backPanelOnly: false,
  },
  'pine-solid-19': {
    id: 'pine-solid-19',
    name: 'Pino macizo (tablero) 19 mm',
    family: 'solid',
    thickness: 19,
    sheetLength: 2440,
    sheetWidth: 1220,
    pricePerSheet: 2650,
    densityKgM3: 510,
    elasticModulusMPa: 9000,
    creepFactor: 1.6,
    hasGrain: true,
    color: '#dcb27a',
    grainColor: '#b9874d',
    edgeBandPricePerMeter: 0,
    backPanelOnly: false,
  },
  'hdf-3': {
    id: 'hdf-3',
    name: 'HDF / fibracel 3 mm',
    family: 'hdf',
    thickness: 3,
    sheetLength: 2440,
    sheetWidth: 1220,
    pricePerSheet: 265,
    densityKgM3: 850,
    elasticModulusMPa: 3500,
    creepFactor: 3.25,
    hasGrain: false,
    color: '#8d6e52',
    grainColor: '#7d5e42',
    edgeBandPricePerMeter: 0,
    backPanelOnly: true,
  },
  'plywood-6': {
    id: 'plywood-6',
    name: 'Triplay 6 mm',
    family: 'plywood',
    thickness: 6,
    sheetLength: 2440,
    sheetWidth: 1220,
    pricePerSheet: 520,
    densityKgM3: 600,
    elasticModulusMPa: 7000,
    creepFactor: 1.8,
    hasGrain: false,
    color: '#d8bc8f',
    grainColor: '#bd9f70',
    edgeBandPricePerMeter: 0,
    backPanelOnly: true,
  },
};

export const MATERIAL_LIST: readonly SheetMaterial[] = Object.values(MATERIALS);

export const CARCASS_MATERIALS: readonly SheetMaterial[] = MATERIAL_LIST.filter((m) => !m.backPanelOnly);

export const BACK_MATERIALS: readonly SheetMaterial[] = MATERIAL_LIST.filter((m) => m.backPanelOnly);

export const isMaterialId = (value: string): value is MaterialId => value in MATERIALS;

export const getMaterial = (id: MaterialId): SheetMaterial => MATERIALS[id];

/** Distributed load per metre of shelf, kg/m. */
export const LOAD_PROFILES: Readonly<Record<LoadProfile, { label: string; kgPerMeter: number }>> = {
  decor: { label: 'Decoración ligera (8 kg/m)', kgPerMeter: 8 },
  clothes: { label: 'Ropa doblada (12 kg/m)', kgPerMeter: 12 },
  books: { label: 'Libros (30 kg/m)', kgPerMeter: 30 },
  heavy: { label: 'Carga pesada / herramienta (50 kg/m)', kgPerMeter: 50 },
};

/** Longest shelf span a board family handles comfortably, mm (per 18 mm). */
export const RECOMMENDED_SPAN_PER_18MM: Readonly<Record<SheetMaterial['family'], number>> = {
  melamine: 800,
  mdf: 800,
  plywood: 1000,
  solid: 1100,
  hdf: 0,
};
