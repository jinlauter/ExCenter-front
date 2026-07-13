'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  onCheckedChange?: (checked: boolean) => void;
}

// Checkbox simples sem dependência de Radix — suficiente para o caso atual.
// Quando precisar de comportamento avançado (indeterminate, etc), trocar pela
// versão do @radix-ui/react-checkbox.
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onChange, onCheckedChange, ...props }, ref) => {
    return (
      <label className="inline-flex cursor-pointer items-center">
        <span className="relative inline-flex h-4 w-4 items-center justify-center">
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            onChange={(e) => {
              onChange?.(e);
              onCheckedChange?.(e.target.checked);
            }}
            className={cn(
              'peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-input bg-background ring-offset-background',
              'checked:border-primary checked:bg-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
          />
        </span>
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
