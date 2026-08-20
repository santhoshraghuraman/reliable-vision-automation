'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Lead, AutomationStatus } from '@/lib/types'
import { getLeads } from '@/services/leads.service'
import {
  ShieldAlert,
  Sparkles,
  Send,
  RefreshCw,
  MessageSquare,
  Cpu,
  CheckCircle2,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Copy,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AutomationPage() {
  const [status, setStatus] = useState<AutomationStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<string>('')
  const [generatedPitch, setGeneratedPitch] = useState<string>('')
  const [generatingPitch, setGeneratingPitch] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [lastSendResult, setLastSendResult] = useState<Record<string, unknown> | null>(null)

  // Inbound simulation state
  const [simPhone, setSimPhone] = useState('')
  const [simText, setSimText] = useState('Hi! We received your message and are interested in learning more about your website development services.')
  const [simulating, setSimulating] = useState(false)
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null)

  const reloadData = async () => {
    setLoadingStatus(true)
    try {
      const [statusRes, leadsRes] = await Promise.all([
        fetch('/api/automation/status'),
        getLeads({ pageSize: 20 }),
      ])
      const statusJson = await statusRes.json()
      if (statusJson.status) setStatus(statusJson.status)
      setLeads(leadsRes.leads || [])
      if (leadsRes.leads?.length && !selectedLeadId) {
        setSelectedLeadId(leadsRes.leads[0].id)
      }
    } catch {
      // Fallback
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitial() {
      try {
        const [statusRes, leadsRes] = await Promise.all([
          fetch('/api/automation/status'),
          getLeads({ pageSize: 20 }),
        ])
        const statusJson = await statusRes.json()
        if (!active) return
        if (statusJson.status) setStatus(statusJson.status)
        setLeads(leadsRes.leads || [])
        if (leadsRes.leads?.length && !selectedLeadId) {
          setSelectedLeadId(leadsRes.leads[0].id)
        }
      } catch {
        // Fallback
      } finally {
        if (active) setLoadingStatus(false)
      }
    }
    loadInitial()
    return () => {
      active = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedLeadId) return
    let active = true
    async function loadPitch() {
      try {
        const res = await fetch('/api/automation/test-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: selectedLeadId }),
        })
        const data = await res.json()
        if (active && data.messageText) {
          setGeneratedPitch(data.messageText)
        }
      } catch {
        // Fallback
      }
    }
    loadPitch()
    return () => {
      active = false
    }
  }, [selectedLeadId])

  const selectedLead = leads.find((l) => l.id === selectedLeadId)

  const handleRegeneratePitch = async () => {
    if (!selectedLeadId) return
    setGeneratingPitch(true)
    try {
      const res = await fetch('/api/automation/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLeadId }),
      })
      const data = await res.json()
      if (data.messageText) {
        setGeneratedPitch(data.messageText)
        toast.success('Regenerated AI pitch!')
      }
    } finally {
      setGeneratingPitch(false)
    }
  }

  const handleSendTestMessage = async () => {
    if (!selectedLead) return
    setSendingTest(true)
    setLastSendResult(null)

    const targetPhone = status?.testPhoneNumber || '+919597482995'

    try {
      const res = await fetch('/api/automation/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          destinationPhone: targetPhone,
          messageText: generatedPitch,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setLastSendResult(data.result)
        toast.success(`Test message dispatched safely to ${targetPhone}!`)
        reloadData()
      } else {
        setLastSendResult({ error: data.error || 'Failed to dispatch test message' })
        toast.error(data.error || 'Failed to dispatch test message')
      }
    } catch (err) {
      setLastSendResult({ error: (err as Error).message })
      toast.error((err as Error).message)
    } finally {
      setSendingTest(false)
    }
  }

  const handleSimulateInbound = async () => {
    const sender = simPhone || selectedLead?.phone || '+919597482995'
    setSimulating(true)
    setSimResult(null)

    try {
      const res = await fetch('/api/automation/simulate-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderPhone: sender,
          messageText: simText,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSimResult(data)
        toast.success(`Simulated inbound reply recorded! Matched lead: ${data.lead?.name || 'Inbound Lead'}`)
        reloadData()
      } else {
        toast.error(data.error || 'Inbound simulation failed')
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSimulating(false)
    }
  }

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`Copied ${label} to clipboard!`)
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Automation Architecture"
        subtitle="n8n + WhatsApp Cloud API Integration (TEST MODE ONLY)"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={reloadData}
            disabled={loadingStatus}
            icon={<RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />}
          >
            Refresh Status
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">


        {/* Integration Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatusCard
            title="WhatsApp Cloud API"
            subtitle="Meta Graph API v20.0"
            status={status?.whatsappConfigured ? 'Ready (Live API)' : 'Ready (Mock Sandbox)'}
            icon={MessageSquare}
            color="emerald"
            badge="Sandbox"
          />
          <StatusCard
            title="n8n Automation"
            subtitle="Workflow Webhooks"
            status={status?.n8nConfigured ? 'Connected' : 'Ready to Import'}
            icon={Cpu}
            color="indigo"
            badge="v1.0"
          />
          <StatusCard
            title="Gemini AI Pitch Engine"
            subtitle="Structured Sales Generator"
            status={status?.geminiConfigured ? 'Active (Gemini 1.5)' : 'Active (Heuristics)'}
            icon={Sparkles}
            color="purple"
            badge="Active"
          />
          <StatusCard
            title="Active Conversations"
            subtitle="Two-Way Chat Threads"
            status={`${status?.activeConversationsCount ?? 0} Active Threads`}
            icon={Bot}
            color="blue"
            badge="Supabase"
          />
        </div>

        {/* Main Two-Column Testing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Outbound Test Message Console */}
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Outbound Test Message Dispatcher
                  </h3>
                  <p className="text-xs text-gray-400">
                    Preview AI pitch and dispatch safely to test phone
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                POST /api/automation/send
              </span>
            </div>

            {/* Lead Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Select Lead Context for Pitch Generation
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} ({lead.business || 'Business'}) • {lead.category || 'Category'} • {lead.status}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Lead Metadata */}
            {selectedLead && (
              <div className="p-3 bg-gray-800/50 border border-gray-700/60 rounded-xl text-xs space-y-1 text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{selectedLead.name}</span>
                  <span className="text-[11px] px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                    {selectedLead.category || 'General'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 line-clamp-2">
                  {selectedLead.requirement || 'No custom requirement notes.'}
                </p>
              </div>
            )}

            {/* Target Destination (Locked) */}
            <div className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-gray-400">Target Phone (Test Locked):</span>
                <span className="font-mono text-white font-semibold">
                  {status?.testPhoneNumber || '+919597482995'}
                </span>
              </div>
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Safe Destination
              </span>
            </div>

            {/* Message Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Generated WhatsApp Pitch
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegeneratePitch}
                    disabled={generatingPitch}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${generatingPitch ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                  <button
                    onClick={() => copyText(generatedPitch, 'Pitch')}
                    className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 relative">
                <div className="bg-emerald-900/30 text-emerald-100 p-3.5 rounded-xl text-xs leading-relaxed font-sans whitespace-pre-wrap">
                  {generatingPitch ? (
                    <span className="text-gray-400 italic">Synthesizing personalized sales pitch with AI...</span>
                  ) : (
                    generatedPitch
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-500/10 text-[10px] text-emerald-400/80">
                  <span>WhatsApp Message Preview</span>
                  <span>{generatedPitch.length} characters</span>
                </div>
              </div>
            </div>

            {/* Dispatch Button */}
            <Button
              variant="primary"
              size="md"
              onClick={handleSendTestMessage}
              loading={sendingTest}
              disabled={generatingPitch || !generatedPitch}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none shadow-lg shadow-emerald-600/20"
            >
              <Send className="w-4 h-4 mr-2" />
              <span>{sendingTest ? 'Dispatching Test Message...' : 'Send Test WhatsApp Message'}</span>
            </Button>

            {/* Execution Result Log */}
            {lastSendResult && (
              <div className="p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-xs space-y-1 font-mono">
                <div className="flex items-center justify-between text-emerald-400 font-sans font-semibold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Dispatch Result
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Logged to audit_logs</span>
                </div>
                <pre className="text-[11px] text-gray-300 overflow-x-auto p-2 bg-gray-900 rounded">
                  {JSON.stringify(lastSendResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Column 2: Inbound Webhook Reply Simulator */}
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Inbound Reply Webhook Simulator
                  </h3>
                  <p className="text-xs text-gray-400">
                    Test customer replies and automatic CRM lead matching
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                POST /api/whatsapp/webhook
              </span>
            </div>

            {/* Sender Phone Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Simulated Sender Phone Number
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={simPhone || selectedLead?.phone || '+919597482995'}
                  onChange={(e) => setSimPhone(e.target.value)}
                  placeholder="+919597482995"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedLead) setSimPhone(selectedLead.phone)
                  }}
                  className="text-xs shrink-0"
                >
                  Use Lead Phone
                </Button>
              </div>
              <p className="text-[11px] text-gray-500">
                The webhook will query <code className="text-gray-400">public.leads</code> by phone number to match the contact.
              </p>
            </div>

            {/* Inbound Reply Text */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Simulated Customer Reply Message
              </label>
              <textarea
                rows={3}
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Preset Reply Buttons */}
            <div className="space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Quick Presets:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSimText('Yes, we want to build a website. What is the pricing and timeline?')}
                  className="text-[11px] px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700"
                >
                  💬 Interested in pricing
                </button>
                <button
                  onClick={() => setSimText('Please send me your agency portfolio on this number.')}
                  className="text-[11px] px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700"
                >
                  📂 Request portfolio
                </button>
                <button
                  onClick={() => setSimText('Not interested right now, thank you.')}
                  className="text-[11px] px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700"
                >
                  ❌ Not interested
                </button>
              </div>
            </div>

            {/* Simulate Button */}
            <Button
              variant="primary"
              size="md"
              onClick={handleSimulateInbound}
              loading={simulating}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-none shadow-lg shadow-purple-600/20"
            >
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              <span>{simulating ? 'Processing Webhook Event...' : 'Simulate Inbound WhatsApp Reply'}</span>
            </Button>

            {/* Inbound Simulation Result */}
            {simResult && (
              <div className="p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between text-purple-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Webhook Processed
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Matched to Lead</span>
                </div>
                <div className="bg-gray-900 p-2.5 rounded-lg space-y-1 text-gray-300">
                  <p>
                    <span className="text-gray-500 font-semibold">Matched Lead:</span>{' '}
                    <span className="text-white font-bold">{(simResult.lead as { name?: string })?.name}</span> (
                    {(simResult.lead as { business?: string })?.business})
                  </p>
                  <p>
                    <span className="text-gray-500 font-semibold">Conversation ID:</span>{' '}
                    <span className="font-mono text-indigo-400">{(simResult.conversation as { id?: string })?.id}</span>
                  </p>
                  <p>
                    <span className="text-gray-500 font-semibold">Message Saved:</span>{' '}
                    <span className="text-gray-200 italic">&ldquo;{(simResult.message as { message_text?: string })?.message_text}&rdquo;</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusCard({
  title,
  subtitle,
  status,
  icon: Icon,
  color,
  badge,
}: {
  title: string
  subtitle: string
  status: string
  icon: React.ElementType
  color: 'emerald' | 'indigo' | 'purple' | 'blue'
  badge: string
}) {
  const colorMap = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  }

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">
          {badge}
        </span>
      </div>
      <div className="mt-4 space-y-1">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h4>
        <p className="text-sm font-bold text-white truncate">{status}</p>
        <p className="text-[11px] text-gray-500">{subtitle}</p>
      </div>
    </div>
  )
}
