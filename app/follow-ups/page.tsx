'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { FollowUp, FollowUpStatus } from '@/lib/types'
import {
  Clock,
  Send,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Users,
  Ban,
  ShieldCheck,
  Calendar,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [dueCount, setDueCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [dispatching, setDispatching] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const loadFollowUps = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/follow-ups?status=${statusFilter}`)
      const data = await res.json()
      if (data.followUps) {
        setFollowUps(data.followUps)
        setTotalCount(data.totalCount || 0)
        setDueCount(data.dueCount || 0)
      }
    } catch {
      toast.error('Failed to load follow-ups')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadFollowUps()
  }, [loadFollowUps])

  // Run due follow-ups dispatch
  const handleDispatchDue = async () => {
    setDispatching(true)
    try {
      const res = await fetch('/api/follow-ups/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxBatch: 3 }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch follow-ups')
      }

      toast.success(`Processed ${data.totalProcessed || 0} follow-ups (${data.sentCount || 0} sent, ${data.cancelledCount || 0} cancelled)`)
      loadFollowUps()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDispatching(false)
    }
  }

  // Cancel single follow-up
  const handleCancelFollowUp = async (id: string) => {
    setCancellingId(id)
    try {
      const res = await fetch(`/api/follow-ups/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'manual_admin_cancel' }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel follow-up')
      }

      toast.success('Follow-up cancelled')
      loadFollowUps()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setCancellingId(null)
    }
  }

  const formatScheduledTime = (scheduledAt: string) => {
    const date = new Date(scheduledAt)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))

    if (diffMs <= 0) {
      return {
        text: 'Due Right Now',
        isDue: true,
        formatted: date.toLocaleString(),
      }
    }

    return {
      text: `In ~${diffHours}h (${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      isDue: false,
      formatted: date.toLocaleString(),
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gray-950 text-gray-100">
      <Header
        title="Follow-ups"
        subtitle="Automated 24h & 48h WhatsApp outreach sequences with automatic reply cancellation"
        actions={
          <div className="flex items-center gap-3">
            <Link href="/automation">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <Lock className="w-3.5 h-3.5" />
                TEST MODE ACTIVE
              </span>
            </Link>

            <Button
              variant="primary"
              size="sm"
              onClick={handleDispatchDue}
              disabled={dispatching || dueCount === 0}
              icon={<Play className={`w-3.5 h-3.5 ${dispatching ? 'animate-spin' : ''}`} />}
            >
              {dispatching ? 'Dispatching...' : `Run Due Follow-ups (${dueCount})`}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadFollowUps}
              disabled={loading}
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Pending Follow-ups</p>
              <p className="text-2xl font-bold text-gray-100">
                {followUps.filter((f) => f.status === 'PENDING').length}
              </p>
            </div>
          </div>

          <div
            className={`border rounded-xl p-4 flex items-center gap-4 transition-colors ${
              dueCount > 0
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                : 'bg-gray-900 border-gray-800 text-gray-400'
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium">Due Right Now</p>
              <p className="text-2xl font-bold text-amber-200">{dueCount}</p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Sent Successfully</p>
              <p className="text-2xl font-bold text-emerald-400">
                {followUps.filter((f) => f.status === 'SENT').length}
              </p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Auto-Cancelled / Replied</p>
              <p className="text-2xl font-bold text-purple-300">
                {followUps.filter((f) => f.status === 'CANCELLED').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Navigation Bar */}
        <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 px-2 flex items-center gap-1 font-semibold">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {(['ALL', 'DUE', 'PENDING', 'SENT', 'CANCELLED', 'FAILED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-gray-950 text-gray-400 hover:text-gray-200 border border-gray-800'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'DUE' ? `Due (${dueCount})` : st}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500">{totalCount} total records</p>
        </div>

        {/* Follow-up Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-200">Scheduled Follow-up Sequence</h3>
              <p className="text-xs text-gray-500">
                Leads automatically exit the sequence if they reply, opt out, or convert
              </p>
            </div>
            {dueCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleDispatchDue}
                disabled={dispatching}
                icon={<Play className="w-3.5 h-3.5" />}
              >
                Dispatch {dueCount} Due Now
              </Button>
            )}
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
              Loading follow-ups...
            </div>
          ) : followUps.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-300">No follow-ups found</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Follow-ups are automatically scheduled (+24h) when you launch campaigns or send initial outreach messages.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-950/60 text-gray-400 border-b border-gray-800 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-6">Lead</th>
                    <th className="py-3.5 px-4">Sequence</th>
                    <th className="py-3.5 px-4">Scheduled For</th>
                    <th className="py-3.5 px-4">AI Message Preview</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-300">
                  {followUps.map((item) => {
                    const sched = formatScheduledTime(item.scheduled_at)
                    return (
                      <tr key={item.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="py-4 px-6 font-medium text-gray-100">
                          <p className="font-semibold text-gray-200">{item.lead?.name || 'Lead'}</p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {item.lead?.phone || ''} • {item.lead?.category || 'Business'}
                          </p>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
                              item.attempt_count === 1
                                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            Follow-up #{item.attempt_count} ({item.attempt_count === 1 ? '24h' : '48h Final'})
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              item.status === 'PENDING' && sched.isDue
                                ? 'text-amber-400 animate-pulse'
                                : 'text-gray-400'
                            }`}
                          >
                            {sched.text}
                          </span>
                        </td>

                        <td className="py-4 px-4 max-w-xs truncate text-gray-400">
                          <span title={item.message_text || ''}>
                            {item.message_text || 'AI message generated on dispatch'}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                              item.status === 'SENT'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : item.status === 'PENDING'
                                ? sched.isDue
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                  : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                : item.status === 'CANCELLED'
                                ? 'bg-gray-800 text-gray-400 border border-gray-700'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {item.status === 'PENDING' && sched.isDue ? 'DUE NOW' : item.status}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right">
                          {item.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20"
                              onClick={() => handleCancelFollowUp(item.id)}
                              disabled={cancellingId === item.id}
                            >
                              Cancel
                            </Button>
                          )}
                          {item.status === 'SENT' && (
                            <span className="text-[11px] text-gray-500">
                              {item.sent_at ? new Date(item.sent_at).toLocaleDateString() : 'Dispatched'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
