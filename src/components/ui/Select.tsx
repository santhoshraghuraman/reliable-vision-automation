import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-zinc-300">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'block w-full rounded-xl border border-white/[0.08] bg-[#0B0B12] px-3.5 py-2.5 text-sm text-zinc-100 transition-all duration-200 focus:border-purple-500 focus:bg-[#101018] focus:outline-none focus:ring-2 focus:ring-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#101018] text-zinc-100">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-rose-400 mt-1 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
