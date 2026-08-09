'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Menu,
  Bell,
  Search,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  User,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

  const notifications = [
    {
      id: 1,
      title: '🔥 Hot Lead Alert!',
      desc: 'Arun Kumar (Arun Textiles, Coimbatore) requested a call today.',
      time: '15m ago',
      unread: true,
    },
    {
      id: 2,
      title: '🔥 Hot Lead Alert!',
      desc: 'Kovai Organic Foods requested website design pricing proposal.',
      time: '1h ago',
      unread: true,
    },
    {
      id: 3,
      title: '✅ Campaign Progress',
      desc: 'Tamil Nadu Business Outreach reached 400+ targeted businesses.',
      time: '3h ago',
      unread: false,
    },
  ];

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left side: Hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {title}
          </h1>
          <p className="hidden md:block text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      {/* Right side: Global Search + Notifications + Quick CTAs + Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Input Bar */}
        <div className="hidden sm:flex relative items-center w-48 md:w-64">
          <Search className="absolute left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads, phone, city..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Quick Excel Import CTA */}
        {onOpenImportExcel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImportExcel}
            leftIcon={<FileSpreadsheet className="h-4 w-4 text-emerald-400" />}
            className="hidden sm:inline-flex text-xs border-slate-700"
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
            leftIcon={<Plus className="h-4 w-4" />}
            className="text-xs"
          >
            + Add Lead
          </Button>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-900 animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-4 z-50 text-slate-200 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Notifications (2 Hot)
                </span>
                <span className="text-[10px] text-brand-400 hover:underline cursor-pointer">
                  Mark all read
                </span>
              </div>
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-rose-400">{n.title}</span>
                      <span className="text-[10px] text-slate-500">{n.time}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-800 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-xs shadow-md">
              RV
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-2 z-50 animate-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <p className="text-xs font-semibold text-white">Santhosh R</p>
                <p className="text-[10px] text-slate-400">santhosh.rv.work@gmail.com</p>
              </div>
              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                <User className="h-4 w-4" /> Account Settings
              </Link>
              <Link
                href="/login"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg mt-1"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
