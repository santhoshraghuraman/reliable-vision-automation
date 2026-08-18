'use client'

import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { deleteLead } from '@/services/leads.service'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface DeleteLeadDialogProps {
  leadId: string
  leadName: string
  open: boolean
  onClose: () => void
  onDeleted: () => void
}

export function DeleteLeadDialog({
  leadId,
  leadName,
  open,
  onClose,
  onDeleted,
}: DeleteLeadDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    const { success, error } = await deleteLead(leadId)
    setDeleting(false)

    if (!success || error) {
      toast.error(error || 'Failed to delete lead')
      return
    }

    toast.success(`Lead "${leadName}" was permanently deleted`)
    onDeleted()
    onClose()
  }

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      <Button variant="outline" size="sm" onClick={onClose} disabled={deleting}>
        Cancel
      </Button>
      <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
        {deleting ? 'Deleting...' : 'Permanently Delete'}
      </Button>
    </div>
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete Lead"
      size="md"
      footer={footer}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-300">
            <p className="font-semibold text-red-200">Warning: Irreversible Action</p>
            <p className="mt-1 text-red-300/90">
              Are you sure you want to delete lead <strong className="text-white font-medium">&quot;{leadName}&quot;</strong>? This will remove the lead and all associated records from the CRM.
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
