import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorAlertProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function ErrorAlert({
  title = 'An error occurred',
  message,
  onDismiss,
  onRetry,
  className,
}: ErrorAlertProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 backdrop-blur-md shadow-lg shadow-rose-500/5',
        className
      )}
    >
      <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-xs sm:text-sm">
        <h5 className="font-bold text-rose-200">{title}</h5>
        <p className="mt-0.5 text-rose-300/90 text-xs leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs font-semibold underline hover:text-rose-100 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="rounded-lg p-1 text-rose-400 hover:bg-rose-500/20 hover:text-rose-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
