'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { parseExcelBuffer } from '@/lib/excel-parser'
import { deduplicateWithinFile, checkSupabaseDuplicates, buildImportPreview } from '@/lib/validators'
import { ValidatedRow, ImportPreviewData } from '@/lib/types'
import { ImportPreview } from './ImportPreview'
import toast from 'react-hot-toast'

interface ExcelUploaderProps {
  onImportComplete: () => void
}

type UploadState = 'idle' | 'parsing' | 'checking_dupes' | 'preview' | 'importing'

export function ExcelUploader({ onImportComplete }: ExcelUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [fileName, setFileName] = useState<string>('')
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [preview, setPreview] = useState<ImportPreviewData | null>(null)

  const handleFile = useCallback(async (file: File) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/csv',
    ]

    // Also check extension for cases where MIME type is wrong
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!allowedTypes.includes(file.type) && !['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      toast.error('Invalid file type. Please upload an .xlsx, .xls, or .csv file.')
      return
    }

    setFileName(file.name)
    setParseErrors([])
    setState('parsing')

    try {
      const buffer = await file.arrayBuffer()
      const { rows, errors, columnMapping } = parseExcelBuffer(buffer)

      if (errors.length > 0) {
        setParseErrors(errors)
        setState('idle')
        return
      }

      if (rows.length === 0) {
        setParseErrors(['The file contains no data rows.'])
        setState('idle')
        return
      }

      // Step 1: Validate rows and detect file-level duplicates
      toast.loading(`Validating ${rows.length} rows...`, { id: 'upload' })
      const validated: ValidatedRow[] = deduplicateWithinFile(rows)

      // Step 2: Check Supabase for existing phone numbers
      setState('checking_dupes')
      toast.loading('Checking for existing leads...', { id: 'upload' })
      const finalRows = await checkSupabaseDuplicates(validated)

      toast.dismiss('upload')

      // Step 3: Build preview with detected column mappings
      const importPreview = buildImportPreview(finalRows, columnMapping)
      setPreview(importPreview)
      setState('preview')
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Failed to process file. Please try again.')
      setState('idle')
    }
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      // Reset input so same file can be re-uploaded
      e.target.value = ''
    },
    [handleFile]
  )

  const handleCancel = () => {
    setState('idle')
    setPreview(null)
    setFileName('')
    setParseErrors([])
  }

  const handleImportComplete = () => {
    setState('idle')
    setPreview(null)
    setFileName('')
    onImportComplete()
  }

  const isProcessing = state === 'parsing' || state === 'checking_dupes'

  if (state === 'preview' && preview) {
    return (
      <ImportPreview
        preview={preview}
        fileName={fileName}
        onCancel={handleCancel}
        onImportComplete={handleImportComplete}
      />
    )
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload Excel file"
      />

      <Button
        variant="primary"
        icon={<Upload className="w-4 h-4" />}
        onClick={() => inputRef.current?.click()}
        loading={isProcessing}
        disabled={isProcessing}
      >
        {state === 'parsing'
          ? 'Reading file...'
          : state === 'checking_dupes'
          ? 'Checking duplicates...'
          : 'Upload Excel'}
      </Button>

      {parseErrors.length > 0 && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              {parseErrors.map((err, i) => (
                <p key={i} className="text-sm text-red-400">
                  {err}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
