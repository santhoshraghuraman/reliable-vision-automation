import React from 'react';
import { cn, getTemperatureBadgeClass, getTemperatureIcon, getStatusBadgeClass } from '@/lib/utils';
import { LeadTemperature, LeadStatus } from '@/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'temperature' | 'status';
  temperature?: LeadTemperature;
  status?: LeadStatus;
}

export function Badge({
  className,
  variant = 'default',
  temperature,
  status,
  children,
  ...props
}: BadgeProps) {
  if (variant === 'temperature' && temperature) {
    const icon = getTemperatureIcon(temperature);
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border uppercase tracking-wider font-semibold',
          getTemperatureBadgeClass(temperature),
          className
        )}
        {...props}
      >
        <span>{icon}</span>
        <span>{temperature}</span>
      </span>
    );
  }

  if (variant === 'status' && status) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border capitalize font-medium',
          getStatusBadgeClass(status),
          className
        )}
        {...props}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
