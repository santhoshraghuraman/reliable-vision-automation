'use client'

import { Lead } from '@/lib/types'
import { StatusBadge } from '@/components/ui/Badge'
import { EmptyState, LoadingState, ErrorState } from '@/components/ui/Spinner'
import { Users, ChevronRight, Phone, Building2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

interface LeadTableProps {
  leads: Lead[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function LeadTable({ leads, loading, error, onRetry }: LeadTableProps) {
  const router = useRouter()

  if (loading) return <LoadingState message="Loading leads..." />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (leads.length === 0) {
    return (
      <EmptyState
        icon={<Users className="w-12 h-12" />}
        title="No leads found"
        description="Upload an Excel file to import leads, or adjust your search filters."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Business
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <span className="flex items-center gap-1 text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
                AI Score
              </span>
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Contacted
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {leads.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              onClick={() => router.push(`/leads/${lead.id}`)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LeadRow({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-800/40 transition-colors group cursor-pointer"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-indigo-400">
              {lead.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="font-medium text-gray-200 truncate max-w-[180px]" title={lead.name}>
            {lead.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Phone className="w-3 h-3 shrink-0" />
          <span className="font-mono text-xs">{lead.phone}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        {lead.business ? (
          <div className="flex items-center gap-1.5 text-gray-400">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[180px]" title={lead.business}>{lead.business}</span>
          </div>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {lead.category ? (
          <span className="inline-block px-2 py-0.5 bg-gray-700/60 text-gray-400 text-xs rounded truncate max-w-[140px]" title={lead.category}>
            {lead.category}
          </span>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={lead.status} />
      </td>
      <td className="px-4 py-3">
        {lead.ai_score ? (
          <AIScoreBadge score={lead.ai_score.score} classification={lead.ai_score.classification} />
        ) : (
          <span className="text-gray-600 font-mono text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">
        {lead.last_contacted_at
          ? formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })
          : <span className="text-gray-600">—</span>}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
      </td>
      <td className="px-4 py-3">
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
      </td>
    </tr>
  )
}

function AIScoreBadge({ score, classification }: { score: number; classification: 'HOT' | 'WARM' | 'COLD' }) {
  if (classification === 'HOT' || score >= 80) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
        <span>{score}</span>
        <span>🔥 HOT</span>
      </span>
    )
  }
  if (classification === 'WARM' || (score >= 50 && score < 80)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
        <span>{score}</span>
        <span>🟡 WARM</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
      <span>{score}</span>
      <span>🔵 COLD</span>
    </span>
  )
}
