'use client'

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react'
import {
  Users,
  Flame,
  Thermometer,
  Snowflake,
  MessageSquare,
  RefreshCw,
  Star,
  XCircle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Award,
  Zap,
} from 'lucide-react'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Header } from '@/components/layout/Header'
import { getDashboardStats } from '@/services/leads.service'
import { DashboardStats } from '@/lib/types'
import { Button } from '@/components/ui/Button'

const emptySubscribe = () => () => {}

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const mounted = useIsMounted()

  useEffect(() => {
    let active = true
    getDashboardStats().then(({ stats: data, error: err }) => {
      if (!active) return
      if (err) {
        setError(err)
      } else {
        setStats(data)
        setLastRefreshed(new Date())
        setError(null)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    const { stats: data, error: err } = await getDashboardStats()
    if (err) {
      setError(err)
    } else {
      setStats(data)
      setLastRefreshed(new Date())
      setError(null)
    }
    setLoading(false)
  }, [])

  const subtitle = mounted && lastRefreshed
    ? `Last updated ${lastRefreshed.toLocaleTimeString()}`
    : undefined

  const totalLeads = stats?.totalLeads ?? 0
  const convertedLeads = stats?.convertedLeads ?? 0
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0'

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Dashboard"
        subtitle={subtitle}
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">
              Could not load dashboard data: {error}
            </p>
            <p className="text-xs text-red-500 mt-1">
              Check that your Supabase environment variables are configured correctly.
            </p>
          </div>
        )}

        {/* Top Summary Banner */}
        <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-gray-900/50 border border-indigo-500/20 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Lead Pipeline Overview
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Live status breakdown from Supabase database across all qualification stages.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-gray-900/80 px-4 py-2.5 rounded-xl border border-gray-800 shrink-0">
            <div>
              <p className="text-[11px] text-gray-500 uppercase font-semibold">Conversion Rate</p>
              <p className="text-lg font-bold text-purple-400">{conversionRate}%</p>
            </div>
          </div>
        </div>

        {/* Lead Qualification Funnel Metrics (4 cols on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Leads"
            value={stats?.totalLeads ?? 0}
            icon={Users}
            color="indigo"
            description="All leads in the CRM"
            loading={loading}
          />
          <StatsCard
            title="COLD Leads"
            value={stats?.coldLeads ?? 0}
            icon={Snowflake}
            color="blue"
            description="New / Imported leads"
            loading={loading}
          />
          <StatsCard
            title="WARM Leads"
            value={stats?.warmLeads ?? 0}
            icon={Thermometer}
            color="orange"
            description="Moderate buyer intent"
            loading={loading}
          />
          <StatsCard
            title="HOT Leads"
            value={stats?.hotLeads ?? 0}
            icon={Flame}
            color="red"
            description="High closing potential"
            loading={loading}
          />
        </div>

        {/* AI Lead Scoring Intelligence Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              AI Qualification Metrics (Gemini AI)
            </h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total AI Scored"
              value={stats?.totalScored ?? 0}
              icon={Zap}
              color="indigo"
              description="Leads qualified by AI"
              loading={loading}
            />
            <StatsCard
              title="Average AI Score"
              value={`${stats?.averageScore ?? 0}/100`}
              icon={Award}
              color="purple"
              description="Overall portfolio score"
              loading={loading}
            />
            <StatsCard
              title="AI HOT Leads"
              value={stats?.aiHotCount ?? 0}
              icon={Flame}
              color="red"
              description="Score 80–100"
              loading={loading}
            />
            <StatsCard
              title="AI WARM Leads"
              value={stats?.aiWarmCount ?? 0}
              icon={Thermometer}
              color="orange"
              description="Score 50–79"
              loading={loading}
            />
          </div>
        </div>

        {/* Outreach & Sales Outcome Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="CONTACTED"
            value={stats?.contactedLeads ?? 0}
            icon={MessageSquare}
            color="teal"
            description="Reached out via pitch"
            loading={loading}
          />
          <StatsCard
            title="INTERESTED"
            value={stats?.interestedLeads ?? 0}
            icon={Star}
            color="emerald"
            description="Expressed direct interest"
            loading={loading}
          />
          <StatsCard
            title="NOT INTERESTED"
            value={stats?.notInterestedLeads ?? 0}
            icon={XCircle}
            color="gray"
            description="Declined or not fit"
            loading={loading}
          />
          <StatsCard
            title="CONVERTED"
            value={stats?.convertedLeads ?? 0}
            icon={CheckCircle2}
            color="purple"
            description="Closed customers"
            loading={loading}
          />
        </div>

        {/* Automation & Integrations Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <IntegrationCard
            icon="🤖"
            title="n8n Automation"
            description="Workflow automation for lead processing"
            status="Milestone 4"
          />
          <IntegrationCard
            icon="✨"
            title="Gemini AI"
            description="AI-powered lead scoring and qualification"
            status="Active (Milestone 3)"
          />
          <IntegrationCard
            icon="💬"
            title="WhatsApp Cloud API"
            description="Two-way WhatsApp conversation management"
            status="Milestone 4"
          />
        </div>
      </div>
    </div>
  )
}

function IntegrationCard({
  icon,
  title,
  description,
  status,
}: {
  icon: string
  title: string
  description: string
  status: string
}) {
  return (
    <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-5 flex items-start gap-4">
      <div className="text-2xl">{icon}</div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium text-gray-300">{title}</h3>
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded-full">
            {status}
          </span>
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  )
}
