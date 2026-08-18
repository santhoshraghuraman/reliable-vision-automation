import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color?: 'indigo' | 'red' | 'orange' | 'blue' | 'emerald' | 'purple' | 'gray' | 'teal'
  description?: string
  loading?: boolean
}

const colorStyles = {
  indigo: {
    icon: 'text-indigo-400 bg-indigo-500/10',
    value: 'text-indigo-300',
    glow: 'shadow-indigo-500/10',
  },
  red: {
    icon: 'text-red-400 bg-red-500/10',
    value: 'text-red-300',
    glow: 'shadow-red-500/10',
  },
  orange: {
    icon: 'text-orange-400 bg-orange-500/10',
    value: 'text-orange-300',
    glow: 'shadow-orange-500/10',
  },
  blue: {
    icon: 'text-blue-400 bg-blue-500/10',
    value: 'text-blue-300',
    glow: 'shadow-blue-500/10',
  },
  emerald: {
    icon: 'text-emerald-400 bg-emerald-500/10',
    value: 'text-emerald-300',
    glow: 'shadow-emerald-500/10',
  },
  purple: {
    icon: 'text-purple-400 bg-purple-500/10',
    value: 'text-purple-300',
    glow: 'shadow-purple-500/10',
  },
  gray: {
    icon: 'text-gray-400 bg-gray-500/10',
    value: 'text-gray-300',
    glow: 'shadow-gray-500/10',
  },
  teal: {
    icon: 'text-teal-400 bg-teal-500/10',
    value: 'text-teal-300',
    glow: 'shadow-teal-500/10',
  },
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'indigo',
  description,
  loading = false,
}: StatsCardProps) {
  const styles = colorStyles[color] ?? colorStyles.indigo

  return (
    <div
      className={`
        bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5
        hover:border-gray-600/50 transition-all duration-200 shadow-lg ${styles.glow}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <div className="mt-2">
            {loading ? (
              <div className="h-8 w-16 bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className={`text-3xl font-bold tabular-nums ${styles.value}`}>{value}</p>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs text-gray-600">{description}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${styles.icon} shrink-0 ml-3`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
