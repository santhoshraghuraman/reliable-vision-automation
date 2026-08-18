'use client'

import { useState } from 'react'
import { Lead, LeadStatus, LeadUpdateInput } from '@/lib/types'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { updateLead } from '@/services/leads.service'
import toast from 'react-hot-toast'

interface EditLeadDialogProps {
  lead: Lead
  open: boolean
  onClose: () => void
  onSaved: (updatedLead: Lead) => void
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'COLD', label: '🔵 COLD' },
  { value: 'WARM', label: '🟠 WARM' },
  { value: 'HOT', label: '🔥 HOT' },
  { value: 'CONTACTED', label: '💬 CONTACTED' },
  { value: 'INTERESTED', label: '⭐ INTERESTED' },
  { value: 'NOT_INTERESTED', label: '❌ NOT INTERESTED' },
  { value: 'CONVERTED', label: '✅ CONVERTED' },
]

export function EditLeadDialog({ lead, open, onClose, onSaved }: EditLeadDialogProps) {
  const [name, setName] = useState(lead.name || '')
  const [phone, setPhone] = useState(lead.phone || '')
  const [business, setBusiness] = useState(lead.business || '')
  const [category, setCategory] = useState(lead.category || '')
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [requirement, setRequirement] = useState(lead.requirement || '')
  const [isEligible, setIsEligible] = useState(lead.is_eligible)
  const [optedOut, setOptedOut] = useState(lead.opted_out)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) {
      toast.error('Phone number is required')
      return
    }
    if (!name.trim() && !business.trim()) {
      toast.error('Either Name or Business Name is required')
      return
    }

    setSaving(true)
    const updates: LeadUpdateInput = {
      name: name.trim() || business.trim(),
      phone: phone.trim(),
      business: business.trim() || null,
      category: category.trim() || null,
      status,
      requirement: requirement.trim() || null,
      is_eligible: isEligible,
      opted_out: optedOut,
    }

    const { lead: updated, error } = await updateLead(lead.id, updates)
    setSaving(false)

    if (error || !updated) {
      toast.error(error || 'Failed to update lead')
      return
    }

    toast.success('Lead updated successfully')
    onSaved(updated)
    onClose()
  }

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
        Cancel
      </Button>
      <Button variant="primary" size="sm" onClick={handleSubmit} loading={saving}>
        {saving ? 'Saving Changes...' : 'Save Changes'}
      </Button>
    </div>
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit Lead Details"
      description={`Editing ${lead.name}`}
      size="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Contact Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
          />

          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +91 98765 43210"
            required
          />

          <Input
            label="Business / Company Name"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="e.g. Acme Corp"
          />

          <Input
            label="Category / Industry"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Automobile Dealer"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Lead Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
          />

          <div className="flex items-center gap-6 pt-6">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isEligible}
                onChange={(e) => setIsEligible(e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Eligible for Outreach</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={optedOut}
                onChange={(e) => setOptedOut(e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              <span className="text-red-400">Opted Out (Do Not Contact)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Requirement / Notes / Suggested Pitch
          </label>
          <textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            rows={4}
            placeholder="Enter sales notes, pitch details, website requirements..."
            className="w-full px-3.5 py-2.5 bg-gray-800/80 border border-gray-700 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
          />
        </div>
      </form>
    </Dialog>
  )
}
