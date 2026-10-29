import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Section({ title, icon, children, className, action }: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SegmentedControl<T extends string | number>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-semibold text-stone-700">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-stone-100 p-1">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 flex-1 rounded-md text-xs font-semibold transition',
              option.value === value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
