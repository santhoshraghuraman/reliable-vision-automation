import React from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled = false }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-1">
      {(label || description) && (
        <div className="mr-4">
          {label && <span className="text-xs sm:text-sm font-semibold text-zinc-200 block">{label}</span>}
          {description && <span className="text-[11px] text-zinc-500 block">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner',
          checked ? 'bg-gradient-to-r from-purple-600 to-pink-500' : 'bg-white/10'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
