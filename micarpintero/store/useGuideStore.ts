'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createIndexedDbStorage, deleteFile } from '@/lib/storage/indexedDb';
import type { GuideStep, ParsedGuide } from '@/types/carpentry';

/**
 * Interactive guides (parsed PDFs or generated from a design) and the user's
 * progress through them. Persisted in IndexedDB because guides can be large.
 */
export interface GuideState {
  guides: Record<string, ParsedGuide>;
  guideOrder: string[];
  activeGuideId: string | null;
  hasHydrated: boolean;

  addGuide: (guide: ParsedGuide) => void;
  removeGuide: (guideId: string) => void;
  selectGuide: (guideId: string) => void;
  setActiveStep: (guideId: string, stepId: string) => void;
  toggleStep: (guideId: string, stepId: string) => void;
  completeAndAdvance: (guideId: string) => void;
  addElapsed: (guideId: string, stepId: string, ms: number) => void;
  setNote: (guideId: string, stepId: string, note: string) => void;
  resetProgress: (guideId: string) => void;
}

const updateStep = (guide: ParsedGuide, stepId: string, update: (step: GuideStep) => GuideStep): ParsedGuide => ({
  ...guide,
  steps: guide.steps.map((step) => (step.id === stepId ? update(step) : step)),
});

export const useGuideStore = create<GuideState>()(
  persist(
    (set, get) => {
      const updateGuide = (guideId: string, update: (guide: ParsedGuide) => ParsedGuide): void => {
        set((state) => {
          const guide = state.guides[guideId];
          return guide ? { guides: { ...state.guides, [guideId]: update(guide) } } : state;
        });
      };

      return {
        guides: {},
        guideOrder: [],
        activeGuideId: null,
        hasHydrated: false,

        addGuide: (guide) =>
          set((state) => ({
            guides: { ...state.guides, [guide.id]: guide },
            guideOrder: [guide.id, ...state.guideOrder.filter((id) => id !== guide.id)],
            activeGuideId: guide.id,
          })),

        removeGuide: (guideId) => {
          const guide = get().guides[guideId];
          if (guide?.source === 'pdf') void deleteFile(guideId).catch(() => undefined);
          set((state) => {
            const guides = { ...state.guides };
            delete guides[guideId];
            const guideOrder = state.guideOrder.filter((id) => id !== guideId);
            return {
              guides,
              guideOrder,
              activeGuideId: state.activeGuideId === guideId ? (guideOrder[0] ?? null) : state.activeGuideId,
            };
          });
        },

        selectGuide: (guideId) => {
          if (get().guides[guideId]) set({ activeGuideId: guideId });
        },

        setActiveStep: (guideId, stepId) => updateGuide(guideId, (guide) => ({ ...guide, activeStepId: stepId })),

        toggleStep: (guideId, stepId) =>
          updateGuide(guideId, (guide) =>
            updateStep(guide, stepId, (step) => ({
              ...step,
              completed: !step.completed,
              completedAt: step.completed ? null : Date.now(),
            })),
          ),

        completeAndAdvance: (guideId) =>
          updateGuide(guideId, (guide) => {
            const index = guide.steps.findIndex((s) => s.id === guide.activeStepId);
            const current = guide.steps[index];
            if (!current) return guide;
            const completed = updateStep(guide, current.id, (step) => ({
              ...step,
              completed: true,
              completedAt: step.completedAt ?? Date.now(),
            }));
            const nextPending =
              completed.steps.slice(index + 1).find((s) => !s.completed) ?? completed.steps.find((s) => !s.completed);
            return { ...completed, activeStepId: nextPending?.id ?? current.id };
          }),

        addElapsed: (guideId, stepId, ms) => {
          if (ms <= 0) return;
          updateGuide(guideId, (guide) => updateStep(guide, stepId, (step) => ({ ...step, elapsedMs: step.elapsedMs + ms })));
        },

        setNote: (guideId, stepId, note) =>
          updateGuide(guideId, (guide) => updateStep(guide, stepId, (step) => ({ ...step, note: note.slice(0, 1000) }))),

        resetProgress: (guideId) =>
          updateGuide(guideId, (guide) => ({
            ...guide,
            activeStepId: guide.steps[0]?.id ?? null,
            steps: guide.steps.map((step) => ({ ...step, completed: false, completedAt: null, elapsedMs: 0 })),
          })),
      };
    },
    {
      name: 'micarpintero:guides',
      version: 1,
      storage: createJSONStorage(createIndexedDbStorage),
      partialize: (state) => ({ guides: state.guides, guideOrder: state.guideOrder, activeGuideId: state.activeGuideId }),
      onRehydrateStorage: () => () => {
        useGuideStore.setState({ hasHydrated: true });
      },
    },
  ),
);

export interface GuideProgress {
  completed: number;
  total: number;
  ratio: number;
  elapsedMs: number;
}

export const computeProgress = (guide: ParsedGuide): GuideProgress => {
  const completed = guide.steps.filter((s) => s.completed).length;
  const total = guide.steps.length;
  return {
    completed,
    total,
    ratio: total > 0 ? completed / total : 0,
    elapsedMs: guide.steps.reduce((sum, s) => sum + s.elapsedMs, 0),
  };
};
