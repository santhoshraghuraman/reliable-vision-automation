'use client'

import { useState, useEffect } from 'react'
import { Lead, LeadStatus, AuditLog, AIScoreResult } from '@/lib/types'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EditLeadDialog } from './EditLeadDialog'
import { AddNoteDialog } from './AddNoteDialog'
import { DeleteLeadDialog } from './DeleteLeadDialog'
import { updateLead, getLeadActivity, getLeadScore, scoreLead } from '@/services/leads.service'
import { useRouter } from 'next/navigation'
import {
  Phone,
  Building2,
  Tag,
  Calendar,
  Clock,
  Edit,
  Trash2,
  MessageSquarePlus,
  FileText,
  History,
  Copy,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Zap,
  Target,
  Send,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface LeadDetailProps {
  initialLead: Lead
}

const STATUS_TRANSITIONS: LeadStatus[] = [
  'COLD',
  'WARM',
  'HOT',
  'CONTACTED',
  'INTERESTED',
  'NOT_INTERESTED',
  'CONVERTED',
]

export function LeadDetail({ initialLead }: LeadDetailProps) {
  const router = useRouter()
  const [lead, setLead] = useState<Lead>(initialLead)
  const [aiScore, setAiScore] = useState<AIScoreResult | null>(initialLead.ai_score || null)
  const [loadingAiScore, setLoadingAiScore] = useState(!initialLead.ai_score)
  const [scoringAi, setScoringAi] = useState(false)
  const [activity, setActivity] = useState<AuditLog[]>([])
  const [loadingActivity, setLoadingActivity] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Dialogs
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    let active = true
    getLeadActivity(lead.id).then(({ activity: logs }) => {
      if (!active) return
      setActivity(logs)
      setLoadingActivity(false)
    })
    return () => {
      active = false
    }
  }, [lead.id])

  useEffect(() => {
    let active = true
    getLeadScore(lead.id).then(({ ai_score: score }) => {
      if (!active) return
      if (score) setAiScore(score)
      setLoadingAiScore(false)
    })
    return () => {
      active = false
    }
  }, [lead.id])

  const refreshActivity = async () => {
    const { activity: logs } = await getLeadActivity(lead.id)
    setActivity(logs)
  }

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (newStatus === lead.status || updatingStatus) return
    setUpdatingStatus(true)

    const { lead: updated, error } = await updateLead(lead.id, { status: newStatus })
    setUpdatingStatus(false)

    if (error || !updated) {
      toast.error(error || 'Failed to update status')
      return
    }

    setLead(updated)
    toast.success(`Status updated to ${newStatus}`)
    refreshActivity()
  }

  const handleAnalyzeWithAI = async () => {
    setScoringAi(true)
    const { ai_score: newScore, lead: updatedLead, error } = await scoreLead(lead.id)
    setScoringAi(false)

    if (error || !newScore) {
      toast.error(error || 'Failed to analyze lead with AI')
      return
    }

    setAiScore(newScore)
    if (updatedLead) {
      setLead(updatedLead)
    }
    toast.success(`AI Analysis Complete: Scored ${newScore.score}/100 (${newScore.classification})`)
    refreshActivity()
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`Copied ${label} to clipboard!`)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Header */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                {lead.name}
              </h1>
              <StatusBadge status={lead.status} />
              {aiScore && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  aiScore.classification === 'HOT' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  aiScore.classification === 'WARM' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  <Sparkles className="w-3 h-3" />
                  AI: {aiScore.score}/100 ({aiScore.classification})
                </span>
              )}
              <Badge variant="gray">Source: {lead.source.toUpperCase()}</Badge>
              {lead.opted_out && <Badge variant="danger">Opted Out</Badge>}
              {!lead.is_eligible && <Badge variant="warning">Ineligible</Badge>}
            </div>

            <p className="text-sm text-gray-400 flex items-center gap-2">
              {lead.business && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  {lead.business}
                </span>
              )}
              {lead.category && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Tag className="w-3.5 h-3.5 text-gray-500" />
                    {lead.category}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleAnalyzeWithAI}
              loading={scoringAi}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none shadow-md shadow-indigo-600/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{scoringAi ? 'Analyzing...' : aiScore ? 'Re-analyze with AI' : 'Analyze with AI'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNoteDialog(true)}
              className="flex items-center gap-1.5"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add Note</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(true)}
              className="flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5 text-gray-300" />
              <span>Edit Lead</span>
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        </div>

        {/* Quick Status Transition Bar */}
        <div className="mt-5 pt-5 border-t border-gray-800/80">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
            Quick Status Update
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_TRANSITIONS.map((st) => {
              const isActive = lead.status === st
              return (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  disabled={updatingStatus || isActive}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 ring-2 ring-indigo-400'
                        : 'bg-gray-800/90 text-gray-400 hover:text-gray-200 hover:bg-gray-700/80 border border-gray-700/60'
                    }
                    ${updatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {st}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main 2-Column CRM Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): AI Qualification, Contact, Sales Pitch */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Lead Qualification Card */}
          <div className="bg-gradient-to-br from-gray-900/90 via-indigo-950/20 to-gray-900/90 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    AI Lead Qualification & Scoring
                  </h2>
                  <p className="text-xs text-indigo-300/80">
                    Gemini AI qualification analyzing commercial intent, category, and website necessity
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyzeWithAI}
                loading={scoringAi}
                className="shrink-0 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {scoringAi ? 'Analyzing...' : aiScore ? 'Re-Score' : 'Score with AI'}
              </Button>
            </div>

            {loadingAiScore ? (
              <div className="p-6 text-center text-xs text-gray-500">Checking AI qualification status...</div>
            ) : aiScore ? (
              <div className="space-y-4 pt-2">
                {/* Score Header Pill */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-900/80 border border-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="text-center px-3 py-1 bg-gray-800 rounded-lg border border-gray-700">
                      <span className="text-2xl font-black text-white">{aiScore.score}</span>
                      <span className="text-[10px] text-gray-400 block font-medium">/ 100</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${
                          aiScore.classification === 'HOT' ? 'text-red-400' :
                          aiScore.classification === 'WARM' ? 'text-orange-400' : 'text-blue-400'
                        }`}>
                          {aiScore.classification === 'HOT' ? '🔥 HIGH PRIORITY LEAD' :
                           aiScore.classification === 'WARM' ? '🟡 MODERATE OPPORTUNITY' : '🔵 COLD LEAD'}
                        </span>
                        <Badge variant={aiScore.classification === 'HOT' ? 'danger' : aiScore.classification === 'WARM' ? 'warning' : 'info'}>
                          {aiScore.classification}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Scored {aiScore.created_at ? format(new Date(aiScore.created_at), 'PPP p') : 'recently'}
                      </p>
                    </div>
                  </div>

                  {aiScore.confidence && (
                    <div className="text-right text-xs text-gray-400">
                      <span className="text-[11px] text-gray-500 uppercase block font-semibold">AI Confidence</span>
                      <span className="font-mono text-indigo-400 font-semibold">{Math.round(aiScore.confidence * 100)}%</span>
                    </div>
                  )}
                </div>

                {/* AI Reasoning */}
                <div className="p-4 bg-gray-900/60 border border-gray-800/80 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span>AI Qualification Reason</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {aiScore.reason}
                  </p>
                </div>

                {/* Recommended Action */}
                <div className="p-4 bg-gray-900/60 border border-gray-800/80 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recommended Sales Action</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {aiScore.recommended_action}
                  </p>
                </div>

                {/* Suggested Pitch */}
                <div className="p-4 bg-gray-900/60 border border-gray-800/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 uppercase tracking-wider">
                      <Send className="w-3.5 h-3.5 text-purple-400" />
                      <span>Custom Suggested Sales Pitch</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(aiScore.suggested_pitch, 'Sales Pitch')}
                      className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Pitch</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-200 bg-gray-950/60 p-3 rounded-lg border border-gray-800/60 italic leading-relaxed">
                    &ldquo;{aiScore.suggested_pitch}&rdquo;
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-indigo-500/20 rounded-xl space-y-3 bg-indigo-950/10">
                <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                  This lead has not been evaluated by AI yet. Click below to analyze website necessity, commercial fit, and generate a tailored pitch.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAnalyzeWithAI}
                  loading={scoringAi}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  <span>Analyze Lead with AI</span>
                </Button>
              </div>
            )}
          </div>

          {/* Contact Information Card */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-md">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Phone className="w-4 h-4 text-indigo-400" />
              Lead Contact & Business Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <DetailItem
                label="Contact / Lead Name"
                value={lead.name}
                onCopy={() => copyToClipboard(lead.name, 'Name')}
              />

              <div className="p-3.5 bg-gray-800/40 border border-gray-800 rounded-xl">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                  Phone Number
                </span>
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={`tel:${lead.phone}`}
                    className="font-mono text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {lead.phone}
                  </a>
                  <button
                    onClick={() => copyToClipboard(lead.phone, 'Phone Number')}
                    className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                    title="Copy phone"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <DetailItem
                label="Business / Organization"
                value={lead.business || '—'}
                onCopy={lead.business ? () => copyToClipboard(lead.business!, 'Business Name') : undefined}
              />

              <DetailItem
                label="Industry / Category"
                value={lead.category || '—'}
              />

              <DetailItem
                label="Outreach Eligibility"
                value={
                  lead.is_eligible ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> Eligible
                    </span>
                  ) : (
                    <span className="text-orange-400 flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4" /> Ineligible
                    </span>
                  )
                }
              />

              <DetailItem
                label="Do Not Contact (Opted Out)"
                value={
                  lead.opted_out ? (
                    <span className="text-red-400 font-semibold">Yes (Opted Out)</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )
                }
              />

              <DetailItem
                label="Created Date"
                value={
                  <span className="flex items-center gap-1 text-gray-300">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    {format(new Date(lead.created_at), 'PPP p')}
                  </span>
                }
              />

              <DetailItem
                label="Last Updated"
                value={
                  <span className="flex items-center gap-1 text-gray-300">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    {format(new Date(lead.updated_at), 'PPP p')}
                  </span>
                }
              />
            </div>
          </div>

          {/* Requirements & Sales Pitch Card */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-md">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-emerald-400" />
              Requirements, Pitch & Metadata
            </h2>

            {lead.requirement ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/40 border border-gray-800 rounded-xl">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Extracted Sales Notes & Needs
                  </p>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {lead.requirement}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-gray-800 rounded-xl text-gray-500 text-xs">
                No requirement or sales pitch notes recorded for this lead yet. Click &ldquo;Edit Lead&rdquo; or &ldquo;Add Note&rdquo; to add details.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity History & Notes Timeline */}
        <div className="space-y-6">
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Activity Timeline ({activity.length})
              </h2>
              <button
                onClick={() => setShowNoteDialog(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                + Add Note
              </button>
            </div>

            {loadingActivity ? (
              <p className="text-xs text-gray-500 py-4 text-center">Loading activity...</p>
            ) : activity.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-gray-800 rounded-xl text-gray-500 text-xs">
                No activity logged yet. Status updates and added notes will appear here.
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {activity.map((item) => (
                  <ActivityItem key={item.id} log={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEditDialog && (
        <EditLeadDialog
          lead={lead}
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSaved={(updated) => {
            setLead(updated)
            refreshActivity()
          }}
        />
      )}

      {showNoteDialog && (
        <AddNoteDialog
          leadId={lead.id}
          leadName={lead.name}
          open={showNoteDialog}
          onClose={() => setShowNoteDialog(false)}
          onNoteAdded={() => {
            refreshActivity()
          }}
        />
      )}

      {showDeleteDialog && (
        <DeleteLeadDialog
          leadId={lead.id}
          leadName={lead.name}
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onDeleted={() => {
            router.push('/leads')
          }}
        />
      )}
    </div>
  )
}

function DetailItem({
  label,
  value,
  onCopy,
}: {
  label: string
  value: React.ReactNode
  onCopy?: () => void
}) {
  return (
    <div className="p-3.5 bg-gray-800/40 border border-gray-800 rounded-xl">
      <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
        {label}
      </span>
      <div className="flex items-center justify-between gap-2">
        <div className="text-gray-200 font-medium truncate">{value}</div>
        {onCopy && (
          <button
            onClick={onCopy}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors shrink-0"
            title={`Copy ${label}`}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function ActivityItem({ log }: { log: AuditLog }) {
  const details = typeof log.details === 'object' && log.details !== null ? log.details : {}
  const noteText = (details as { note?: string }).note
  const action = log.action

  const getActionBadge = () => {
    switch (action) {
      case 'AI_SCORED':
        return <span className="text-xs font-semibold text-purple-400">✨ AI Qualification Completed</span>
      case 'NOTE_ADDED':
        return <span className="text-xs font-semibold text-emerald-400">📝 Note Added</span>
      case 'STATUS_CHANGED':
        return <span className="text-xs font-semibold text-indigo-400">🔄 Status Changed</span>
      case 'LEAD_UPDATED':
        return <span className="text-xs font-semibold text-blue-400">✏️ Lead Details Updated</span>
      case 'LEAD_DELETED':
        return <span className="text-xs font-semibold text-red-400">🗑️ Lead Deleted</span>
      default:
        return <span className="text-xs font-semibold text-gray-400">{action}</span>
    }
  }

  return (
    <div className="p-3 bg-gray-800/40 border border-gray-800/80 rounded-xl text-xs space-y-1.5">
      <div className="flex items-center justify-between">
        {getActionBadge()}
        <span className="text-[10px] text-gray-500">
          {format(new Date(log.created_at), 'MMM d, h:mm a')}
        </span>
      </div>

      {action === 'AI_SCORED' && (
        <div className="space-y-1 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800 mt-1">
          <p className="text-gray-200 font-semibold">
            Score: {(details as { score?: number }).score}/100 ({(details as { classification?: string }).classification})
          </p>
          {(details as { reason?: string }).reason && (
            <p className="text-gray-400 text-[11px]">
              {(details as { reason?: string }).reason}
            </p>
          )}
        </div>
      )}

      {noteText && (
        <p className="text-gray-300 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800 mt-1 whitespace-pre-wrap">
          {noteText}
        </p>
      )}

      {action === 'STATUS_CHANGED' && (
        <p className="text-gray-400">
          Updated from <span className="text-gray-300">{(details as { previous_status?: string }).previous_status || 'UNKNOWN'}</span> to{' '}
          <span className="text-indigo-300 font-semibold">{(details as { new_status?: string }).new_status}</span>
        </p>
      )}
    </div>
  )
}
