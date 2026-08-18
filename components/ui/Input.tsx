import * as React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200
              placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
              transition-colors duration-150
              ${icon ? 'pl-9 pr-3 py-2' : 'px-3 py-2'}
              ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200
            px-3 py-2
            focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
            transition-colors duration-150 cursor-pointer
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-800">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    )
  }
)
Select.displayName = 'Select'
