import { createId } from '@/lib/id';
import type { AssemblyStep, ExtractedLine, FurnitureModel, GuideStep, HardwareKind, ParsedGuide } from '@/types/carpentry';

/**
 * Turns the text lines of an assembly manual into ordered, trackable steps.
 * Pure functions only: pdf.js extraction happens in the component, which
 * feeds the resulting lines in here.
 *
 * Detection strategies, in order of preference:
 *  1. numbered headings ("Paso 3", "Step 3:", "3.", "3)")
 *  2. typographic headings (lines noticeably larger than the body text)
 *  3. paragraphs grouped by imperative verbs / blank space, max ~8 lines each
 */

/** Raw positioned text item as produced by pdf.js `getTextContent`. */
export interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const STEP_HEADING = /^\s*(?:paso|step|etapa|fase|schritt|étape|etape|passo)\s*(?:n[°ºo.]\s*)?(\d{1,3})\b[\s.:)\-–—]*(.*)$/i;
const NUMBERED_LINE = /^\s*(\d{1,2})\s*[.)]\s+(\S.*)$/;
const BARE_NUMBER = /^\s*(\d{1,2})\s*$/;
/** "3 Une los costados": only trusted when the line is set larger than body text. */
const NUMBER_THEN_TITLE = /^\s*(\d{1,2})\s+([A-ZÁÉÍÓÚÑ¿¡][^\d].{1,100})$/;

const DIMENSION_PATTERN =
  /\b\d+(?:[.,]\d+)?\s*(?:[x×]\s*\d+(?:[.,]\d+)?\s*){0,2}(?:mm|cm|m|in|pulg(?:adas?)?|")(?![a-z])/gi;
const HARDWARE_COUNT_PATTERN =
  /\b(\d{1,3})\s*(?:x|×|pz|pzs|pcs|piezas?)\s*([A-Za-zÁÉÍÓÚÑáéíóúñ][\wÁÉÍÓÚÑáéíóúñ\- ]{2,28})/g;
const WARNING_PATTERN =
  /\b(precauci[oó]n|advertencia|cuidado|peligro|importante|atenci[oó]n|warning|caution|danger|important|note|nota)\b/i;
const IMPERATIVE_START =
  /^(?:coloca|colocar|fija|fijar|atornilla|atornillar|inserta|insertar|une|unir|monta|montar|arma|armar|ajusta|ajustar|repite|repetir|verifica|verificar|taladra|taladrar|barrena|barrenar|clava|clavar|pega|pegar|lija|lijar|mide|medir|marca|marcar|corta|cortar|instala|instalar|place|insert|attach|fix|screw|mount|assemble|adjust|repeat|check|drill|nail|glue|sand|measure|mark|cut|install|slide|push|tighten|align)\b/i;

const TOOL_KEYWORDS: ReadonlyArray<[RegExp, string]> = [
  [/destornillador|desarmador|screwdriver/i, 'Desarmador'],
  [/phillips|cruz/i, 'Desarmador de cruz'],
  [/taladro|drill(?!ing)/i, 'Taladro'],
  [/atornillador|impact driver/i, 'Atornillador'],
  [/martillo|hammer/i, 'Martillo'],
  [/llave allen|allen|hex key|llave hexagonal/i, 'Llave Allen'],
  [/nivel\b|spirit level|\blevel\b/i, 'Nivel'],
  [/flex[oó]metro|cinta m[eé]trica|tape measure/i, 'Flexómetro'],
  [/escuadra|square/i, 'Escuadra'],
  [/sargento|prensa|clamp/i, 'Sargentos / prensas'],
  [/broca forstner|forstner/i, 'Broca Forstner'],
  [/broca|drill bit/i, 'Brocas'],
  [/lija|sandpaper|sanding/i, 'Lija'],
  [/sierra|serrucho|saw/i, 'Sierra'],
  [/pegamento|cola blanca|wood glue|\bglue\b/i, 'Pegamento'],
  [/mazo|mallet/i, 'Mazo de goma'],
  [/l[aá]piz|pencil/i, 'Lápiz'],
];

const normalizeSpaces = (text: string): string => text.replace(/\s+/g, ' ').trim();

const unique = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Line reconstruction
// ---------------------------------------------------------------------------

/**
 * Groups positioned text items into reading-order lines. Items whose baselines
 * are within 45 % of the glyph height belong to the same line; inside a line
 * items are sorted left to right and joined with a space when there is a gap.
 */
export const itemsToLines = (items: readonly PositionedTextItem[], page: number): ExtractedLine[] => {
  const visible = items.filter((item) => item.str.trim().length > 0);
  const sorted = [...visible].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PositionedTextItem[][] = [];

  for (const item of sorted) {
    const row = rows[rows.length - 1];
    const anchor = row?.[0];
    const tolerance = Math.max(2, (anchor?.height ?? item.height) * 0.45);
    if (row && anchor && Math.abs(anchor.y - item.y) <= tolerance) row.push(item);
    else rows.push([item]);
  }

  return rows.map((row) => {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    let text = '';
    let lastEnd = -Infinity;
    for (const item of ordered) {
      const gap = item.x - lastEnd;
      const needsSpace = text.length > 0 && gap > Math.max(1, item.height * 0.15) && !text.endsWith(' ') && !item.str.startsWith(' ');
      text += (needsSpace ? ' ' : '') + item.str;
      lastEnd = item.x + item.width;
    }
    const fontSize = ordered.reduce((sum, item) => sum + item.height, 0) / ordered.length;
    return { page, text: normalizeSpaces(text), fontSize, y: ordered[0]?.y ?? 0 };
  });
};

/** Drops repeated headers/footers and page numbers that appear on most pages. */
export const removeRunningHeaders = (lines: readonly ExtractedLine[], pageCount: number): ExtractedLine[] => {
  if (pageCount < 3) return lines.filter((l) => !/^\s*(?:p[aá]g(?:ina)?\.?\s*)?\d{1,3}(?:\s*(?:de|of|\/)\s*\d{1,3})?\s*$/i.test(l.text));
  const frequency = new Map<string, Set<number>>();
  for (const line of lines) {
    const key = line.text.toLowerCase().replace(/\d+/g, '#');
    const pages = frequency.get(key) ?? new Set<number>();
    pages.add(line.page);
    frequency.set(key, pages);
  }
  const threshold = Math.max(3, Math.ceil(pageCount * 0.6));
  return lines.filter((line) => {
    const key = line.text.toLowerCase().replace(/\d+/g, '#');
    const repeated = (frequency.get(key)?.size ?? 0) >= threshold;
    const pageNumber = /^\s*(?:p[aá]g(?:ina)?\.?\s*)?\d{1,3}(?:\s*(?:de|of|\/)\s*\d{1,3})?\s*$/i.test(line.text);
    return !repeated && !pageNumber;
  });
};

// ---------------------------------------------------------------------------
// Entity extraction
// ---------------------------------------------------------------------------

export const extractDimensions = (text: string): string[] =>
  unique((text.match(DIMENSION_PATTERN) ?? []).map((d) => normalizeSpaces(d.replace(/×/g, 'x'))));

export const extractTools = (text: string): string[] =>
  unique(TOOL_KEYWORDS.filter(([pattern]) => pattern.test(text)).map(([, label]) => label));

export const extractHardware = (text: string): string[] => {
  const found: string[] = [];
  for (const match of text.matchAll(HARDWARE_COUNT_PATTERN)) {
    const count = match[1];
    const name = match[2];
    if (count && name) found.push(`${count} × ${normalizeSpaces(name).replace(/[.,;:]+$/, '')}`);
  }
  return unique(found);
};

export const extractWarnings = (lines: readonly string[]): string[] =>
  unique(lines.filter((line) => WARNING_PATTERN.test(line)).map(normalizeSpaces));

// ---------------------------------------------------------------------------
// Step detection
// ---------------------------------------------------------------------------

interface RawStep {
  title: string;
  page: number;
  lines: string[];
  number: number | null;
}

const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
};

const matchNumberedHeading = (text: string): { number: number; rest: string } | null => {
  const step = STEP_HEADING.exec(text);
  if (step?.[1]) return { number: Number(step[1]), rest: normalizeSpaces(step[2] ?? '') };
  const numbered = NUMBERED_LINE.exec(text);
  if (numbered?.[1] && numbered[2] && numbered[2].length < 140) return { number: Number(numbered[1]), rest: normalizeSpaces(numbered[2]) };
  const bare = BARE_NUMBER.exec(text);
  if (bare?.[1]) return { number: Number(bare[1]), rest: '' };
  return null;
};

/**
 * Numbered headings are accepted only when they form a mostly increasing
 * sequence; this rejects stray numbers like quantities or page labels.
 */
const splitByNumberedHeadings = (lines: readonly ExtractedLine[]): RawStep[] | null => {
  const bodySize = median(lines.map((l) => l.fontSize));
  const candidates: Array<{ index: number; number: number; rest: string; strong: boolean }> = [];
  lines.forEach((line, index) => {
    const strong = STEP_HEADING.test(line.text) || line.fontSize > bodySize * 1.15;
    const loose = strong ? NUMBER_THEN_TITLE.exec(line.text) : null;
    const match =
      matchNumberedHeading(line.text) ?? (loose?.[1] && loose[2] ? { number: Number(loose[1]), rest: normalizeSpaces(loose[2]) } : null);
    if (!match) return;
    candidates.push({ index, ...match, strong });
  });

  // Explicit "Paso N" headings win; bare numbers only count when typeset larger.
  const explicit = candidates.filter((c) => STEP_HEADING.test(lines[c.index]?.text ?? ''));
  const pool =
    explicit.length >= 2 ? explicit : candidates.filter((c) => c.strong || !BARE_NUMBER.test(lines[c.index]?.text ?? ''));

  // Longest run 1, 2, 3… starting from any "1" (a table of contents may hold an earlier run).
  let chain: typeof candidates = [];
  pool.forEach((start, startIndex) => {
    if (start.number > 1) return;
    const run = [start];
    let expected = start.number + 1;
    for (const candidate of pool.slice(startIndex + 1)) {
      if (candidate.number === expected) {
        run.push(candidate);
        expected += 1;
      }
    }
    if (run.length > chain.length) chain = run;
  });
  if (chain.length < 2) return null;

  const steps: RawStep[] = [];
  chain.forEach((head, i) => {
    const start = head.index;
    const end = chain[i + 1]?.index ?? lines.length;
    const block = lines.slice(start + 1, end);
    const firstLine = lines[start];
    let title = head.rest;
    const body = block.map((l) => l.text);
    if (!title && body.length > 0) title = body.shift() ?? '';
    steps.push({ title: title || `Paso ${head.number}`, page: firstLine?.page ?? 1, lines: body, number: head.number });
  });
  return steps;
};

const splitByFontHeadings = (lines: readonly ExtractedLine[]): RawStep[] | null => {
  const bodySize = median(lines.map((l) => l.fontSize));
  const isHeading = (line: ExtractedLine): boolean =>
    line.fontSize >= bodySize * 1.25 && line.text.length >= 3 && line.text.length <= 90 && !/[.;,]$/.test(line.text);
  const headingIndexes = lines.map((line, index) => (isHeading(line) ? index : -1)).filter((i) => i >= 0);
  if (headingIndexes.length < 2) return null;

  const steps: RawStep[] = [];
  headingIndexes.forEach((index, i) => {
    const line = lines[index];
    if (!line) return;
    const end = headingIndexes[i + 1] ?? lines.length;
    const body = lines.slice(index + 1, end).map((l) => l.text);
    if (body.length === 0 && steps.length > 0) return; // consecutive headings: keep the lower one
    steps.push({ title: line.text, page: line.page, lines: body, number: null });
  });
  return steps.length >= 2 ? steps : null;
};

const splitByParagraphs = (lines: readonly ExtractedLine[]): RawStep[] => {
  const steps: RawStep[] = [];
  let current: RawStep | null = null;
  let previous: ExtractedLine | null = null;

  for (const line of lines) {
    const bigGap = previous !== null && previous.page === line.page && previous.y - line.y > previous.fontSize * 1.9;
    const newPage = previous !== null && previous.page !== line.page;
    const startsAction = IMPERATIVE_START.test(line.text);
    const full = current !== null && current.lines.length >= 8;
    if (!current || bigGap || newPage || full || (startsAction && current.lines.length >= 2)) {
      current = { title: line.text, page: line.page, lines: [], number: null };
      steps.push(current);
    } else {
      current.lines.push(line.text);
    }
    previous = line;
  }
  return steps.filter((s) => s.title.length > 0);
};

const shortenTitle = (title: string): string => {
  const clean = normalizeSpaces(title.replace(/^[\-–—•·*]+\s*/, ''));
  if (clean.length <= 80) return clean;
  const cut = clean.slice(0, 80);
  return `${cut.slice(0, Math.max(40, cut.lastIndexOf(' ')))}…`;
};

const toGuideStep = (raw: RawStep, order: number): GuideStep => {
  const body = normalizeSpaces(raw.lines.join(' ').replace(/-\s+(?=[a-záéíóúñ])/g, ''));
  const all = `${raw.title} ${body}`;
  return {
    id: createId('step'),
    order,
    title: shortenTitle(raw.title) || `Paso ${order}`,
    body,
    page: raw.page,
    dimensions: extractDimensions(all),
    tools: extractTools(all),
    hardware: extractHardware(all),
    warnings: extractWarnings([raw.title, ...raw.lines]),
    completed: false,
    completedAt: null,
    elapsedMs: 0,
    note: '',
  };
};

export interface StructureResult {
  steps: GuideStep[];
  detection: ParsedGuide['detection'];
  tools: string[];
  title: string;
}

/** Converts extracted lines into steps using the best detection strategy. */
export const structureGuide = (allLines: readonly ExtractedLine[], pageCount: number, fileName: string): StructureResult => {
  const lines = removeRunningHeaders(allLines, pageCount);
  const bodySize = median(lines.map((l) => l.fontSize));
  const firstPage = lines.filter((l) => l.page === 1);
  const titleLine = firstPage.reduce<ExtractedLine | null>(
    (best, line) => (line.text.length >= 3 && (!best || line.fontSize > best.fontSize) ? line : best),
    null,
  );
  const title =
    titleLine && titleLine.fontSize > bodySize * 1.2 ? shortenTitle(titleLine.text) : fileName.replace(/\.pdf$/i, '');

  let detection: ParsedGuide['detection'] = 'numbered-headings';
  let raw = splitByNumberedHeadings(lines);
  if (!raw) {
    detection = 'font-headings';
    raw = splitByFontHeadings(lines.filter((l) => l !== titleLine));
  }
  if (!raw) {
    detection = 'paragraphs';
    raw = splitByParagraphs(lines.filter((l) => l !== titleLine));
  }

  const steps = raw
    .filter((step) => step.title.length > 0 || step.lines.length > 0)
    .slice(0, 150)
    .map((step, index) => toGuideStep(step, index + 1));
  const tools = unique(steps.flatMap((s) => s.tools));
  return { steps, detection, tools, title };
};

// ---------------------------------------------------------------------------
// Guide generated from the user's own design
// ---------------------------------------------------------------------------

const HARDWARE_NAMES: Readonly<Record<HardwareKind, string>> = {
  'confirmat-screw': 'tornillos confirmat',
  'cam-lock': 'excéntricas',
  'cam-bolt': 'pernos',
  dowel: 'taquetes',
  'wood-glue': 'pegamento',
  'shelf-pin': 'soportes de entrepaño',
  hinge: 'bisagras',
  'drawer-slide': 'pares de correderas',
  handle: 'jaladeras',
  'back-nail': 'clavos',
  'wood-screw': 'pijas',
  leveler: 'niveladores',
  'wall-anchor': 'kits antivuelco',
};

const PROJECT_TOOLS = ['Taladro', 'Brocas', 'Desarmador de cruz', 'Escuadra', 'Flexómetro', 'Martillo', 'Nivel'];

export const guideFromProject = (model: FurnitureModel): ParsedGuide => {
  const codeOf = new Map(model.panels.map((p) => [p.id, p.code]));
  const steps: GuideStep[] = model.assemblySteps.map((step: AssemblyStep) => {
    const codes = step.panelIds.map((id) => codeOf.get(id)).filter((c): c is string => Boolean(c));
    const body = [step.description, codes.length > 0 && codes.length < model.panels.length ? `Piezas: ${codes.join(', ')}.` : '', step.tip ? `Consejo: ${step.tip}` : '']
      .filter(Boolean)
      .join(' ');
    return {
      id: createId('step'),
      order: step.order,
      title: step.title,
      body,
      page: 0,
      dimensions: [],
      tools: [],
      hardware: step.hardware.map((h) => `${h.quantity} × ${HARDWARE_NAMES[h.kind]}`),
      warnings: step.tip && /siempre|no lo omitas/i.test(step.tip) ? [step.tip] : [],
      completed: false,
      completedAt: null,
      elapsedMs: 0,
      note: '',
    };
  });
  return {
    id: createId('guide'),
    source: 'project',
    title: `Armado · ${model.config.name}`,
    fileName: '',
    pageCount: 0,
    parsedAt: Date.now(),
    detection: 'project',
    steps,
    activeStepId: steps[0]?.id ?? null,
    tools: PROJECT_TOOLS,
  };
};
