'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { TEMPLATE_LABELS, TEMPLATE_LIMITS, createDefaultConfig, sanitizeConfig } from '@/lib/engine/calculator';
import { DEFAULT_OPTIMIZER_SETTINGS } from '@/lib/engine/cutOptimizer';
import { getMaterial, isMaterialId } from '@/lib/engine/materials';
import { APP_NAME } from '@/lib/constants';
import { createId } from '@/lib/id';
import type {
  FurnitureConfig,
  FurnitureDimensions,
  FurnitureTemplate,
  JoineryMethod,
  LoadProfile,
  MaterialId,
  OptimizerSettings,
} from '@/types/carpentry';

export interface ViewerSettings {
  /** Exploded-view factor, 0 (assembled) … 1 (fully exploded). */
  explode: number;
  showDimensions: boolean;
  showEdges: boolean;
  autoRotate: boolean;
  xray: boolean;
}

type EditableDimension = Exclude<keyof FurnitureDimensions, 'thickness'>;

export interface ConfiguratorState {
  projects: Record<string, FurnitureConfig>;
  projectOrder: string[];
  activeProjectId: string;
  optimizer: OptimizerSettings;
  viewer: ViewerSettings;
  /** UI-only, never persisted. */
  selectedPanelId: string | null;
  hasHydrated: boolean;

  setDimension: (key: EditableDimension, value: number) => void;
  updateActive: (patch: Partial<Omit<FurnitureConfig, 'id' | 'createdAt' | 'updatedAt' | 'dimensions'>>) => void;
  setTemplate: (template: FurnitureTemplate) => void;
  setMaterial: (materialId: MaterialId) => void;
  setBackMaterial: (materialId: MaterialId) => void;
  setJoinery: (joinery: JoineryMethod) => void;
  setLoadProfile: (profile: LoadProfile) => void;
  resetActive: () => void;

  createProject: (template: FurnitureTemplate) => string;
  duplicateProject: (id: string) => string | null;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  selectProject: (id: string) => void;
  importProject: (raw: string) => { ok: true; id: string } | { ok: false; error: string };
  exportProject: (id: string) => string | null;

  setOptimizer: (patch: Partial<OptimizerSettings>) => void;
  setViewer: (patch: Partial<ViewerSettings>) => void;
  selectPanel: (panelId: string | null) => void;
}

const DEFAULT_VIEWER: ViewerSettings = {
  explode: 0,
  showDimensions: true,
  showEdges: true,
  autoRotate: false,
  xray: false,
};

const createInitialProject = (): FurnitureConfig => createDefaultConfig('bookshelf', createId('project'), 'Mi primer librero');

const touch = (config: FurnitureConfig): FurnitureConfig => sanitizeConfig({ ...config, updatedAt: Date.now() });

const clampOptimizer = (settings: OptimizerSettings): OptimizerSettings => ({
  kerf: Math.min(8, Math.max(0, Number.isFinite(settings.kerf) ? settings.kerf : DEFAULT_OPTIMIZER_SETTINGS.kerf)),
  trim: Math.min(30, Math.max(0, Number.isFinite(settings.trim) ? settings.trim : DEFAULT_OPTIMIZER_SETTINGS.trim)),
  allowRotation: settings.allowRotation,
});

// ---------------------------------------------------------------------------
// Runtime validation for imported / persisted projects
// ---------------------------------------------------------------------------

const TEMPLATES: readonly FurnitureTemplate[] = ['bookshelf', 'cabinet', 'dresser'];
const JOINERIES: readonly JoineryMethod[] = ['confirmat', 'cam-lock', 'dowel'];
const LOAD_PROFILES_LIST: readonly LoadProfile[] = ['decor', 'clothes', 'books', 'heavy'];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback;

/** Rebuilds a FurnitureConfig from untrusted JSON, falling back to template defaults. */
export const parseFurnitureConfig = (value: unknown, id: string): FurnitureConfig | null => {
  if (!isRecord(value)) return null;
  const template = oneOf(value.template, TEMPLATES, 'bookshelf');
  const base = createDefaultConfig(template, id);
  const dims = isRecord(value.dimensions) ? value.dimensions : {};
  const materialId = typeof value.materialId === 'string' && isMaterialId(value.materialId) ? value.materialId : base.materialId;
  const backMaterialId =
    typeof value.backMaterialId === 'string' && isMaterialId(value.backMaterialId) ? value.backMaterialId : base.backMaterialId;

  return sanitizeConfig({
    ...base,
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim().slice(0, 80) : base.name,
    template,
    dimensions: {
      width: num(dims.width, base.dimensions.width),
      height: num(dims.height, base.dimensions.height),
      depth: num(dims.depth, base.dimensions.depth),
      thickness: getMaterial(materialId).thickness,
    },
    materialId,
    backMaterialId,
    bayCount: num(value.bayCount, base.bayCount),
    shelfCount: num(value.shelfCount, base.shelfCount),
    doorCount: num(value.doorCount, base.doorCount),
    drawerCount: num(value.drawerCount, base.drawerCount),
    hasBack: typeof value.hasBack === 'boolean' ? value.hasBack : base.hasBack,
    hasKick: typeof value.hasKick === 'boolean' ? value.hasKick : base.hasKick,
    kickHeight: num(value.kickHeight, base.kickHeight),
    joinery: oneOf(value.joinery, JOINERIES, base.joinery),
    loadProfile: oneOf(value.loadProfile, LOAD_PROFILES_LIST, base.loadProfile),
    frontGap: num(value.frontGap, base.frontGap),
    edgeBandThickness: num(value.edgeBandThickness, base.edgeBandThickness),
    notes: typeof value.notes === 'string' ? value.notes.slice(0, 2000) : '',
    createdAt: num(value.createdAt, Date.now()),
    updatedAt: num(value.updatedAt, Date.now()),
  });
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialProject = createInitialProject();

type PersistedState = Pick<ConfiguratorState, 'projects' | 'projectOrder' | 'activeProjectId' | 'optimizer' | 'viewer'>;

export const useConfigurator = create<ConfiguratorState>()(
  persist(
    (set, get) => {
      const updateProject = (id: string, update: (config: FurnitureConfig) => FurnitureConfig): void => {
        set((state) => {
          const current = state.projects[id];
          if (!current) return state;
          return { projects: { ...state.projects, [id]: touch(update(current)) } };
        });
      };
      const updateActiveProject = (update: (config: FurnitureConfig) => FurnitureConfig): void =>
        updateProject(get().activeProjectId, update);

      return {
        projects: { [initialProject.id]: initialProject },
        projectOrder: [initialProject.id],
        activeProjectId: initialProject.id,
        optimizer: DEFAULT_OPTIMIZER_SETTINGS,
        viewer: DEFAULT_VIEWER,
        selectedPanelId: null,
        hasHydrated: false,

        setDimension: (key, value) =>
          updateActiveProject((config) => ({ ...config, dimensions: { ...config.dimensions, [key]: value } })),

        updateActive: (patch) => updateActiveProject((config) => ({ ...config, ...patch })),

        setTemplate: (template) =>
          updateActiveProject((config) => {
            if (config.template === template) return config;
            const defaults = createDefaultConfig(template, config.id, config.name, config.createdAt);
            const limits = TEMPLATE_LIMITS[template];
            const keep = (value: number, range: { min: number; max: number }): number =>
              Math.min(range.max, Math.max(range.min, value));
            return {
              ...defaults,
              name: config.name === TEMPLATE_LABELS[config.template] ? TEMPLATE_LABELS[template] : config.name,
              materialId: config.materialId,
              backMaterialId: config.backMaterialId,
              joinery: config.joinery,
              notes: config.notes,
              dimensions: {
                width: keep(config.dimensions.width, limits.width),
                height: keep(defaults.dimensions.height, limits.height),
                depth: keep(defaults.dimensions.depth, limits.depth),
                thickness: config.dimensions.thickness,
              },
            };
          }),

        setMaterial: (materialId) =>
          updateActiveProject((config) => ({
            ...config,
            materialId,
            dimensions: { ...config.dimensions, thickness: getMaterial(materialId).thickness },
          })),

        setBackMaterial: (materialId) => updateActiveProject((config) => ({ ...config, backMaterialId: materialId })),
        setJoinery: (joinery) => updateActiveProject((config) => ({ ...config, joinery })),
        setLoadProfile: (loadProfile) => updateActiveProject((config) => ({ ...config, loadProfile })),

        resetActive: () =>
          updateActiveProject((config) => ({
            ...createDefaultConfig(config.template, config.id, config.name, config.createdAt),
          })),

        createProject: (template) => {
          const id = createId('project');
          const config = createDefaultConfig(template, id);
          set((state) => ({
            projects: { ...state.projects, [id]: config },
            projectOrder: [...state.projectOrder, id],
            activeProjectId: id,
            selectedPanelId: null,
          }));
          return id;
        },

        duplicateProject: (id) => {
          const source = get().projects[id];
          if (!source) return null;
          const copyId = createId('project');
          const now = Date.now();
          const copy: FurnitureConfig = { ...source, id: copyId, name: `${source.name} (copia)`, createdAt: now, updatedAt: now };
          set((state) => ({
            projects: { ...state.projects, [copyId]: copy },
            projectOrder: [...state.projectOrder, copyId],
            activeProjectId: copyId,
            selectedPanelId: null,
          }));
          return copyId;
        },

        deleteProject: (id) =>
          set((state) => {
            if (!state.projects[id]) return state;
            const projects = { ...state.projects };
            delete projects[id];
            let projectOrder = state.projectOrder.filter((projectId) => projectId !== id);
            if (projectOrder.length === 0) {
              const fresh = createInitialProject();
              projects[fresh.id] = fresh;
              projectOrder = [fresh.id];
            }
            const fallback = projectOrder[0] ?? '';
            return {
              projects,
              projectOrder,
              activeProjectId: state.activeProjectId === id ? fallback : state.activeProjectId,
              selectedPanelId: null,
            };
          }),

        renameProject: (id, name) => {
          const trimmed = name.trim().slice(0, 80);
          if (!trimmed) return;
          updateProject(id, (config) => ({ ...config, name: trimmed }));
        },

        selectProject: (id) => {
          if (get().projects[id]) set({ activeProjectId: id, selectedPanelId: null });
        },

        importProject: (raw) => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return { ok: false, error: 'El archivo no es un JSON válido.' };
          }
          const payload = isRecord(parsed) && isRecord(parsed.project) ? parsed.project : parsed;
          const id = createId('project');
          const config = parseFurnitureConfig(payload, id);
          if (!config) return { ok: false, error: `El archivo no contiene un proyecto de ${APP_NAME}.` };
          set((state) => ({
            projects: { ...state.projects, [id]: config },
            projectOrder: [...state.projectOrder, id],
            activeProjectId: id,
            selectedPanelId: null,
          }));
          return { ok: true, id };
        },

        exportProject: (id) => {
          const config = get().projects[id];
          if (!config) return null;
          return JSON.stringify({ app: APP_NAME, version: 1, exportedAt: new Date().toISOString(), project: config }, null, 2);
        },

        setOptimizer: (patch) => set((state) => ({ optimizer: clampOptimizer({ ...state.optimizer, ...patch }) })),

        setViewer: (patch) =>
          set((state) => {
            const viewer = { ...state.viewer, ...patch };
            return { viewer: { ...viewer, explode: Math.min(1, Math.max(0, viewer.explode)) } };
          }),

        selectPanel: (panelId) => set({ selectedPanelId: panelId }),
      };
    },
    {
      name: 'micarpintero:configurator',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        projects: state.projects,
        projectOrder: state.projectOrder,
        activeProjectId: state.activeProjectId,
        optimizer: state.optimizer,
        viewer: state.viewer,
      }),
      // Persisted data is untrusted (old versions, manual edits): rebuild it field by field.
      merge: (persisted, current) => {
        if (!isRecord(persisted)) return current;
        const projects: Record<string, FurnitureConfig> = {};
        const rawProjects = isRecord(persisted.projects) ? persisted.projects : {};
        for (const [id, raw] of Object.entries(rawProjects)) {
          const config = parseFurnitureConfig(raw, id);
          if (config) projects[id] = config;
        }
        const order = Array.isArray(persisted.projectOrder)
          ? persisted.projectOrder.filter((id): id is string => typeof id === 'string' && id in projects)
          : [];
        for (const id of Object.keys(projects)) if (!order.includes(id)) order.push(id);
        if (order.length === 0) return current;

        const active = typeof persisted.activeProjectId === 'string' && persisted.activeProjectId in projects
          ? persisted.activeProjectId
          : (order[0] ?? current.activeProjectId);
        const optimizer = isRecord(persisted.optimizer) ? persisted.optimizer : {};
        const viewer = isRecord(persisted.viewer) ? persisted.viewer : {};
        return {
          ...current,
          projects,
          projectOrder: order,
          activeProjectId: active,
          optimizer: clampOptimizer({
            kerf: num(optimizer.kerf, DEFAULT_OPTIMIZER_SETTINGS.kerf),
            trim: num(optimizer.trim, DEFAULT_OPTIMIZER_SETTINGS.trim),
            allowRotation:
              typeof optimizer.allowRotation === 'boolean' ? optimizer.allowRotation : DEFAULT_OPTIMIZER_SETTINGS.allowRotation,
          }),
          viewer: {
            explode: Math.min(1, Math.max(0, num(viewer.explode, DEFAULT_VIEWER.explode))),
            showDimensions: typeof viewer.showDimensions === 'boolean' ? viewer.showDimensions : DEFAULT_VIEWER.showDimensions,
            showEdges: typeof viewer.showEdges === 'boolean' ? viewer.showEdges : DEFAULT_VIEWER.showEdges,
            autoRotate: typeof viewer.autoRotate === 'boolean' ? viewer.autoRotate : DEFAULT_VIEWER.autoRotate,
            xray: typeof viewer.xray === 'boolean' ? viewer.xray : DEFAULT_VIEWER.xray,
          },
        };
      },
      onRehydrateStorage: () => () => {
        useConfigurator.setState({ hasHydrated: true });
      },
    },
  ),
);

/** The active project; always defined because the store keeps at least one. */
export const useActiveProject = (): FurnitureConfig =>
  useConfigurator((state) => state.projects[state.activeProjectId] ?? Object.values(state.projects)[0] ?? initialProject);
