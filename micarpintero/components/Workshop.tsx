'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { AlertTriangle, BookOpenCheck, Calculator, LayoutGrid, ListOrdered, ShieldCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { formatMoney, formatPercent } from '@/lib/format';
import { useWorkshopData } from '@/lib/hooks/useWorkshopData';
import { cn } from '@/lib/cn';
import { BudgetPanel } from '@/components/panels/BudgetPanel';
import { ConfigPanel } from '@/components/panels/ConfigPanel';
import { CutListTable } from '@/components/panels/CutListTable';
import { CutMapView } from '@/components/panels/CutMapView';
import { ProjectBar } from '@/components/panels/ProjectBar';
import { StructuralReport } from '@/components/panels/StructuralReport';
import { useConfigurator } from '@/store/useConfigurator';

const FurnitureViewer = dynamic(() => import('@/components/canvas/FurnitureViewer'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-stone-500">Preparando el taller 3D…</div>,
});

const PDFParserGuide = dynamic(() => import('@/components/guide/PDFParserGuide'), {
  ssr: false,
  loading: () => <p className="text-sm text-stone-500">Cargando lector de manuales…</p>,
});

type TabId = 'cutlist' | 'cutmap' | 'budget' | 'structure' | 'guide';

const TabTrigger = ({ value, icon, label, badge }: { value: TabId; icon: ReactNode; label: string; badge?: ReactNode }) => (
  <Tabs.Trigger
    value={value}
    className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-stone-500 transition hover:text-stone-900 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm"
  >
    {icon}
    {label}
    {badge}
  </Tabs.Trigger>
);

interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

export default function Workshop() {
  const { model, plan, bom, stale } = useWorkshopData();
  const viewer = useConfigurator((s) => s.viewer);
  const setViewer = useConfigurator((s) => s.setViewer);
  const selectedPanelId = useConfigurator((s) => s.selectedPanelId);
  const selectPanel = useConfigurator((s) => s.selectPanel);
  const [tab, setTab] = useState<TabId>('cutlist');
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((message: string, tone: 'info' | 'error' = 'info') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Forget a selection that no longer exists after a parameter change.
  useEffect(() => {
    if (selectedPanelId && !model.panels.some((p) => p.id === selectedPanelId)) selectPanel(null);
  }, [model.panels, selectedPanelId, selectPanel]);

  const issues = model.checks.filter((c) => c.severity !== 'ok');
  const critical = issues.some((c) => c.severity === 'critical');
  const unplaced = plan.materials.reduce((n, m) => n + m.unplaced.length, 0);

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-stone-900">
      <ProjectBar model={model} plan={plan} bom={bom} onNotify={notify} />

      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="order-2 rounded-2xl bg-white p-4 ring-1 ring-stone-200 lg:order-1 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-92px)] lg:overflow-y-auto">
          <ConfigPanel />
        </aside>

        <div className="order-1 min-w-0 space-y-4 lg:order-2">
          <section
            className="relative h-[58vh] min-h-[380px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#f3efe8] to-[#e7e2d9] ring-1 ring-stone-200"
            aria-label="Visor 3D"
          >
            <FurnitureViewer
              model={model}
              settings={viewer}
              selectedPanelId={selectedPanelId}
              onSelectPanel={selectPanel}
              onSettingsChange={setViewer}
            />
            {stale && <div className="absolute right-3 top-14 rounded-md bg-white/90 px-2 py-1 text-[11px] text-stone-500 shadow-sm">Calculando…</div>}
          </section>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Tableros', `${plan.totalSheets}`, `${formatPercent(plan.overallEfficiency)} aprovechado`],
              ['Piezas', `${model.panels.length}`, `${model.hardware.reduce((n, h) => n + h.quantity, 0)} herrajes`],
              ['Peso', `${model.totalWeightKg.toFixed(1)} kg`, `${model.config.dimensions.width}×${model.config.dimensions.height}×${model.config.dimensions.depth} mm`],
              ['Costo estimado', formatMoney(bom.total), 'material + herrajes'],
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-stone-200">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</dt>
                <dd className="font-mono text-lg font-bold text-stone-900">{value}</dd>
                <dd className="truncate text-[11px] text-stone-500">{hint}</dd>
              </div>
            ))}
          </dl>

          {(issues.length > 0 || unplaced > 0) && (
            <button
              type="button"
              onClick={() => setTab(unplaced > 0 ? 'cutmap' : 'structure')}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm ring-1',
                critical || unplaced > 0 ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-amber-50 text-amber-900 ring-amber-200',
              )}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {unplaced > 0 && `${unplaced} pieza(s) no caben en el tablero. `}
                {issues.length > 0 && `${issues.length} observación(es) estructural(es): ${issues[0]?.title ?? ''}`}
              </span>
            </button>
          )}

          <Tabs.Root value={tab} onValueChange={(value) => setTab(value as TabId)} className="rounded-2xl bg-white ring-1 ring-stone-200">
            <Tabs.List className="flex gap-1 overflow-x-auto rounded-t-2xl border-b border-stone-200 bg-stone-50 p-1.5" aria-label="Resultados">
              <TabTrigger value="cutlist" icon={<ListOrdered className="h-4 w-4" />} label="Despiece" />
              <TabTrigger value="cutmap" icon={<LayoutGrid className="h-4 w-4" />} label="Plano de corte" />
              <TabTrigger value="budget" icon={<Calculator className="h-4 w-4" />} label="Presupuesto" />
              <TabTrigger
                value="structure"
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Estructura"
                badge={
                  issues.length > 0 ? (
                    <span className={cn('rounded-full px-1.5 text-[10px] text-white', critical ? 'bg-red-600' : 'bg-amber-500')}>{issues.length}</span>
                  ) : undefined
                }
              />
              <TabTrigger value="guide" icon={<BookOpenCheck className="h-4 w-4" />} label="Guía de armado" />
            </Tabs.List>
            <div className="p-4">
              <Tabs.Content value="cutlist">
                <CutListTable model={model} bom={bom} selectedPanelId={selectedPanelId} onSelectPanel={selectPanel} />
              </Tabs.Content>
              <Tabs.Content value="cutmap">
                <CutMapView plan={plan} selectedPanelId={selectedPanelId} onSelectPanel={selectPanel} />
              </Tabs.Content>
              <Tabs.Content value="budget">
                <BudgetPanel model={model} bom={bom} />
              </Tabs.Content>
              <Tabs.Content value="structure">
                <StructuralReport model={model} onSelectPanel={selectPanel} />
              </Tabs.Content>
              <Tabs.Content value="guide">
                <PDFParserGuide model={model} />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </div>
      </main>

      <footer className="mx-auto max-w-[1600px] px-4 pb-8 pt-2 text-center text-[11px] text-stone-400">
        Todo se calcula y guarda en tu navegador. Diseñado y desarrollado por LKM’r.
      </footer>

      {toast && (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg',
            toast.tone === 'error' ? 'bg-red-600 text-white' : 'bg-stone-900 text-white',
          )}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
