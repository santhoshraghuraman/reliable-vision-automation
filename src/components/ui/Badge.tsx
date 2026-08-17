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
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border uppercase tracking-wider font-bold',
          getTemperatureBadgeClass(temperature),
          className
        )}
        {...props}
      >
        <span className="text-[10px]">{icon}</span>
        <span>{temperature}</span>
      </span>
    );
  }

  if (variant === 'status' && status) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border capitalize font-semibold tracking-wide',
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
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-zinc-300 border border-white/10',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
