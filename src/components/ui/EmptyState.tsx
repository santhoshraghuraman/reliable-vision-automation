import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 my-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-4">
        {icon || <Inbox className="h-7 w-7 text-slate-400" />}
      </div>
      <h4 className="text-base font-semibold text-slate-200">{title}</h4>
      <p className="text-sm text-slate-400 max-w-sm mt-1 mb-5">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
