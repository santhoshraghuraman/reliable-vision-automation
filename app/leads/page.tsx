'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, RefreshCw, Sparkles } from 'lucide-react'
import { Lead, LeadFilters } from '@/lib/types'
import { getLeads, getCategories } from '@/services/leads.service'
import { LeadTable } from '@/components/leads/LeadTable'
import { ExcelUploader } from '@/components/upload/ExcelUploader'
import { BulkAIScoringDialog } from '@/components/leads/BulkAIScoringDialog'
import { Header } from '@/components/layout/Header'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'COLD', label: '🔵 COLD' },
  { value: 'WARM', label: '🟠 WARM' },
  { value: 'HOT', label: '🔥 HOT' },
  { value: 'CONTACTED', label: '💬 CONTACTED' },
  { value: 'INTERESTED', label: '⭐ INTERESTED' },
  { value: 'NOT_INTERESTED', label: '❌ NOT INTERESTED' },
  { value: 'CONVERTED', label: '✅ CONVERTED' },
]

const PAGE_SIZE = 50

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [showBulkAiDialog, setShowBulkAiDialog] = useState(false)

  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const fetchLeads = useCallback(
    async (filters: LeadFilters) => {
      setLoading(true)
      setError(null)
      const { leads: data, count, error: err } = await getLeads(filters)
      if (err) {
        setError(err)
      } else {
        setLeads(data)
        setTotalCount(count)
      }
      setLoading(false)
    },
    []
  )

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchLeads({ search, status: status as LeadFilters['status'], category, page: 1, pageSize: PAGE_SIZE })
    }, 400)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [search, status, category, fetchLeads])

  // Load categories for filter
  useEffect(() => {
    getCategories().then((cats) => setCategories(cats))
  }, [])

  const handleRefresh = () => {
    setPage(1)
    fetchLeads({ search, status: status as LeadFilters['status'], category, page: 1, pageSize: PAGE_SIZE })
    getCategories().then((cats) => setCategories(cats))
  }

  const handleImportComplete = () => {
    handleRefresh()
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c, label: c })),
  ]

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Leads"
        subtitle={`${totalCount.toLocaleString()} total leads`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkAiDialog(true)}
              className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Analyze Leads with AI</span>
            </Button>

            <button
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh"
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <ExcelUploader onImportComplete={handleImportComplete} />
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name, phone, business, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="sm:w-48"
          />
          {categories.length > 0 && (
            <Select
              options={categoryOptions}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(1)
              }}
              className="sm:w-48"
            />
          )}
        </div>

        {/* Leads Table */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
          <LeadTable
            leads={leads}
            loading={loading}
            error={error}
            onRetry={handleRefresh}
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <p className="text-xs text-gray-500">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = page - 1
                  setPage(newPage)
                  fetchLeads({ search, status: status as LeadFilters['status'], category, page: newPage, pageSize: PAGE_SIZE })
                }}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = page + 1
                  setPage(newPage)
                  fetchLeads({ search, status: status as LeadFilters['status'], category, page: newPage, pageSize: PAGE_SIZE })
                }}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {showBulkAiDialog && (
        <BulkAIScoringDialog
          open={showBulkAiDialog}
          onClose={() => setShowBulkAiDialog(false)}
          onComplete={handleRefresh}
          totalLeadsCount={totalCount}
        />
      )}
    </div>
  )
}
