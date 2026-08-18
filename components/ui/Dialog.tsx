'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  footer?: React.ReactNode
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-[min(1200px,calc(100vw-32px))]',
}

const emptySubscribe = () => () => {}

export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  size = 'md',
  className = '',
}: DialogProps) {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  // Close on Escape key
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open || !isMounted) return null

  const modalNode = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop covering entire viewport */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog panel strictly centered and viewport-constrained */}
      <div
        className={`
          relative w-full ${sizeClasses[size]}
          bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl
          max-h-[calc(100vh-32px)] flex flex-col min-h-0
          z-10
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
      >
        {/* Header - Fixed at top of modal */}
        {(title || description) && (
          <div className="px-6 py-4 border-b border-gray-800 shrink-0 bg-gray-900 rounded-t-2xl">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2 id="dialog-title" className="text-base font-semibold text-white truncate">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-0.5 text-xs text-gray-400 truncate">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors shrink-0"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content - Independently scrollable body */}
        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {children}
        </div>

        {/* Footer - Fixed at bottom of modal */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-gray-800 shrink-0 bg-gray-900 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalNode, document.body)
}
