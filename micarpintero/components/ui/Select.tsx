'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useId } from 'react';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (value: T) => void;
}

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  const id = useId();
  const current = options.find((o) => o.value === value);
  return (
    <div className="space-y-1">
      <label id={id} className="text-xs font-semibold text-stone-700">
        {label}
      </label>
      <RadixSelect.Root
        value={value}
        onValueChange={(next) => {
          const match = options.find((o) => o.value === next);
          if (match) onChange(match.value);
        }}
      >
        <RadixSelect.Trigger
          aria-labelledby={id}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-lg bg-white px-3 text-left text-sm text-stone-900 ring-1 ring-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <RadixSelect.Value>{current?.label}</RadixSelect.Value>
          <RadixSelect.Icon>
            <ChevronDown className="h-4 w-4 text-stone-400" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-stone-200"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex cursor-pointer select-none flex-col rounded-lg py-2 pl-8 pr-3 text-sm text-stone-800 outline-none data-[highlighted]:bg-amber-50"
                >
                  <RadixSelect.ItemIndicator className="absolute left-2 top-2.5">
                    <Check className="h-4 w-4 text-amber-600" />
                  </RadixSelect.ItemIndicator>
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  {option.description && <span className="text-[11px] text-stone-500">{option.description}</span>}
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
