'use client';

import React, { useEffect, useState } from 'react';
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
import { createClient } from '@/lib/supabase/client';

export interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<{
    leads: number;
    campaigns: number;
    conversations: number;
    followups: number;
  }>({
    leads: 0,
    campaigns: 0,
    conversations: 0,
    followups: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const supabase = createClient();

        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true });

        const { count: activeCampCount } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        const { count: convsCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true });

        const { count: followCount } = await supabase
          .from('followups')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'scheduled');

        setCounts({
          leads: leadsCount || 0,
          campaigns: activeCampCount || 0,
          conversations: convsCount || 0,
          followups: followCount || 0,
        });
      } catch (_) {}
    };
    fetchCounts();
  }, [pathname]);

  const NAVIGATION_ITEMS = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users, badge: counts.leads > 0 ? `${counts.leads}` : undefined },
    { name: 'Campaigns', href: '/campaigns', icon: Megaphone, badge: counts.campaigns > 0 ? `${counts.campaigns} Active` : undefined },
    { name: 'Conversations', href: '/conversations', icon: MessageSquare, badge: counts.conversations > 0 ? `${counts.conversations}` : undefined },
    { name: 'Follow-ups', href: '/follow-ups', icon: Clock, badge: counts.followups > 0 ? `${counts.followups} Pending` : undefined },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#101018]/85 backdrop-blur-xl border-r border-white/[0.08] text-zinc-300 w-64">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 p-5 border-b border-white/[0.08]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#833AB4] via-[#E1306C] to-[#F77737] text-white shadow-lg shadow-[#E1306C]/25 ring-1 ring-white/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-extrabold text-white tracking-tight truncate">
              Reliable Vision
            </span>
            <span className="text-[11px] font-semibold text-gradient-insta truncate">
              Web Studio AI CRM
            </span>
          </div>
        </div>

        {/* Workspace Quick Badge */}
        <div className="mx-4 my-4 p-2.5 rounded-xl bg-[#151520] border border-white/[0.08] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-semibold text-zinc-300 truncate">
              {BUSINESS_INFO.serviceArea}
            </span>
          </div>
          <a
            href={BUSINESS_INFO.website}
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 hover:text-white transition-colors p-1"
            title="View Live Portfolio Website"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1.5">
          <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Command Center
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
                  'relative group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-[#151520] text-white border border-white/10 shadow-lg shadow-purple-500/5 font-bold'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-[#833AB4] via-[#E1306C] to-[#F77737] rounded-r-full" />
                )}
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-colors',
                      isActive ? 'text-pink-400' : 'text-zinc-400 group-hover:text-zinc-200'
                    )}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide',
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-300 border border-pink-500/30'
                        : 'bg-white/5 text-zinc-400 group-hover:bg-white/10'
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
      <div className="p-4 border-t border-white/[0.08] bg-[#0B0B12]/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#833AB4] via-[#E1306C] to-[#F77737]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#101018] text-white font-extrabold text-xs">
                RV
              </div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-zinc-100 truncate">Santhosh R</span>
              <span className="text-[10px] text-zinc-400 truncate">Admin Studio</span>
            </div>
          </div>
          <Link
            href="/settings"
            className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
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
            className="fixed inset-0 bg-[#07070B]/85 backdrop-blur-md transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative z-10 flex h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
