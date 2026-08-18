'use client'

import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { bulkScoreLeads } from '@/services/leads.service'
import { Sparkles, CheckCircle2, AlertTriangle, Play } from 'lucide-react'
import toast from 'react-hot-toast'

interface BulkAIScoringDialogProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
  totalLeadsCount: number
}

export function BulkAIScoringDialog({
  open,
  onClose,
  onComplete,
  totalLeadsCount,
}: BulkAIScoringDialogProps) {
  const [batchSize, setBatchSize] = useState(50)
  const [forceRescore, setForceRescore] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{
    total: number
    scored: number
    skipped: number
    failed: number
  } | null>(null)

  const handleStart = async () => {
    setRunning(true)
    setResult(null)

    try {
      const res = await bulkScoreLeads(batchSize, forceRescore)
      if (res.error) {
        toast.error(res.error)
      } else {
        setResult(res)
        toast.success(`Successfully analyzed ${res.scored} leads with AI!`)
      }
    } catch (err) {
      toast.error((err as Error).message || 'Batch scoring failed')
    } finally {
      setRunning(false)
    }
  }

  const handleFinish = () => {
    onComplete()
    onClose()
  }

  const footer = result ? (
    <div className="flex justify-end w-full">
      <Button variant="primary" size="sm" onClick={handleFinish}>
        View Updated Leads
      </Button>
    </div>
  ) : (
    <div className="flex items-center justify-end gap-3 w-full">
      <Button variant="outline" size="sm" onClick={onClose} disabled={running}>
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={handleStart}
        loading={running}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none"
      >
        <Play className="w-3.5 h-3.5 mr-1" />
        <span>{running ? 'Analyzing Leads...' : `Start AI Analysis (${Math.min(batchSize, totalLeadsCount)} Leads)`}</span>
      </Button>
    </div>
  )

  return (
    <Dialog
      open={open}
      onClose={result ? handleFinish : onClose}
      title="Analyze Leads with AI"
      description="Automated commercial qualification and sales pitch generation"
      size="md"
      footer={footer}
    >
      <div className="p-6 space-y-4">
        {result ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-300 space-y-1">
                <p className="font-semibold text-emerald-200">AI Batch Analysis Completed</p>
                <p>The AI evaluated and scored your leads according to commercial intent, website necessity, and business signals.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-gray-800 rounded-xl border border-gray-700">
                <p className="text-xl font-bold text-emerald-400">{result.scored}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Scored</p>
              </div>
              <div className="p-3 bg-gray-800 rounded-xl border border-gray-700">
                <p className="text-xl font-bold text-gray-300">{result.skipped}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Skipped (Already Scored)</p>
              </div>
              <div className="p-3 bg-gray-800 rounded-xl border border-gray-700">
                <p className="text-xl font-bold text-red-400">{result.failed}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Failed</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-300 leading-relaxed">
                <p className="font-semibold text-white">Gemini AI Lead Qualification</p>
                <p className="mt-1">
                  AI will evaluate each lead&apos;s business category, pitch requirement, and commercial signals, assigning a 0–100 score (HOT/WARM/COLD) and generating customized sales pitches.
                </p>
              </div>
            </div>

            {/* Batch Options */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Batch Size to Analyze
                </label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  disabled={running}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={25}>25 Leads</option>
                  <option value={50}>50 Leads (Recommended)</option>
                  <option value={100}>100 Leads</option>
                  <option value={200}>200 Leads</option>
                </select>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={forceRescore}
                  onChange={(e) => setForceRescore(e.target.checked)}
                  disabled={running}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Re-score leads that were already analyzed previously</span>
              </label>
            </div>

            {running && (
              <div className="p-4 bg-gray-800/60 border border-gray-700/60 rounded-xl text-center space-y-2">
                <div className="inline-block animate-spin text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-xs text-gray-300 font-medium">Analyzing leads with Gemini AI...</p>
                <p className="text-[11px] text-gray-500">Please do not close this dialog while processing.</p>
              </div>
            )}

            {!running && (
              <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
                <span>AI will safely qualify leads without sending any real messages or altering contacts.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
