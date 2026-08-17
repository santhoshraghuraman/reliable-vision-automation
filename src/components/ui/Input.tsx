import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-zinc-300">
            {label}
          </label>
        )}
        <div className="relative rounded-xl">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'block w-full rounded-xl border border-white/[0.08] bg-[#0B0B12] py-2.5 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-200 focus:border-purple-500 focus:bg-[#101018] focus:outline-none focus:ring-2 focus:ring-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon ? 'pl-9' : 'pl-3',
              rightIcon ? 'pr-9' : 'pr-3',
              error && 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-400 mt-1 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-zinc-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
