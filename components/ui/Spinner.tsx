import * as React from 'react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`${sizes[size]} border-2 border-gray-600 border-t-indigo-500 rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
      <Spinner size="lg" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-gray-600 mb-1">{icon}</div>}
      <h3 className="text-base font-medium text-gray-400">{title}</h3>
      {description && <p className="text-sm text-gray-600 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
        <span className="text-red-400 text-xl">!</span>
      </div>
      <p className="text-sm text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-indigo-400 hover:text-indigo-300 underline"
        >
          Try again
        </button>
      )}
    </div>
  )
}
