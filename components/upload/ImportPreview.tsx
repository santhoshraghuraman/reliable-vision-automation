'use client'

import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Table,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ValidatedRow, ImportPreviewData } from '@/lib/types'
import { importLeads } from '@/services/leads.service'
import toast from 'react-hot-toast'

interface ImportPreviewProps {
  preview: ImportPreviewData
  fileName: string
  onCancel: () => void
  onImportComplete: () => void
}

interface ImportResultState {
  imported: number
  failed: number
  errors: string[]
}

export function ImportPreview({
  preview,
  fileName,
  onCancel,
  onImportComplete,
}: ImportPreviewProps) {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResultState | null>(null)
  const [showInvalid, setShowInvalid] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [showExtraCols, setShowExtraCols] = useState(false)

  const canImport = preview.valid.length > 0
  const mapping = preview.columnMapping
  const totalDuplicates = preview.duplicatesInFile.length + preview.duplicatesInDb.length

  const handleImport = async () => {
    if (!canImport) return
    setImporting(true)

    try {
      const importResult = await importLeads(preview)
      setResult(importResult)

      if (importResult.imported > 0) {
        toast.success(`Successfully imported ${importResult.imported} leads!`)
      }
      if (importResult.failed > 0) {
        toast.error(`${importResult.failed} leads failed to import.`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed'
      toast.error(`Import failed: ${message}`)
    } finally {
      setImporting(false)
    }
  }

  if (result) {
    return (
      <Dialog
        open={true}
        onClose={onImportComplete}
        title="Import Complete"
        size="md"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="primary" size="sm" onClick={onImportComplete}>
              View Leads in CRM
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          {/* Result Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
              <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
              <p className="text-xs text-emerald-500 mt-1 font-medium">Successfully Imported</p>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
              <p className="text-2xl font-bold text-red-400">{result.failed}</p>
              <p className="text-xs text-red-500 mt-1 font-medium">Failed</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl max-h-36 overflow-y-auto">
              <p className="text-xs font-semibold text-red-400 mb-1.5">Errors:</p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-300 py-0.5">{err}</p>
              ))}
            </div>
          )}
        </div>
      </Dialog>
    )
  }

  const modalFooter = (
    <div className="flex items-center justify-between gap-4 w-full">
      <div className="text-xs text-gray-400 truncate">
        {canImport ? (
          <span>
            Ready to import <strong className="text-emerald-400 font-semibold">{preview.valid.length}</strong> valid lead{preview.valid.length !== 1 ? 's' : ''} (default status: <span className="text-blue-400">🔵 COLD</span>)
          </span>
        ) : (
          <span className="text-red-400 font-medium">No valid leads available to import</span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={importing}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleImport}
          loading={importing}
          disabled={!canImport || importing}
        >
          {importing ? 'Importing...' : `Import ${preview.valid.length} Lead${preview.valid.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog
      open={true}
      onClose={onCancel}
      title="Import Preview"
      description={`File: ${fileName}`}
      size="2xl"
      footer={modalFooter}
    >
      <div className="p-5 space-y-4">
        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Rows"
            value={preview.total}
            color="gray"
          />
          <SummaryCard
            label="Valid"
            value={preview.valid.length}
            color="emerald"
            icon={<CheckCircle className="w-3.5 h-3.5" />}
          />
          <SummaryCard
            label="Duplicates"
            value={totalDuplicates}
            color="orange"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
          />
          <SummaryCard
            label="Invalid"
            value={preview.invalid.length}
            color="red"
            icon={<XCircle className="w-3.5 h-3.5" />}
          />
        </div>

        {/* Column Mapping Detection Card */}
        {mapping && (
          <div className="bg-gray-800/50 border border-gray-700/60 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Detected Column Mapping
                </span>
              </div>
              {mapping.nameFallbackFromBusiness && (
                <span className="text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                  Name fallback from Business Name
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <MappingPill
                target="Name"
                source={mapping.nameHeader ?? (mapping.businessHeader ? `${mapping.businessHeader} (fallback)` : '—')}
                isFallback={mapping.nameFallbackFromBusiness}
              />
              <MappingPill
                target="Phone"
                source={mapping.phoneHeader ?? '—'}
                required
              />
              <MappingPill
                target="Business"
                source={mapping.businessHeader ?? '—'}
              />
              <MappingPill
                target="Category"
                source={mapping.categoryHeader ?? '—'}
              />
            </div>

            {mapping.extraColumns && mapping.extraColumns.length > 0 && (
              <div className="pt-2 border-t border-gray-700/40">
                <button
                  type="button"
                  onClick={() => setShowExtraCols(!showExtraCols)}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {mapping.extraColumns.length} Extra Column{mapping.extraColumns.length !== 1 ? 's' : ''} mapped to metadata
                  </span>
                  {showExtraCols ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showExtraCols && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {mapping.extraColumns.map((col) => (
                      <span
                        key={col}
                        className="inline-block px-2 py-0.5 bg-gray-700/60 text-gray-300 text-[11px] rounded border border-gray-600/40"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Duplicates breakdown (Collapsible) */}
        {totalDuplicates > 0 && (
          <div className="border border-orange-500/30 bg-orange-500/5 rounded-xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2.5 bg-orange-500/10 hover:bg-orange-500/15 transition-colors text-left"
              onClick={() => setShowDuplicates(!showDuplicates)}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="text-xs font-semibold text-orange-300">
                  {totalDuplicates} Duplicate Lead{totalDuplicates !== 1 ? 's' : ''} (Will be skipped)
                </span>
                <span className="text-[11px] text-orange-400/80">
                  ({preview.duplicatesInFile.length} in file, {preview.duplicatesInDb.length} in CRM)
                </span>
              </div>
              {showDuplicates ? (
                <ChevronUp className="w-4 h-4 text-orange-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-orange-400" />
              )}
            </button>
            {showDuplicates && (
              <div className="divide-y divide-orange-500/10 max-h-36 overflow-y-auto overscroll-contain">
                {[...preview.duplicatesInFile, ...preview.duplicatesInDb].map((row) => (
                  <InvalidRowItem key={`${row._rowIndex}-${row.phone}`} row={row} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invalid rows breakdown (Collapsible) */}
        {preview.invalid.length > 0 && (
          <div className="border border-red-500/30 bg-red-500/5 rounded-xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2.5 bg-red-500/10 hover:bg-red-500/15 transition-colors text-left"
              onClick={() => setShowInvalid(!showInvalid)}
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs font-semibold text-red-300">
                  {preview.invalid.length} Invalid Row{preview.invalid.length !== 1 ? 's' : ''} (Will be skipped)
                </span>
              </div>
              {showInvalid ? (
                <ChevronUp className="w-4 h-4 text-red-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-red-400" />
              )}
            </button>
            {showInvalid && (
              <div className="divide-y divide-red-500/10 max-h-36 overflow-y-auto overscroll-contain">
                {preview.invalid.map((row) => (
                  <InvalidRowItem key={`${row._rowIndex}-${row.phone}`} row={row} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Valid rows preview table */}
        {preview.valid.length > 0 && (
          <div className="border border-gray-700/60 rounded-xl overflow-hidden bg-gray-900/40">
            <div className="px-4 py-2.5 bg-gray-800/60 flex items-center justify-between border-b border-gray-700/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-300">
                  Valid Leads Ready for Import ({preview.valid.length})
                </span>
              </div>
              <span className="text-[11px] text-gray-400 font-mono">
                Showing first {Math.min(preview.valid.length, 25)} rows
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto overflow-x-auto overscroll-contain">
              <table className="w-full text-xs min-w-[650px]">
                <thead className="bg-gray-800/80 sticky top-0 border-b border-gray-700/60 z-10">
                  <tr>
                    <th className="text-left px-3.5 py-2 text-gray-400 font-medium w-14">Row</th>
                    <th className="text-left px-3.5 py-2 text-gray-400 font-medium min-w-[140px]">Name</th>
                    <th className="text-left px-3.5 py-2 text-gray-400 font-medium min-w-[110px]">Phone</th>
                    <th className="text-left px-3.5 py-2 text-gray-400 font-medium min-w-[140px]">Business</th>
                    <th className="text-left px-3.5 py-2 text-gray-400 font-medium min-w-[100px]">Category</th>
                    <th className="text-left px-3.5 py-2 text-gray-400 font-medium min-w-[180px]">Requirement / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {preview.valid.slice(0, 25).map((row) => (
                    <tr key={`${row._rowIndex}-${row.phone}`} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-3.5 py-2 text-gray-500 font-mono">#{row._rowIndex}</td>
                      <td className="px-3.5 py-2 font-medium text-gray-200">
                        <span className="truncate block max-w-[160px]" title={row.name}>
                          {row.name}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 font-mono text-gray-300">{row.phone}</td>
                      <td className="px-3.5 py-2 text-gray-300">
                        <span className="truncate block max-w-[160px]" title={row.business || '—'}>
                          {row.business || '—'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-gray-400">
                        {row.category ? (
                          <span className="inline-block px-1.5 py-0.5 bg-gray-800 border border-gray-700/60 rounded text-gray-300 text-[11px] truncate max-w-[120px]" title={row.category}>
                            {row.category}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-gray-400">
                        <span className="truncate block max-w-[220px]" title={row.requirement || '—'}>
                          {row.requirement || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {preview.valid.length > 25 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-2.5 text-center text-gray-500 text-xs bg-gray-800/20 font-medium">
                        ... and {preview.valid.length - 25} more valid leads will be imported into Supabase
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}

function MappingPill({
  target,
  source,
  required,
  isFallback,
}: {
  target: string
  source: string
  required?: boolean
  isFallback?: boolean
}) {
  return (
    <div className="p-2.5 bg-gray-900/70 border border-gray-700/50 rounded-lg">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
          {target} {required && <span className="text-red-400">*</span>}
        </span>
      </div>
      <p className={`font-mono text-xs truncate ${isFallback ? 'text-indigo-300' : 'text-gray-200'}`} title={source}>
        {source}
      </p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: number
  color: 'gray' | 'emerald' | 'orange' | 'red'
  icon?: React.ReactNode
}) {
  const colors = {
    gray: 'bg-gray-800/60 border-gray-700/60 text-gray-300',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
    red: 'bg-red-500/10 border-red-500/20 text-red-300',
  }

  return (
    <div className={`border rounded-xl p-3 text-center ${colors[color]}`}>
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {icon && <span className="opacity-80">{icon}</span>}
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
    </div>
  )
}

function InvalidRowItem({ row }: { row: ValidatedRow }) {
  return (
    <div className="px-4 py-2 flex items-start gap-3 text-xs">
      <span className="text-gray-500 font-mono shrink-0 w-10">R#{row._rowIndex}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-200 font-medium truncate max-w-[200px]">
            {row.name || <span className="text-gray-500 italic">No name</span>}
          </span>
          {row.phone && <span className="text-gray-400 font-mono">({row.phone})</span>}
        </div>
        {row.errors.map((err, i) => (
          <p key={i} className="text-red-400 text-[11px] mt-0.5">{err}</p>
        ))}
      </div>
    </div>
  )
}
