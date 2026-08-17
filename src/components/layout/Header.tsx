'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  Bell,
  Search,
  Plus,
  FileSpreadsheet,
  User,
  LogOut,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export interface HeaderProps {
  onMenuClick: () => void;
  onOpenAddLead?: () => void;
  onOpenImportExcel?: () => void;
  title?: string;
  subtitle?: string;
}

export function Header({
  onMenuClick,
  onOpenAddLead,
  onOpenImportExcel,
  title = 'Dashboard',
  subtitle = 'Reliable Vision AI Lead Automation & Web Studio Overview',
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('Admin');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUserEmail(data.user.email || '');
          const name =
            data.user.user_metadata?.full_name ||
            data.user.email?.split('@')[0] ||
            'Admin';
          setUserName(name);
        }
      } catch (_) {}
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowUserMenu(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (_) {}
    document.cookie = 'sb-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.replace('/login');
  };

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const supabase = createClient();
        const { data: hotLeads } = await supabase
          .from('leads')
          .select('id, name, business, city, created_at')
          .eq('status', 'hot')
          .order('created_at', { ascending: false })
          .limit(5);

        if (hotLeads && hotLeads.length > 0) {
          const mapped = hotLeads.map((l: any) => ({
            id: l.id,
            title: '🔥 Hot Lead Alert!',
            desc: `${l.name} (${l.business}${l.city ? `, ${l.city}` : ''}) requested contact.`,
            time: 'Recent',
            unread: true,
          }));
          setNotifications(mapped);
        } else {
          setNotifications([]);
        }
      } catch (_) {
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#0B0B12]/85 px-4 sm:px-6 backdrop-blur-md">
      {/* Left side: Mobile Menu Toggle + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
            {title}
          </h1>
          <p className="hidden md:block text-xs text-zinc-400 font-medium">{subtitle}</p>
        </div>
      </div>

      {/* Right side: Rounded-full Search + Actions + Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Input Bar */}
        <div className="hidden sm:flex relative items-center w-48 md:w-60">
          <Search className="absolute left-3.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leads, phone, city..."
            className="w-full rounded-full border border-white/[0.08] bg-[#101018] py-1.5 pl-9 pr-3.5 text-xs text-zinc-200 placeholder-zinc-500 transition-all focus:border-purple-500/60 focus:bg-[#151520] focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>

        {/* Quick Excel Import CTA */}
        {onOpenImportExcel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImportExcel}
            leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />}
            className="hidden sm:inline-flex text-xs border-white/10"
          >
            Import Excel
          </Button>
        )}

        {/* Quick Add Lead CTA */}
        {onOpenAddLead && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAddLead}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            className="text-xs shadow-md shadow-pink-500/20"
          >
            + Add Lead
          </Button>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-pink-500 ring-2 ring-[#0B0B12] animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/[0.1] bg-[#101018] shadow-2xl p-4 z-50 text-zinc-200 animate-in zoom-in-95 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Notifications ({notifications.length})
                </span>
                {notifications.length > 0 && (
                  <span
                    onClick={() => setNotifications([])}
                    className="text-[10px] text-pink-400 hover:underline cursor-pointer font-semibold"
                  >
                    Clear all
                  </span>
                )}
              </div>
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl bg-[#151520] border border-white/[0.06] hover:border-white/15 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-400">{n.title}</span>
                        <span className="text-[10px] text-zinc-500 font-medium">{n.time}</span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1 leading-snug font-medium">{n.desc}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 text-center py-4">No active hot lead notifications.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown with Gradient Ring Avatar */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-full p-0.5 hover:opacity-90 transition-opacity"
            aria-label="User menu"
          >
            <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#833AB4] via-[#E1306C] to-[#F77737] shadow-md shadow-pink-500/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#101018] text-white font-extrabold text-xs">
                {userName.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/[0.1] bg-[#101018] shadow-2xl p-2 z-50 animate-in zoom-in-95 backdrop-blur-xl">
              <div className="px-3.5 py-3 border-b border-white/[0.08] mb-1">
                <p className="text-xs font-bold text-white capitalize">{userName}</p>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">{userEmail || 'admin@reliablevision.in'}</p>
                <span className="mt-1.5 inline-block text-[9px] font-bold uppercase tracking-wider text-pink-400 bg-pink-500/15 border border-pink-500/25 px-2 py-0.5 rounded-full">
                  Admin
                </span>
              </div>
              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 rounded-xl transition-colors"
              >
                <User className="h-4 w-4 text-purple-400" /> Account Settings
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl mt-1 text-left disabled:opacity-60 transition-colors"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                ) : (
                  <LogOut className="h-4 w-4 text-rose-400" />
                )}
                {isLoggingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
