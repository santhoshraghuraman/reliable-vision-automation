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
      return 'bg-gradient-to-r from-rose-500/15 to-pink-500/15 text-rose-400 border-rose-500/30 font-semibold shadow-sm shadow-rose-500/10';
    case 'warm':
      return 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-400 border-amber-500/30 font-semibold shadow-sm shadow-amber-500/10';
    case 'cold':
      return 'bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-400 border-sky-500/30 font-medium shadow-sm shadow-sky-500/10';
    default:
      return 'bg-white/5 text-zinc-400 border-white/10';
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
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold shadow-sm shadow-emerald-500/10';
    case 'qualified':
      return 'bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-purple-300 border-purple-500/30 font-semibold shadow-sm shadow-purple-500/10';
    case 'replied':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30 font-medium';
    case 'contacted':
      return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-medium';
    case 'new':
      return 'bg-white/10 text-zinc-300 border-white/15';
    case 'lost':
      return 'bg-white/5 text-zinc-500 border-white/10';
    default:
      return 'bg-white/5 text-zinc-400 border-white/10';
  }
}
