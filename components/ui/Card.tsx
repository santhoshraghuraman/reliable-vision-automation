import * as React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl
        ${hoverable ? 'hover:border-gray-600 hover:bg-gray-800/80 transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`px-5 py-4 border-b border-gray-700/50 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h3 className={`text-sm font-semibold text-gray-200 ${className}`}>
      {children}
    </h3>
  )
}

export function CardContent({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>
}
