'use client'

import { RefreshCw } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title="Refresh data"
      className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
    </button>
  )
}
