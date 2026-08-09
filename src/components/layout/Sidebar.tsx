'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  MessageSquare,
  Clock,
  BarChart3,
  Settings,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BUSINESS_INFO } from '@/lib/constants';

const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users, badge: '1.2k' },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone, badge: '2 Active' },
  { name: 'Conversations', href: '/conversations', icon: MessageSquare, badge: '3 New' },
  { name: 'Follow-ups', href: '/follow-ups', icon: Clock, badge: '5 Pending' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-slate-900 border-r border-slate-800 text-slate-300 w-64">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white shadow-lg shadow-brand-600/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-white tracking-tight truncate">
              Reliable Vision
            </span>
            <span className="text-[11px] font-medium text-brand-400 truncate">
              Web Studio AI CRM
            </span>
          </div>
        </div>

        {/* Workspace Quick Badge */}
        <div className="mx-4 my-4 p-2.5 rounded-lg bg-slate-850 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-medium text-slate-300 truncate">
              {BUSINESS_INFO.serviceArea}
            </span>
          </div>
          <a
            href={BUSINESS_INFO.website}
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
            title="View Live Portfolio Website"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Navigation
          </div>
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href === '/dashboard' && pathname === '/');

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  'group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-colors',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                      isActive
                        ? 'bg-brand-700 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-brand-400 font-bold text-xs border border-slate-700">
              RV
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-slate-200 truncate">Santhosh R</span>
              <span className="text-[10px] text-slate-400 truncate">Admin / Developer</span>
            </div>
          </div>
          <Link
            href="/settings"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="relative z-10 flex h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
