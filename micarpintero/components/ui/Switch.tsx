'use client';

import * as RadixSwitch from '@radix-ui/react-switch';
import { useId } from 'react';

export interface SwitchFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SwitchField({ label, description, checked, onChange }: SwitchFieldProps) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-xs font-semibold text-stone-700">{label}</span>
        {description && <span className="block text-[11px] text-stone-500">{description}</span>}
      </label>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="relative h-6 w-11 shrink-0 rounded-full bg-stone-300 transition data-[state=checked]:bg-amber-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
      >
        <RadixSwitch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[22px]" />
      </RadixSwitch.Root>
    </div>
  );
}
