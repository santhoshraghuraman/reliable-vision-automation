import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LeadTemperature, LeadStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export function getTemperatureBadgeClass(temp: LeadTemperature): string {
  switch (temp) {
    case 'hot':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-semibold';
    case 'warm':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-medium';
    case 'cold':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/30 font-normal';
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700';
  }
}

export function getTemperatureIcon(temp: LeadTemperature): string {
  switch (temp) {
    case 'hot':
      return '🔥';
    case 'warm':
      return '⚡';
    case 'cold':
      return '❄️';
  }
}

export function getStatusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case 'converted':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'qualified':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'replied':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'contacted':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'new':
      return 'bg-slate-700/50 text-slate-300 border-slate-600';
    case 'lost':
      return 'bg-slate-800 text-slate-500 border-slate-700';
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700';
  }
}
