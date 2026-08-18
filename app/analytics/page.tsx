'use client'

import { Header } from '@/components/layout/Header'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header title="Analytics" subtitle="Lead performance and conversion metrics" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto">
            <BarChart3 className="w-8 h-8 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-300">Analytics Coming Soon</h2>
            <p className="text-sm text-gray-600 mt-2">
              Analytics and reporting will be available when lead conversations are active.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
