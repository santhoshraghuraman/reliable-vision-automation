import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-zinc-300">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'block w-full rounded-xl border border-white/[0.08] bg-[#0B0B12] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-200 focus:border-purple-500 focus:bg-[#101018] focus:outline-none focus:ring-2 focus:ring-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]',
            error && 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30',
            className
          )}
          {...props}
        />
        {helperText && !error && <p className="text-xs text-zinc-500 mt-1">{helperText}</p>}
        {error && <p className="text-xs text-rose-400 mt-1 font-medium">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
