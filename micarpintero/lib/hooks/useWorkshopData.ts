'use client';

import { useDeferredValue, useMemo } from 'react';
import { buildFurniture, computeBillOfMaterials } from '@/lib/engine/calculator';
import { optimizeCuts } from '@/lib/engine/cutOptimizer';
import { useActiveProject, useConfigurator } from '@/store/useConfigurator';
import type { BillOfMaterials, CutPlan, FurnitureConfig, FurnitureModel } from '@/types/carpentry';

export interface WorkshopData {
  config: FurnitureConfig;
  model: FurnitureModel;
  plan: CutPlan;
  bom: BillOfMaterials;
  /** True while a deferred recomputation is pending (fast typing / dragging). */
  stale: boolean;
}

/** Derives geometry, cut plan and budget from the active project. */
export const useWorkshopData = (): WorkshopData => {
  const config = useActiveProject();
  const optimizer = useConfigurator((state) => state.optimizer);
  const deferredConfig = useDeferredValue(config);
  const deferredOptimizer = useDeferredValue(optimizer);

  const model = useMemo(() => buildFurniture(deferredConfig), [deferredConfig]);
  const plan = useMemo(() => optimizeCuts(model.panels, deferredOptimizer), [model.panels, deferredOptimizer]);
  const bom = useMemo(() => computeBillOfMaterials(model, plan), [model, plan]);

  return { config, model, plan, bom, stale: deferredConfig !== config || deferredOptimizer !== optimizer };
};
