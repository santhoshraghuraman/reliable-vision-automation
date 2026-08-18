'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Lead } from '@/lib/types'
import { getLeadById } from '@/services/leads.service'
import { LeadDetail } from '@/components/leads/LeadDetail'
import { Header } from '@/components/layout/Header'
import { LoadingState, ErrorState } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    getLeadById(id).then(({ lead: data, error: err }) => {
      if (!active) return
      if (err) setError(err)
      else setLead(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [id])

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={loading ? 'Lead Profile' : (lead?.name ?? 'Lead Not Found')}
        subtitle={lead ? `Phone: ${lead.phone}` : undefined}
        actions={
          <div className="flex items-center gap-3">
            {lead && <StatusBadge status={lead.status} />}
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => router.push('/leads')}
            >
              Back to Leads
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {loading && <LoadingState message="Loading lead details..." />}
        {error && <ErrorState message={error} />}
        {!loading && !error && !lead && (
          <ErrorState message="Lead not found." />
        )}
        {lead && <LeadDetail initialLead={lead} />}
      </div>
    </div>
  )
}
