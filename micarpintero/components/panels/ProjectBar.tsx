'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, Copy, FileDown, FileJson, FolderOpen, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { captureSnapshot } from '@/lib/canvas/snapshotRegistry';
import { TEMPLATE_LABELS } from '@/lib/engine/calculator';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { downloadBlob, slugify } from '@/lib/download';
import { Button } from '@/components/ui/Button';
import { useConfigurator } from '@/store/useConfigurator';
import type { BillOfMaterials, CutPlan, FurnitureModel, FurnitureTemplate } from '@/types/carpentry';

export interface ProjectBarProps {
  model: FurnitureModel;
  plan: CutPlan;
  bom: BillOfMaterials;
  onNotify: (message: string, tone?: 'info' | 'error') => void;
}

export function ProjectBar({ model, plan, bom, onNotify }: ProjectBarProps) {
  const projects = useConfigurator((s) => s.projects);
  const projectOrder = useConfigurator((s) => s.projectOrder);
  const activeProjectId = useConfigurator((s) => s.activeProjectId);
  const selectProject = useConfigurator((s) => s.selectProject);
  const createProject = useConfigurator((s) => s.createProject);
  const duplicateProject = useConfigurator((s) => s.duplicateProject);
  const deleteProject = useConfigurator((s) => s.deleteProject);
  const renameProject = useConfigurator((s) => s.renameProject);
  const importProject = useConfigurator((s) => s.importProject);
  const exportProject = useConfigurator((s) => s.exportProject);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [newMenu, setNewMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const active = projects[activeProjectId];

  const startRename = (): void => {
    setDraftName(active?.name ?? '');
    setEditing(true);
  };
  const commitRename = (): void => {
    if (active) renameProject(active.id, draftName);
    setEditing(false);
  };

  const handleExportPdf = async (): Promise<void> => {
    setExporting(true);
    try {
      const snapshot = captureSnapshot();
      const { exportBlueprint } = await import('@/lib/pdf/blueprintExporter');
      const fileName = exportBlueprint({ model, plan, bom, snapshot, appName: APP_NAME });
      onNotify(`Plano descargado: ${fileName}`);
    } catch (error) {
      onNotify(error instanceof Error ? `No se pudo generar el PDF: ${error.message}` : 'No se pudo generar el PDF.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJson = (): void => {
    const json = exportProject(activeProjectId);
    if (!json || !active) return;
    downloadBlob(json, `${slugify(active.name)}.micarpintero.json`, 'application/json');
  };

  const handleImport = async (file: File): Promise<void> => {
    const result = importProject(await file.text());
    onNotify(result.ok ? 'Proyecto importado.' : result.error, result.ok ? 'info' : 'error');
  };

  const handleDelete = (): void => {
    if (!active) return;
    if (window.confirm(`¿Eliminar «${active.name}»? Esta acción no se puede deshacer.`)) {
      deleteProject(active.id);
      onNotify('Proyecto eliminado.');
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#fbfaf8]/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-stone-900 text-amber-300" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="18" rx="1.5" />
              <path d="M4 9h16M4 15h16M12 3v6" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-tight text-stone-900">{APP_NAME}</p>
            <p className="hidden text-[11px] text-stone-500 sm:block">{APP_TAGLINE}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {editing ? (
            <form
              className="flex min-w-0 flex-1 items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                commitRename();
              }}
            >
              <input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => event.key === 'Escape' && setEditing(false)}
                maxLength={80}
                aria-label="Nombre del proyecto"
                className="h-9 min-w-0 flex-1 rounded-lg bg-white px-3 text-sm font-semibold ring-2 ring-amber-400 focus:outline-none sm:max-w-xs"
              />
              <Button type="submit" size="sm" variant="primary" aria-label="Guardar nombre">
                <Check className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <>
              <RadixSelect.Root value={activeProjectId} onValueChange={selectProject}>
                <RadixSelect.Trigger
                  aria-label="Proyecto activo"
                  className="flex h-9 min-w-0 max-w-[260px] items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-stone-900 ring-1 ring-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-stone-400" />
                  <span className="truncate">
                    <RadixSelect.Value />
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-stone-400" />
                </RadixSelect.Trigger>
                <RadixSelect.Portal>
                  <RadixSelect.Content position="popper" sideOffset={6} className="z-50 max-h-80 min-w-[240px] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-stone-200">
                    <RadixSelect.Viewport className="p-1">
                      {projectOrder.map((id) => {
                        const project = projects[id];
                        if (!project) return null;
                        return (
                          <RadixSelect.Item
                            key={id}
                            value={id}
                            className="relative cursor-pointer select-none rounded-lg py-2 pl-8 pr-3 text-sm outline-none data-[highlighted]:bg-amber-50"
                          >
                            <RadixSelect.ItemIndicator className="absolute left-2 top-2.5">
                              <Check className="h-4 w-4 text-amber-600" />
                            </RadixSelect.ItemIndicator>
                            <RadixSelect.ItemText>{project.name}</RadixSelect.ItemText>
                            <span className="block text-[11px] text-stone-500">
                              {TEMPLATE_LABELS[project.template]} · {project.dimensions.width}×{project.dimensions.height}×{project.dimensions.depth}
                            </span>
                          </RadixSelect.Item>
                        );
                      })}
                    </RadixSelect.Viewport>
                  </RadixSelect.Content>
                </RadixSelect.Portal>
              </RadixSelect.Root>
              <Button variant="ghost" size="sm" onClick={startRename} aria-label="Renombrar proyecto" title="Renombrar">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Button size="sm" onClick={() => setNewMenu((open) => !open)} aria-expanded={newMenu} aria-haspopup="menu">
              <Plus className="h-3.5 w-3.5" /> Nuevo
            </Button>
            {newMenu && (
              <div role="menu" className="absolute right-0 z-40 mt-1.5 w-48 rounded-xl bg-white p-1 shadow-xl ring-1 ring-stone-200" onMouseLeave={() => setNewMenu(false)}>
                {(Object.keys(TEMPLATE_LABELS) as FurnitureTemplate[]).map((template) => (
                  <button
                    key={template}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      createProject(template);
                      setNewMenu(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-amber-50"
                  >
                    {TEMPLATE_LABELS[template]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => duplicateProject(activeProjectId)} title="Duplicar proyecto" aria-label="Duplicar proyecto">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExportJson} title="Guardar respaldo JSON" aria-label="Guardar respaldo JSON">
            <FileJson className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} title="Importar proyecto JSON" aria-label="Importar proyecto JSON">
            <FolderOpen className="h-3.5 w-3.5" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
              event.target.value = '';
            }}
          />
          <Button size="sm" variant="ghost" onClick={handleDelete} title="Eliminar proyecto" aria-label="Eliminar proyecto" className="hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="primary" onClick={() => void handleExportPdf()} disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Plano PDF
          </Button>
        </div>
      </div>
    </header>
  );
}
