'use client'

import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { addLeadNote } from '@/services/leads.service'
import { AuditLog } from '@/lib/types'
import toast from 'react-hot-toast'

interface AddNoteDialogProps {
  leadId: string
  leadName: string
  open: boolean
  onClose: () => void
  onNoteAdded: (activity: AuditLog) => void
}

export function AddNoteDialog({
  leadId,
  leadName,
  open,
  onClose,
  onNoteAdded,
}: AddNoteDialogProps) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) {
      toast.error('Please enter a note')
      return
    }

    setSaving(true)
    const { activity, error } = await addLeadNote(leadId, note.trim())
    setSaving(false)

    if (error || !activity) {
      toast.error(error || 'Failed to save note')
      return
    }

    toast.success('Note added to timeline')
    onNoteAdded(activity)
    setNote('')
    onClose()
  }

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
        Cancel
      </Button>
      <Button variant="primary" size="sm" onClick={handleSubmit} loading={saving}>
        {saving ? 'Saving Note...' : 'Add Note'}
      </Button>
    </div>
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add Note to Lead"
      description={`Adding note for ${leadName}`}
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Note Content
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="e.g. Called client today. They are interested in a 5-page e-commerce website with payment gateway. Follow-up next Tuesday."
            className="w-full px-3.5 py-2.5 bg-gray-800/80 border border-gray-700 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
            autoFocus
          />
        </div>
      </form>
    </Dialog>
  )
}
