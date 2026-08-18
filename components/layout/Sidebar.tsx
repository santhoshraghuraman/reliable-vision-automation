'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Megaphone,
  MessageSquare,
  Clock,
  BarChart3,
  Settings,
  Zap,
  Bot,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Automation', href: '/automation', icon: Bot },
  { name: 'Conversations', href: '/conversations', icon: MessageSquare },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Follow-ups', href: '/follow-ups', icon: Clock },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Reliable Vision</h1>
            <p className="text-[10px] text-indigo-400 font-medium">AI-Powered Lead Automation</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 group
                ${isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }
              `}
            >
              <item.icon
                className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`}
              />
              {item.name}
              {item.href === '/automation' && (
                <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                  TEST MODE
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-gray-800 space-y-1.5">
        <div className="flex items-center justify-center gap-3 text-[11px] text-gray-400">
          <Link href="/privacy-policy" className="hover:text-indigo-400 transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/data-deletion" className="hover:text-indigo-400 transition-colors">
            Data Deletion
          </Link>
        </div>
        <p className="text-[10px] text-gray-500 text-center">
          Reliable Vision CRM · Meta WhatsApp
        </p>
      </div>
    </aside>
  )
}
