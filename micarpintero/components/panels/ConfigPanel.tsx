'use client';

import { Archive, BookOpen, Hammer, Layers, Library, PanelsTopLeft, RotateCcw, Ruler, SlidersHorizontal, Weight } from 'lucide-react';
import type { ReactNode } from 'react';
import { TEMPLATE_LABELS, TEMPLATE_LIMITS } from '@/lib/engine/calculator';
import { BACK_MATERIALS, CARCASS_MATERIALS, LOAD_PROFILES, getMaterial } from '@/lib/engine/materials';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { NumberField } from '@/components/ui/NumberField';
import { Section, SegmentedControl } from '@/components/ui/Section';
import { Select } from '@/components/ui/Select';
import { SwitchField } from '@/components/ui/Switch';
import { useActiveProject, useConfigurator } from '@/store/useConfigurator';
import type { FurnitureTemplate, JoineryMethod, LoadProfile, MaterialId } from '@/types/carpentry';

const TEMPLATE_CARDS: ReadonlyArray<{ value: FurnitureTemplate; icon: ReactNode; hint: string }> = [
  { value: 'bookshelf', icon: <Library className="h-5 w-5" />, hint: 'Módulos y entrepaños' },
  { value: 'cabinet', icon: <PanelsTopLeft className="h-5 w-5" />, hint: 'Puertas abatibles' },
  { value: 'dresser', icon: <Archive className="h-5 w-5" />, hint: 'Cajones con corredera' },
];

const JOINERY_OPTIONS: ReadonlyArray<{ value: JoineryMethod; label: string }> = [
  { value: 'confirmat', label: 'Confirmat' },
  { value: 'cam-lock', label: 'Minifix' },
  { value: 'dowel', label: 'Taquete' },
];

export function ConfigPanel() {
  const config = useActiveProject();
  const setDimension = useConfigurator((s) => s.setDimension);
  const updateActive = useConfigurator((s) => s.updateActive);
  const setTemplate = useConfigurator((s) => s.setTemplate);
  const setMaterial = useConfigurator((s) => s.setMaterial);
  const setBackMaterial = useConfigurator((s) => s.setBackMaterial);
  const setJoinery = useConfigurator((s) => s.setJoinery);
  const setLoadProfile = useConfigurator((s) => s.setLoadProfile);
  const resetActive = useConfigurator((s) => s.resetActive);

  const limits = TEMPLATE_LIMITS[config.template];
  const material = getMaterial(config.materialId);

  return (
    <div className="space-y-7">
      <Section title="Tipo de mueble" icon={<Hammer className="h-3.5 w-3.5" />}>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATE_CARDS.map((card) => (
            <button
              key={card.value}
              type="button"
              onClick={() => setTemplate(card.value)}
              aria-pressed={config.template === card.value}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center ring-1 transition',
                config.template === card.value
                  ? 'bg-amber-50 text-amber-900 ring-2 ring-amber-500'
                  : 'bg-white text-stone-700 ring-stone-200 hover:ring-stone-300',
              )}
            >
              {card.icon}
              <span className="text-xs font-semibold leading-tight">{TEMPLATE_LABELS[card.value]}</span>
              <span className="text-[10px] leading-tight text-stone-500">{card.hint}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Medidas generales"
        icon={<Ruler className="h-3.5 w-3.5" />}
        action={
          <Button variant="ghost" size="sm" onClick={resetActive} title="Restablecer medidas del tipo de mueble">
            <RotateCcw className="h-3.5 w-3.5" /> Restablecer
          </Button>
        }
      >
        <NumberField label="Ancho" unit="mm" step={10} value={config.dimensions.width} {...limits.width} onChange={(v) => setDimension('width', v)} />
        <NumberField label="Alto" unit="mm" step={10} value={config.dimensions.height} {...limits.height} onChange={(v) => setDimension('height', v)} />
        <NumberField label="Fondo" unit="mm" step={10} value={config.dimensions.depth} {...limits.depth} onChange={(v) => setDimension('depth', v)} />
      </Section>

      <Section title="Distribución" icon={<Layers className="h-3.5 w-3.5" />}>
        {config.template === 'bookshelf' && (
          <NumberField
            label="Módulos (divisiones verticales)"
            value={config.bayCount}
            {...limits.bayCount}
            onChange={(v) => updateActive({ bayCount: v })}
            hint="Cada divisor reduce el claro de los entrepaños."
          />
        )}
        {config.template !== 'dresser' && (
          <NumberField
            label={config.template === 'bookshelf' ? 'Entrepaños por módulo' : 'Entrepaños'}
            value={config.shelfCount}
            {...limits.shelfCount}
            onChange={(v) => updateActive({ shelfCount: v })}
          />
        )}
        {config.template === 'cabinet' && (
          <NumberField label="Puertas" value={config.doorCount} {...limits.doorCount} onChange={(v) => updateActive({ doorCount: v })} />
        )}
        {config.template === 'dresser' && (
          <NumberField label="Cajones" value={config.drawerCount} {...limits.drawerCount} onChange={(v) => updateActive({ drawerCount: v })} />
        )}
      </Section>

      <Section title="Tablero y uniones" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
        <Select<MaterialId>
          label="Tablero del casco"
          value={config.materialId}
          options={CARCASS_MATERIALS.map((m) => ({
            value: m.id,
            label: m.name,
            description: `${m.sheetLength} × ${m.sheetWidth} mm · ${formatMoney(m.pricePerSheet)}${m.hasGrain ? ' · con veta' : ''}`,
          }))}
          onChange={setMaterial}
        />
        <div className="flex items-center gap-2 rounded-lg bg-stone-50 p-2 ring-1 ring-stone-100">
          <span className="h-8 w-8 shrink-0 rounded-md ring-1 ring-black/10" style={{ background: material.color }} aria-hidden />
          <p className="text-[11px] leading-snug text-stone-600">
            Espesor <strong className="text-stone-900">{material.thickness} mm</strong> · módulo de elasticidad{' '}
            {material.elasticModulusMPa.toLocaleString('es-MX')} MPa
            {material.hasGrain ? ' · las piezas respetan la veta en el corte' : ''}
          </p>
        </div>
        <SegmentedControl label="Tipo de unión" value={config.joinery} options={JOINERY_OPTIONS} onChange={setJoinery} />
      </Section>

      <Section title="Base y fondo" icon={<BookOpen className="h-3.5 w-3.5" />}>
        <SwitchField
          label="Zócalo"
          description={config.hasKick ? 'Retranqueado 40 mm del frente' : 'Se usan niveladores'}
          checked={config.hasKick}
          onChange={(hasKick) => updateActive({ hasKick })}
        />
        {config.hasKick && (
          <NumberField label="Altura del zócalo" unit="mm" step={5} value={config.kickHeight} {...limits.kickHeight} onChange={(v) => updateActive({ kickHeight: v })} />
        )}
        <SwitchField
          label="Fondo trasero"
          description="Da rigidez y escuadra al mueble"
          checked={config.hasBack}
          onChange={(hasBack) => updateActive({ hasBack })}
        />
        {(config.hasBack || config.template === 'dresser') && (
          <Select<MaterialId>
            label={config.template === 'dresser' ? 'Fondo del mueble y de cajones' : 'Material del fondo'}
            value={config.backMaterialId}
            options={BACK_MATERIALS.map((m) => ({ value: m.id, label: m.name, description: formatMoney(m.pricePerSheet) }))}
            onChange={setBackMaterial}
          />
        )}
      </Section>

      <Section title="Uso y detalles" icon={<Weight className="h-3.5 w-3.5" />}>
        <Select<LoadProfile>
          label="Carga esperada"
          value={config.loadProfile}
          options={(Object.keys(LOAD_PROFILES) as LoadProfile[]).map((key) => ({ value: key, label: LOAD_PROFILES[key].label }))}
          onChange={setLoadProfile}
        />
        {config.template !== 'bookshelf' && (
          <NumberField label="Holgura entre frentes" unit="mm" step={0.5} min={1} max={6} value={config.frontGap} onChange={(v) => updateActive({ frontGap: v })} />
        )}
        <NumberField
          label="Espesor del canto"
          unit="mm"
          step={0.1}
          min={0.4}
          max={3}
          value={config.edgeBandThickness}
          onChange={(v) => updateActive({ edgeBandThickness: Math.round(v * 10) / 10 })}
        />
        <div className="space-y-1">
          <label htmlFor="project-notes" className="text-xs font-semibold text-stone-700">
            Notas del proyecto
          </label>
          <textarea
            id="project-notes"
            value={config.notes}
            maxLength={2000}
            onChange={(event) => updateActive({ notes: event.target.value })}
            rows={3}
            placeholder="Color de canto, acabado, lugar de instalación…"
            className="w-full resize-y rounded-lg bg-white p-2.5 text-sm text-stone-800 ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </Section>
    </div>
  );
}
