'use client';

import { Minus, Plus } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/cn';

export interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  onChange: (value: number) => void;
  className?: string;
}

/**
 * Numeric input with steppers. Typing is free-form; the value is clamped and
 * committed on blur / Enter so intermediate states ("1", "12") don't fight
 * the user while they type "1200".
 */
export function NumberField({ label, value, min, max, step = 1, unit, hint, onChange, className }: NumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string): void => {
    const parsed = Number(raw.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, Math.round(parsed / step) * step));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  const nudge = (direction: 1 | -1): void => commit(String(value + direction * step));

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-stone-700">
          {label}
        </label>
        <span className="text-[11px] text-stone-400">
          {min}–{max}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="flex h-10 items-stretch overflow-hidden rounded-lg bg-white ring-1 ring-stone-200 focus-within:ring-2 focus-within:ring-amber-400">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={value <= min}
          className="grid w-9 place-items-center text-stone-500 hover:bg-stone-50 disabled:opacity-30"
          aria-label={`Disminuir ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          id={id}
          inputMode="decimal"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit(event.currentTarget.value);
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              nudge(1);
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              nudge(-1);
            }
          }}
          className="w-full min-w-0 bg-transparent text-center font-mono text-sm font-semibold text-stone-900 outline-none"
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        {unit && <span className="grid place-items-center pr-1 text-xs text-stone-400">{unit}</span>}
        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={value >= max}
          className="grid w-9 place-items-center text-stone-500 hover:bg-stone-50 disabled:opacity-30"
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-[11px] text-stone-500">
          {hint}
        </p>
      )}
    </div>
  );
}
