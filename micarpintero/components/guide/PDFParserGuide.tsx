'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  Loader2,
  PartyPopper,
  RotateCcw,
  Ruler,
  Trash2,
  Upload,
  Wand2,
  Wrench,
} from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { APP_NAME } from '@/lib/constants';
import { createId } from '@/lib/id';
import { guideFromProject, itemsToLines, structureGuide, type PositionedTextItem } from '@/lib/pdf/guideParser';
import { loadFile, saveFile } from '@/lib/storage/indexedDb';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { computeProgress, useGuideStore } from '@/store/useGuideStore';
import type { ExtractedLine, FurnitureModel, GuideStep, ParsedGuide } from '@/types/carpentry';

/**
 * Drag-and-drop PDF manuals, parse them fully in the browser with pdf.js and
 * turn them into an interactive, persisted, step-by-step build guide.
 */

const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_PAGES = 300;

type PdfJsModule = typeof import('pdfjs-dist');

let pdfJsPromise: Promise<PdfJsModule> | null = null;

/** Loads pdf.js once and points it at the worker shipped next to index.html. */
const loadPdfJs = (): Promise<PdfJsModule> => {
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', document.baseURI).toString();
      return pdfjs;
    });
    pdfJsPromise.catch(() => {
      pdfJsPromise = null;
    });
  }
  return pdfJsPromise;
};

const openPdf = async (data: ArrayBuffer): Promise<PDFDocumentProxy> => {
  const pdfjs = await loadPdfJs();
  // pdf.js transfers the buffer to its worker, so always hand it a copy.
  return pdfjs.getDocument({ data: new Uint8Array(data.slice(0)), isEvalSupported: false, enableXfa: false }).promise;
};

interface ParseProgress {
  page: number;
  total: number;
}

/** Extracts positioned text from every page and rebuilds reading-order lines. */
const extractLines = async (doc: PDFDocumentProxy, onProgress: (p: ParseProgress) => void): Promise<ExtractedLine[]> => {
  const total = Math.min(doc.numPages, MAX_PAGES);
  const lines: ExtractedLine[] = [];
  for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: PositionedTextItem[] = [];
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const [a, b, c, d, e, f] = item.transform.map((value) => Number(value));
      const glyphHeight = item.height > 0 ? item.height : Math.hypot(c ?? 0, d ?? 0) || Math.hypot(a ?? 0, b ?? 0);
      items.push({ str: item.str, x: e ?? 0, y: f ?? 0, width: item.width, height: glyphHeight });
    }
    lines.push(...itemsToLines(items, pageNumber));
    page.cleanup();
    onProgress({ page: pageNumber, total });
  }
  return lines;
};

// ---------------------------------------------------------------------------
// Page preview
// ---------------------------------------------------------------------------

const documentCache = new Map<string, Promise<PDFDocumentProxy | null>>();

const getStoredDocument = (guideId: string): Promise<PDFDocumentProxy | null> => {
  const cached = documentCache.get(guideId);
  if (cached) return cached;
  const promise = loadFile(guideId)
    .then((data) => (data ? openPdf(data) : null))
    .catch(() => null);
  documentCache.set(guideId, promise);
  return promise;
};

function PdfPagePreview({ guideId, page }: { guideId: string; page: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    let task: RenderTask | null = null;
    setState('loading');

    void (async () => {
      const doc = await getStoredDocument(guideId);
      if (cancelled) return;
      if (!doc || page < 1 || page > doc.numPages) {
        setState('missing');
        return;
      }
      const pdfPage = await doc.getPage(page);
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (cancelled || !canvas || !container) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const cssWidth = container.clientWidth || 480;
      const ratio = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale: (cssWidth / base.width) * ratio });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${viewport.height / ratio}px`;
      const context = canvas.getContext('2d');
      if (!context) {
        setState('missing');
        return;
      }
      task = pdfPage.render({ canvasContext: context, viewport });
      try {
        await task.promise;
        if (!cancelled) setState('ready');
      } catch {
        // Render cancelled because the step changed.
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [guideId, page]);

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
      {state === 'loading' && (
        <div className="flex h-48 items-center justify-center text-xs text-stone-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Renderizando página {page}…
        </div>
      )}
      {state === 'missing' && <div className="flex h-24 items-center justify-center text-xs text-stone-500">Vista previa no disponible</div>}
      <canvas ref={canvasRef} className={cn('block', state !== 'ready' && 'hidden')} aria-label={`Página ${page} del manual`} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

type UploadStatus =
  | { kind: 'idle' }
  | { kind: 'parsing'; fileName: string; progress: ParseProgress | null }
  | { kind: 'error'; message: string };

function Dropzone({ onFile, status }: { onFile: (file: File) => void; status: UploadStatus }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const busy = status.kind === 'parsing';

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy) onFile(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={busy}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !busy) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200',
        dragging ? 'border-amber-500 bg-amber-50' : 'border-stone-300 bg-white hover:border-stone-400',
        busy && 'cursor-wait opacity-80',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
      {busy ? (
        <>
          <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
          <p className="text-sm font-semibold text-stone-800">Leyendo {status.fileName}</p>
          <p className="text-xs text-stone-500">
            {status.progress ? `Página ${status.progress.page} de ${status.progress.total}` : 'Abriendo documento…'}
          </p>
          {status.progress && (
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${(status.progress.page / status.progress.total) * 100}%` }} />
            </div>
          )}
        </>
      ) : (
        <>
          <Upload className="h-7 w-7 text-stone-400" />
          <p className="text-sm font-semibold text-stone-800">Arrastra aquí un manual en PDF o haz clic para elegirlo</p>
          <p className="text-xs text-stone-500">Se procesa en tu navegador; el archivo no se sube a ningún servidor.</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step tracker
// ---------------------------------------------------------------------------

const DETECTION_LABEL: Readonly<Record<ParsedGuide['detection'], string>> = {
  'numbered-headings': 'Pasos numerados detectados',
  'font-headings': 'Pasos detectados por títulos',
  paragraphs: 'Pasos detectados por párrafos',
  project: 'Generada desde tu diseño',
};

/** Accumulates time on the active step while the page is visible. */
const useStepTimer = (guideId: string | null, stepId: string | null): void => {
  const addElapsed = useGuideStore((s) => s.addElapsed);
  useEffect(() => {
    if (!guideId || !stepId) return;
    let last = performance.now();
    const tick = (): void => {
      const now = performance.now();
      if (document.visibilityState === 'visible') addElapsed(guideId, stepId, now - last);
      last = now;
    };
    const interval = window.setInterval(tick, 1000);
    const onVisibility = (): void => {
      last = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      tick();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [guideId, stepId, addElapsed]);
};

function Chips({ icon, items, tone }: { icon: React.ReactNode; items: string[]; tone: 'stone' | 'blue' | 'amber' }) {
  if (items.length === 0) return null;
  const tones = {
    stone: 'bg-stone-100 text-stone-700',
    blue: 'bg-blue-50 text-blue-800',
    amber: 'bg-amber-50 text-amber-900',
  } as const;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-stone-400">{icon}</span>
      {items.map((item) => (
        <span key={item} className={cn('rounded-md px-2 py-0.5 text-xs font-medium', tones[tone])}>
          {item}
        </span>
      ))}
    </div>
  );
}

function StepDetail({ guide, step, index }: { guide: ParsedGuide; step: GuideStep; index: number }) {
  const setActiveStep = useGuideStore((s) => s.setActiveStep);
  const toggleStep = useGuideStore((s) => s.toggleStep);
  const completeAndAdvance = useGuideStore((s) => s.completeAndAdvance);
  const setNote = useGuideStore((s) => s.setNote);
  const previous = guide.steps[index - 1];
  const next = guide.steps[index + 1];

  return (
    <article className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          Paso {step.order} de {guide.steps.length}
          {step.page > 0 && <span className="ml-2 font-normal normal-case text-stone-400">· página {step.page}</span>}
        </p>
        <h3 className="text-xl font-bold leading-tight text-stone-900">{step.title}</h3>
      </header>

      {step.warnings.length > 0 && (
        <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200" role="note">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <ul className="space-y-1">
            {step.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {step.body ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700">{step.body}</p>
      ) : (
        <p className="text-sm italic text-stone-400">Este paso no tiene texto adicional; revisa la ilustración de la página.</p>
      )}

      <div className="space-y-2">
        <Chips icon={<Ruler className="h-3.5 w-3.5" />} items={step.dimensions} tone="blue" />
        <Chips icon={<Wrench className="h-3.5 w-3.5" />} items={[...step.tools, ...step.hardware]} tone="amber" />
      </div>

      {guide.source === 'pdf' && step.page > 0 && <PdfPagePreview guideId={guide.id} page={step.page} />}

      <div className="space-y-1">
        <label htmlFor={`note-${step.id}`} className="text-xs font-semibold text-stone-700">
          Mis notas
        </label>
        <textarea
          id={`note-${step.id}`}
          value={step.note}
          onChange={(event) => setNote(guide.id, step.id, event.target.value)}
          rows={2}
          placeholder="Ej.: faltó un tornillo, usar broca de 5 mm…"
          className="w-full resize-y rounded-lg bg-white p-2.5 text-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-4">
        <Button variant="ghost" size="sm" disabled={!previous} onClick={() => previous && setActiveStep(guide.id, previous.id)}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <div className="flex flex-wrap gap-2">
          {step.completed ? (
            <Button size="sm" onClick={() => toggleStep(guide.id, step.id)}>
              <RotateCcw className="h-3.5 w-3.5" /> Marcar pendiente
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => completeAndAdvance(guide.id)}>
              <CheckCircle2 className="h-4 w-4" /> Hecho, siguiente
            </Button>
          )}
          <Button variant="ghost" size="sm" disabled={!next} onClick={() => next && setActiveStep(guide.id, next.id)}>
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
      <p className="text-[11px] text-stone-400">
        Atajos: ← / → para moverte, Enter para marcar como hecho. Tiempo en este paso: {formatDuration(step.elapsedMs)}
      </p>
    </article>
  );
}

function GuideTracker({ guide }: { guide: ParsedGuide }) {
  const setActiveStep = useGuideStore((s) => s.setActiveStep);
  const completeAndAdvance = useGuideStore((s) => s.completeAndAdvance);
  const resetProgress = useGuideStore((s) => s.resetProgress);
  const listRef = useRef<HTMLOListElement>(null);

  const activeIndex = Math.max(0, guide.steps.findIndex((s) => s.id === guide.activeStepId));
  const active = guide.steps[activeIndex];
  const progress = computeProgress(guide);
  useStepTimer(guide.id, active && !active.completed ? active.id : null);

  useEffect(() => {
    const item = listRef.current?.querySelector<HTMLElement>(`[data-step="${active?.id ?? ''}"]`);
    item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active?.id]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      const next = guide.steps[activeIndex + 1];
      if (next) {
        event.preventDefault();
        setActiveStep(guide.id, next.id);
      }
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      const prev = guide.steps[activeIndex - 1];
      if (prev) {
        event.preventDefault();
        setActiveStep(guide.id, prev.id);
      }
    } else if (event.key === 'Enter' && target.tagName !== 'BUTTON') {
      event.preventDefault();
      completeAndAdvance(guide.id);
    }
  };

  if (guide.steps.length === 0 || !active) {
    return <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600">No se detectaron pasos en este documento.</p>;
  }

  return (
    <div className="space-y-4 focus:outline-none" tabIndex={-1} onKeyDown={onKeyDown}>
      <div className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-stone-900">{guide.title}</h3>
            <p className="text-xs text-stone-500">
              {DETECTION_LABEL[guide.detection]}
              {guide.pageCount > 0 && ` · ${guide.pageCount} páginas`}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-600">
            <span className="flex items-center gap-1 font-mono" aria-label="Tiempo total">
              <Clock className="h-3.5 w-3.5" /> {formatDuration(progress.elapsedMs)}
            </span>
            <Button variant="ghost" size="sm" onClick={() => resetProgress(guide.id)}>
              <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.completed}
            aria-label="Progreso del armado"
          >
            <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${progress.ratio * 100}%` }} />
          </div>
          <span className="shrink-0 font-mono text-xs font-semibold text-stone-700">
            {progress.completed}/{progress.total}
          </span>
        </div>
        {guide.tools.length > 0 && <Chips icon={<Wrench className="h-3.5 w-3.5" />} items={guide.tools} tone="stone" />}
      </div>

      {progress.completed === progress.total && (
        <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200">
          <PartyPopper className="h-5 w-5 shrink-0" />
          ¡Terminaste! {progress.total} pasos en {formatDuration(progress.elapsedMs)}.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <ol ref={listRef} className="max-h-[520px] space-y-1 overflow-y-auto pr-1" aria-label="Pasos">
          {guide.steps.map((step) => (
            <li key={step.id} data-step={step.id}>
              <button
                type="button"
                onClick={() => setActiveStep(guide.id, step.id)}
                aria-current={step.id === active.id ? 'step' : undefined}
                className={cn(
                  'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition',
                  step.id === active.id ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-stone-50',
                )}
              >
                {step.completed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-label="Hecho" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-300" aria-label="Pendiente" />
                )}
                <span className={cn('min-w-0', step.completed && 'text-stone-400 line-through')}>
                  <span className="mr-1 font-mono text-xs text-stone-400">{step.order}.</span>
                  {step.title}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200 sm:p-5">
          <StepDetail guide={guide} step={active} index={activeIndex} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PDFParserGuide({ model }: { model: FurnitureModel }) {
  const guides = useGuideStore((s) => s.guides);
  const guideOrder = useGuideStore((s) => s.guideOrder);
  const activeGuideId = useGuideStore((s) => s.activeGuideId);
  const addGuide = useGuideStore((s) => s.addGuide);
  const removeGuide = useGuideStore((s) => s.removeGuide);
  const selectGuide = useGuideStore((s) => s.selectGuide);
  const hasHydrated = useGuideStore((s) => s.hasHydrated);
  const [status, setStatus] = useState<UploadStatus>({ kind: 'idle' });

  const activeGuide = activeGuideId ? guides[activeGuideId] : undefined;
  const orderedGuides = useMemo(() => guideOrder.map((id) => guides[id]).filter((g): g is ParsedGuide => Boolean(g)), [guideOrder, guides]);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setStatus({ kind: 'error', message: 'El archivo debe ser un PDF.' });
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setStatus({ kind: 'error', message: 'El PDF pesa más de 40 MB.' });
        return;
      }
      setStatus({ kind: 'parsing', fileName: file.name, progress: null });
      try {
        const buffer = await file.arrayBuffer();
        const doc = await openPdf(buffer);
        const lines = await extractLines(doc, (progress) => setStatus({ kind: 'parsing', fileName: file.name, progress }));
        const pageCount = doc.numPages;
        await doc.destroy();
        if (lines.length === 0) {
          setStatus({
            kind: 'error',
            message: 'El PDF no tiene texto seleccionable (parece escaneado). Usa un PDF digital o genera la guía desde tu diseño.',
          });
          return;
        }
        const structured = structureGuide(lines, pageCount, file.name);
        const id = createId('guide');
        try {
          await saveFile(id, buffer);
        } catch {
          // Without IndexedDB the guide still works, just without page previews.
        }
        addGuide({
          id,
          source: 'pdf',
          title: structured.title,
          fileName: file.name,
          pageCount,
          parsedAt: Date.now(),
          detection: structured.detection,
          steps: structured.steps,
          activeStepId: structured.steps[0]?.id ?? null,
          tools: structured.tools,
        });
        setStatus({ kind: 'idle' });
      } catch (error) {
        const message =
          error instanceof Error && error.name === 'PasswordException'
            ? 'El PDF está protegido con contraseña.'
            : error instanceof Error && error.name === 'InvalidPDFException'
              ? 'El archivo está dañado o no es un PDF válido.'
              : 'No se pudo leer el PDF.';
        setStatus({ kind: 'error', message });
      }
    },
    [addGuide],
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
        <Dropzone onFile={(file) => void handleFile(file)} status={status} />
        <button
          type="button"
          onClick={() => addGuide(guideFromProject(model))}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-6 text-center text-white transition hover:bg-stone-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
        >
          <Wand2 className="h-6 w-6 text-amber-300" />
          <span className="text-sm font-semibold">Generar guía de mi diseño</span>
          <span className="text-xs text-stone-300">{model.assemblySteps.length} pasos de «{model.config.name}»</span>
        </button>
      </div>

      {status.kind === 'error' && (
        <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {status.message}
        </p>
      )}

      {orderedGuides.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Guías guardadas">
          {orderedGuides.map((guide) => {
            const progress = computeProgress(guide);
            const selected = guide.id === activeGuideId;
            return (
              <div
                key={guide.id}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-xl py-1 pl-3 pr-1 ring-1 transition',
                  selected ? 'bg-amber-50 ring-amber-400' : 'bg-white ring-stone-200 hover:ring-stone-300',
                )}
              >
                <button type="button" role="tab" aria-selected={selected} onClick={() => selectGuide(guide.id)} className="flex items-center gap-2 text-left">
                  {guide.source === 'pdf' ? <FileText className="h-4 w-4 text-stone-500" /> : <Wand2 className="h-4 w-4 text-amber-600" />}
                  <span className="max-w-[180px] truncate text-xs font-semibold text-stone-800">{guide.title}</span>
                  <span className="font-mono text-[11px] text-stone-500">{Math.round(progress.ratio * 100)}%</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeGuide(guide.id)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Eliminar guía ${guide.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeGuide ? (
        <GuideTracker key={activeGuide.id} guide={activeGuide} />
      ) : (
        hasHydrated && (
          <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600 ring-1 ring-stone-200">
            Sube el manual de un mueble (IKEA, fabricantes, tus propios planos) y {APP_NAME} detectará los pasos, medidas, herramientas y
            advertencias para guiarte mientras armas. Tu avance se guarda en este navegador.
          </p>
        )
      )}
    </div>
  );
}
