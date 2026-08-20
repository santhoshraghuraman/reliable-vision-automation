'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Campaign, CampaignLeadPreview, LeadStatus, Lead } from '@/lib/types'
import {
  Megaphone,
  Sparkles,
  Send,
  RefreshCw,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Users,
  Clock,
  Edit3,
  ShieldCheck,
  Ban,
  Activity,
  Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [categories, setCategories] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'LIST' | 'WIZARD' | 'DETAILS'>('LIST')
  const [activeCampaignData, setActiveCampaignData] = useState<{ campaign: Campaign; queue: any[] } | null>(null)

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [campaignName, setCampaignName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | 'ALL'>('ALL')
  const [ratePerMinute, setRatePerMinute] = useState(3)
  const [batchSize, setBatchSize] = useState(3)
  const [targetCount, setTargetCount] = useState(0)
  const [calculatingCount, setCalculatingCount] = useState(false)

  // Manual selection state
  const [isManualSelection, setIsManualSelection] = useState(false)
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([])
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])

  // Preview state (Step 2)
  const [loadingPreviews, setLoadingPreviews] = useState(false)
  const [previews, setPreviews] = useState<CampaignLeadPreview[]>([])
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({})
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [approving, setApproving] = useState(false)

  // Launch / Results state (Step 3)
  const [launching, setLaunching] = useState(false)
  const [launchResult, setLaunchResult] = useState<{
    success: boolean
    campaignId: string
    queuedCount: number
    status: string
    error: string | null
  } | null>(null)

  // Load campaigns list & categories
  const loadInitialData = async () => {
    setLoadingCampaigns(true)
    try {
      const [campRes, catRes, leadsRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/leads/categories'),
        fetch('/api/leads?pageSize=50')
      ])
      const campJson = await campRes.json()
      const catJson = await catRes.json()
      const leadsJson = await leadsRes.json()

      if (campJson.campaigns) setCampaigns(campJson.campaigns)
      if (catJson.categories) setCategories(catJson.categories)
      if (leadsJson.leads) setAvailableLeads(leadsJson.leads)
    } catch {
      toast.error('Failed to load campaigns')
    } finally {
      setLoadingCampaigns(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Calculate matching leads whenever filters change in Step 1
  useEffect(() => {
    if (viewMode !== 'WIZARD' || step !== 1) return
    if (isManualSelection) {
      setTargetCount(selectedLeadIds.length)
      return
    }

    let active = true
    async function calculate() {
      setCalculatingCount(true)
      try {
        const params = new URLSearchParams()
        if (selectedCategory !== 'ALL') params.set('category', selectedCategory)
        if (selectedStatus !== 'ALL') params.set('status', selectedStatus)
        params.set('pageSize', '1')

        const res = await fetch(`/api/leads?${params.toString()}`)
        const data = await res.json()
        if (active && typeof data.count === 'number') {
          setTargetCount(data.count)
        }
      } catch {
        // ignore
      } finally {
        if (active) setCalculatingCount(false)
      }
    }
    calculate()
    return () => {
      active = false
    }
  }, [selectedCategory, selectedStatus, viewMode, step, isManualSelection, selectedLeadIds])

  // Step 1 -> Step 2: Create draft campaign & load previews
  const handleProceedToPreview = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name')
      return
    }

    setLoadingPreviews(true)
    try {
      // 1. Create draft campaign
      const createRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName.trim(),
          filterCategory: isManualSelection ? undefined : (selectedCategory !== 'ALL' ? selectedCategory : undefined),
          filterStatus: isManualSelection ? undefined : (selectedStatus !== 'ALL' ? selectedStatus : undefined),
          selectedLeadIds: isManualSelection ? selectedLeadIds : undefined,
          ratePerMinute,
          targetCount: isManualSelection ? selectedLeadIds.length : targetCount,
        }),
      })

      const createJson = await createRes.json()
      if (!createRes.ok || !createJson.campaign) {
        throw new Error(createJson.error || 'Failed to initialize campaign')
      }

      const campId = createJson.campaign.id
      setActiveCampaignId(campId)

      // 2. Fetch AI message previews
      const prevRes = await fetch(`/api/campaigns/${campId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: isManualSelection ? undefined : (selectedCategory !== 'ALL' ? selectedCategory : undefined),
          status: isManualSelection ? undefined : (selectedStatus !== 'ALL' ? selectedStatus : undefined),
          selectedLeadIds: isManualSelection ? selectedLeadIds : undefined,
          limit: isManualSelection ? selectedLeadIds.length : batchSize,
        }),
      })

      const prevJson = await prevRes.json()
      if (prevJson.previews) {
        setPreviews(prevJson.previews)
        const initialCustom: Record<string, string> = {}
        prevJson.previews.forEach((p: CampaignLeadPreview) => {
          initialCustom[p.lead.id] = p.generatedMessage
        })
        setCustomMessages(initialCustom)
      }

      setIsApproved(false)
      setStep(2)
      toast.success('Campaign draft created & AI pitches generated!')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoadingPreviews(false)
    }
  }

  const handleApproveCampaign = async () => {
    if (!activeCampaignId) return
    setApproving(true)
    try {
      const res = await fetch(`/api/campaigns/${activeCampaignId}/approve`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve campaign')
      }
      setIsApproved(true)
      toast.success('Campaign Approved! Ready to Queue.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setApproving(false)
    }
  }

  // Step 2 -> Step 3: Human Approval & Launch
  const handleLaunchCampaign = async () => {
    if (!activeCampaignId) return
    setLaunching(true)
    try {
      const res = await fetch(`/api/campaigns/${activeCampaignId}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customMessages,
          maxLeads: batchSize,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch campaign')
      }

      setLaunchResult(data)
      setStep(3)
      loadInitialData()
      toast.success(`Campaign queued successfully! ${data.queuedCount ?? 0} leads pending dispatch.`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLaunching(false)
    }
  }

  // Open existing draft campaign for preview & approval
  const handleOpenExistingCampaign = async (camp: Campaign) => {
    setLoadingPreviews(true)
    try {
      // 1. Fetch fresh campaign details
      const res = await fetch(`/api/campaigns/${camp.id}`)
      const data = await res.json()
      const currentCamp = data.campaign || camp

      setActiveCampaignId(currentCamp.id)
      setIsApproved(currentCamp.status === 'active' || currentCamp.status === 'running')
      setCampaignName(currentCamp.name)
      setSelectedCategory(currentCamp.filter_category || 'ALL')
      setSelectedStatus((currentCamp.filter_status as LeadStatus | 'ALL') || 'ALL')
      setRatePerMinute(currentCamp.rate_per_minute || 3)
      setTargetCount(currentCamp.target_count || 0)

      // 2. Fetch AI previews for this campaign
      const prevRes = await fetch(`/api/campaigns/${currentCamp.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: currentCamp.filter_category || undefined,
          status: currentCamp.filter_status || undefined,
          limit: batchSize,
        }),
      })

      const prevJson = await prevRes.json()
      if (prevJson.previews) {
        setPreviews(prevJson.previews)
        const initialCustom: Record<string, string> = {}
        prevJson.previews.forEach((p: CampaignLeadPreview) => {
          initialCustom[p.lead.id] = p.generatedMessage
        })
        setCustomMessages(initialCustom)
      }

      setViewMode('WIZARD')
      setStep(2)
      toast.success(`Loaded campaign "${currentCamp.name}"`)
    } catch (err) {
      toast.error((err as Error).message || 'Failed to open campaign')
    } finally {
      setLoadingPreviews(false)
    }
  }

  const handleViewDetails = async (camp: Campaign) => {
    setLoadingPreviews(true)
    try {
      const res = await fetch(`/api/campaigns/${camp.id}`)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch details')
      
      setActiveCampaignData(data)
      setViewMode('DETAILS')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoadingPreviews(false)
    }
  }

  const resetWizard = () => {
    setStep(1)
    setCampaignName('')
    setSelectedCategory('ALL')
    setSelectedStatus('ALL')
    setPreviews([])
    setCustomMessages({})
    setActiveCampaignId(null)
    setActiveCampaignData(null)
    setLaunchResult(null)
    setViewMode('LIST')
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gray-950 text-gray-100">
      <Header
        title="Bulk Campaigns"
        subtitle="AI-personalized WhatsApp outreach manager with strict opt-out and safety controls"
        actions={
          <div className="flex items-center gap-3">

            {viewMode === 'LIST' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setViewMode('WIZARD')
                  setStep(1)
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                New Campaign
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={resetWizard}>
                View All Campaigns
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={loadInitialData}
              disabled={loadingCampaigns}
              icon={<RefreshCw className={`w-4 h-4 ${loadingCampaigns ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {viewMode === 'LIST' ? (
          /* =========================================================================
             CAMPAIGNS LIST VIEW
             ========================================================================= */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Total Campaigns</p>
                  <p className="text-2xl font-bold text-gray-100">{campaigns.length}</p>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Total Dispatched</p>
                  <p className="text-2xl font-bold text-gray-100">
                    {campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0)}
                  </p>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Opt-Out Protection</p>
                  <p className="text-2xl font-bold text-cyan-300">Active</p>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">AI Personalization</p>
                  <p className="text-2xl font-bold text-purple-300">Gemini 1.5</p>
                </div>
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-200">Campaign History</h3>
                  <p className="text-xs text-gray-500">Track outreach batches, target segments, and delivery counts</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setViewMode('WIZARD')
                    setStep(1)
                  }}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Create Campaign
                </Button>
              </div>

              {loadingCampaigns ? (
                <div className="py-16 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading campaigns...
                </div>
              ) : campaigns.length === 0 ? (
                <div className="py-16 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                    <Megaphone className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-300">No campaigns launched yet</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      Create your first AI-personalized WhatsApp outreach campaign to engage targeted lead categories.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setViewMode('WIZARD')
                      setStep(1)
                    }}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Start First Campaign
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-950/60 text-gray-400 border-b border-gray-800 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3.5 px-6">Campaign</th>
                        <th className="py-3.5 px-4">Segment / Target</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-center">Sent</th>
                        <th className="py-3.5 px-4 text-center">Failed</th>
                        <th className="py-3.5 px-4">Created</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {campaigns.map((camp) => (
                        <tr key={camp.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="py-4 px-6 font-medium text-gray-100">
                            <div className="flex items-center gap-2">
                              <Megaphone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                              <span>{camp.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-400">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-[11px]">
                              {camp.filter_category || 'All Categories'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                                camp.status === 'COMPLETED'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : camp.status === 'RUNNING'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                                  : 'bg-gray-800 text-gray-400 border border-gray-700'
                              }`}
                            >
                              {camp.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center font-semibold text-emerald-400">
                            {camp.sent_count || 0}
                          </td>
                          <td className="py-4 px-4 text-center font-semibold text-rose-400">
                            {camp.failed_count || 0}
                          </td>
                          <td className="py-4 px-4 text-gray-500">
                            {new Date(camp.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {camp.status === 'DRAFT' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                                onClick={() => handleOpenExistingCampaign(camp)}
                                disabled={loadingPreviews}
                                icon={<ArrowRight className="w-3.5 h-3.5" />}
                              >
                                Continue / Preview →
                              </Button>
                            ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-gray-400 hover:text-gray-200"
                                  onClick={() => handleViewDetails(camp)}
                                  disabled={loadingPreviews}
                                >
                                  View Details
                                </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'WIZARD' ? (
          /* =========================================================================
             3-STEP WIZARD VIEW
             ========================================================================= */
          <div className="space-y-6">
            {/* Step Progress Bar */}
            <div className="grid grid-cols-3 gap-4">
              <div
                className={`p-4 rounded-xl border transition-all ${
                  step === 1
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                    : step > 1
                    ? 'bg-gray-900 border-gray-800 text-emerald-400'
                    : 'bg-gray-900/50 border-gray-800 text-gray-500'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>1. Configure Segment</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Select category, status & dispatch rate</p>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all ${
                  step === 2
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                    : step > 2
                    ? 'bg-gray-900 border-gray-800 text-emerald-400'
                    : 'bg-gray-900/50 border-gray-800 text-gray-500'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>2. Preview & Approve</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Review AI pitches before dispatch</p>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all ${
                  step === 3
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                    : 'bg-gray-900/50 border-gray-800 text-gray-500'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>3. Execution & Audit</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Live dispatch summary & WAMID log</p>
              </div>
            </div>

            {/* STEP 1: CONFIGURE SEGMENT */}
            {step === 1 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
                <div className="border-b border-gray-800 pb-4">
                  <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    Configure Campaign Parameters
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Define target audience filters and outreach rate limits
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Campaign Name */}
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-300">Campaign Name *</label>
                    <Input
                      placeholder="e.g. Interior Designers Website Outreach Q3"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>

                  {/* Manual Lead Selection Toggle */}
                  <div className="col-span-1 md:col-span-2 flex items-center justify-between border-t border-gray-800 pt-6 pb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-200">Manual Lead Selection</h4>
                      <p className="text-xs text-gray-500">Pick exact leads instead of filtering by category/status</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isManualSelection}
                        onChange={(e) => {
                          setIsManualSelection(e.target.checked)
                          if (!e.target.checked) setSelectedLeadIds([])
                        }}
                      />
                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {isManualSelection ? (
                    <div className="col-span-1 md:col-span-2 space-y-4">
                      {selectedLeadIds.length > 10 && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-xs font-semibold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          {selectedLeadIds.length} leads selected. Test Mode allows a maximum of 10 recipients per batch. Please reduce your selection to 10 or fewer.
                        </div>
                      )}
                      <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950/50">
                        {availableLeads.map(lead => (
                          <label key={lead.id} className="flex items-center gap-3 p-3 hover:bg-gray-900 border-b border-gray-800 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedLeadIds(prev => [...prev, lead.id])
                                else setSelectedLeadIds(prev => prev.filter(id => id !== lead.id))
                              }}
                              className="w-4 h-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-600 bg-gray-900"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-200 truncate">{lead.name}</p>
                              <p className="text-xs text-gray-500 truncate">{lead.business || 'No Business'} • {lead.category || 'No Category'}</p>
                            </div>
                            <div className="text-xs text-gray-400">{lead.phone}</div>
                          </label>
                        ))}
                        {availableLeads.length === 0 && (
                          <div className="p-4 text-center text-xs text-gray-500">No recent leads found.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Category Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300">Lead Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">All Categories ({categories.length} available)</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300">Lead Pipeline Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as LeadStatus | 'ALL')}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="COLD">COLD (Uncontacted)</option>
                      <option value="HOT">HOT (High Intent)</option>
                      <option value="WARM">WARM</option>
                    </select>
                  </div>
                  </>
                  )}

                  {/* Dispatch Rate */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300">Dispatch Rate Limit</label>
                    <select
                      value={ratePerMinute}
                      onChange={(e) => setRatePerMinute(Number(e.target.value))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={1}>1 message / minute (Safest)</option>
                      <option value={3}>3 messages / minute (Recommended)</option>
                      <option value={5}>5 messages / minute</option>
                    </select>
                  </div>

                  {/* Test Batch Size */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                      <span>Test Batch Size</span>
                      <span className="text-[10px] text-amber-400 font-mono">1 to 10 in Test Mode</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={batchSize}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (isNaN(val)) setBatchSize(1)
                        else setBatchSize(Math.min(Math.max(1, val), 10))
                      }}
                    />
                  </div>
                </div>

                {/* Segment Summary Box */}
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-200">
                        {calculatingCount ? 'Calculating matching leads...' : (isManualSelection ? `${selectedLeadIds.length} Selected Leads` : `${targetCount} Eligible Leads Found`)}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Opted-out leads and ineligible records are automatically excluded.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={resetWizard}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleProceedToPreview}
                      disabled={loadingPreviews || calculatingCount || targetCount === 0 || !campaignName.trim() || (isManualSelection && selectedLeadIds.length > 10)}
                      icon={<ArrowRight className="w-4 h-4" />}
                    >
                      {loadingPreviews ? 'Generating AI Previews...' : 'Generate Previews →'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PREVIEW & EDIT MESSAGES */}
            {step === 2 && (
              <div className="space-y-6">


                {/* Previews List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      AI Message Previews ({previews.length} sample leads)
                    </h3>
                    <p className="text-xs text-gray-500">You can edit the message text directly for any lead</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {previews.map((item) => {
                      const isOptedOut = item.lead.opted_out || item.lead.status === 'NOT_INTERESTED'
                      return (
                        <div
                          key={item.lead.id}
                          className={`bg-gray-900 border rounded-xl p-4 space-y-3 transition-colors ${
                            isOptedOut
                              ? 'border-rose-500/30 bg-rose-950/10'
                              : 'border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-bold text-gray-200">{item.lead.name}</p>
                              <p className="text-[11px] text-gray-400 font-mono">
                                {item.lead.phone} • {item.lead.category || 'Business'}
                              </p>
                            </div>

                            {isOptedOut ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                <Ban className="w-3 h-3" />
                                Blocked (Opted Out)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <ShieldCheck className="w-3 h-3" />
                                Ready
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-semibold text-gray-400 flex items-center gap-1">
                              <Edit3 className="w-3 h-3 text-indigo-400" />
                              Customized Message
                            </label>
                            <textarea
                              disabled={isOptedOut}
                              value={customMessages[item.lead.id] || ''}
                              onChange={(e) =>
                                setCustomMessages({
                                  ...customMessages,
                                  [item.lead.id]: e.target.value,
                                })
                              }
                              rows={4}
                              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 font-sans focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(1)}
                    icon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Back to Configuration
                  </Button>

                  <div className="flex items-center gap-3">
                    {!isApproved ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleApproveCampaign}
                        disabled={approving}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        {approving ? 'Approving...' : 'Approve Campaign'}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleLaunchCampaign}
                        disabled={launching}
                        icon={<Send className="w-4 h-4" />}
                      >
                        {launching ? 'Queuing Dispatch...' : 'Queue / Launch Campaign →'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: QUEUE DISPATCH RESULTS */}
            {step === 3 && launchResult && (
              <div className="space-y-6">
                <div className="bg-gray-900 border border-emerald-500/20 rounded-xl p-8 bg-emerald-950/10 text-center">
                  <h3 className="text-xl font-bold text-emerald-400 mb-2">Campaign Queued Successfully</h3>
                  <p className="text-gray-300">
                    Successfully queued <span className="font-bold text-white">{launchResult.queuedCount ?? 0}</span> leads for dispatch.
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    The background worker is now processing the queue. You can monitor the live delivery metrics from the Campaigns list.
                  </p>
                  
                  <div className="mt-8">
                    <Button onClick={resetWizard}>
                      Back to Campaigns
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : viewMode === 'DETAILS' && activeCampaignData ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={resetWizard} icon={<ArrowLeft className="w-4 h-4" />}>
                Back to Campaigns
              </Button>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-2">{activeCampaignData.campaign.name}</h2>
              <div className="flex gap-6 text-sm text-gray-400">
                <div>Status: <span className="text-white capitalize">{activeCampaignData.campaign.status}</span></div>
                <div>Target: <span className="text-white">{activeCampaignData.campaign.target_count}</span></div>
                <div>Sent: <span className="text-emerald-400">{activeCampaignData.campaign.sent_count}</span></div>
                <div>Failed: <span className="text-red-400">{activeCampaignData.campaign.failed_count}</span></div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-base font-semibold text-gray-200">Queue & Delivery Status</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900/50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-800">
                      <th className="px-6 py-3">Lead</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Attempts</th>
                      <th className="px-6 py-3">Message ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {activeCampaignData.queue.map((q, i) => (
                      <tr key={i} className="hover:bg-gray-800/20 transition-colors">
                        <td className="px-6 py-3">
                          <div className="text-sm text-gray-200 font-medium">{q.lead?.name}</div>
                          <div className="text-xs text-gray-500">{q.lead?.phone}</div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            q.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            q.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-400">
                          {q.attempts} / {q.max_attempts}
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-500 font-mono">
                          {q.meta_message_id || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
