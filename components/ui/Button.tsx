import * as React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-500 shadow-sm',
      secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-100 focus:ring-gray-500',
      ghost: 'bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white focus:ring-gray-500',
      danger: 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500 shadow-sm',
      outline: 'border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white focus:ring-gray-500 bg-transparent',
    }

    const sizes = {
      sm: 'text-xs px-3 py-1.5',
      md: 'text-sm px-4 py-2',
      lg: 'text-base px-6 py-3',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
