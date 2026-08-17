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
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-white/10 bg-[#101018]/60 my-4 backdrop-blur-md">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-zinc-400 mb-4 border border-white/10 shadow-lg">
        {icon || <Inbox className="h-7 w-7 text-zinc-400" />}
      </div>
      <h4 className="text-base font-bold text-zinc-100 tracking-tight">{title}</h4>
      <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-5 font-normal leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
