import { LeadStatus } from '@/lib/types'
import {
  Flame,
  Thermometer,
  Snowflake,
  MessageSquare,
  Star,
  XCircle,
  CheckCircle,
} from 'lucide-react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gray'
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-800 text-gray-300 border-gray-700',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    gray: 'bg-gray-800/80 text-gray-400 border-gray-700/60',
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-0.5
        rounded-full text-xs font-medium border
        ${variants[variant]} ${className}
      `}
    >
      {children}
    </span>
  )
}

const statusConfig: Record<
  LeadStatus,
  { label: string; icon: React.ReactNode; variant: BadgeProps['variant'] }
> = {
  HOT: {
    label: 'HOT',
    icon: <Flame className="w-3 h-3 text-red-400" />,
    variant: 'danger',
  },
  WARM: {
    label: 'WARM',
    icon: <Thermometer className="w-3 h-3 text-orange-400" />,
    variant: 'warning',
  },
  COLD: {
    label: 'COLD',
    icon: <Snowflake className="w-3 h-3 text-blue-400" />,
    variant: 'info',
  },
  CONTACTED: {
    label: 'CONTACTED',
    icon: <MessageSquare className="w-3 h-3 text-indigo-400" />,
    variant: 'info',
  },
  INTERESTED: {
    label: 'INTERESTED',
    icon: <Star className="w-3 h-3 text-emerald-400" />,
    variant: 'success',
  },
  NOT_INTERESTED: {
    label: 'NOT INTERESTED',
    icon: <XCircle className="w-3 h-3 text-gray-400" />,
    variant: 'gray',
  },
  CONVERTED: {
    label: 'CONVERTED',
    icon: <CheckCircle className="w-3 h-3 text-purple-400" />,
    variant: 'purple',
  },
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status] ?? statusConfig.COLD

  return (
    <Badge variant={config.variant}>
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  )
}
