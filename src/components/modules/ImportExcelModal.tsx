'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  AlertCircle,
  Layers,
  Database,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { normalizePhoneNumber } from '@/lib/phone';

export interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export interface BatchItem {
  id: string;
  filename: string;
  total_rows: number;
  valid_count: number;
  created_at: string;
}

export function ImportExcelModal({ isOpen, onClose, onImportSuccess }: ImportExcelModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resultSummary, setResultSummary] = useState<{
    totalRows: number;
    valid: number;
    duplicates: number;
    fileDuplicates: number;
    dbDuplicates: number;
    invalid: number;
  } | null>(null);

  // Manage Batches State
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  // Fetch Existing Import Batches
  const fetchBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const supabase = createClient();
      
      // Try querying import_batches table first
      const { data: batchData, error: batchErr } = await supabase
        .from('import_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (!batchErr && batchData) {
        setBatches(batchData as BatchItem[]);
      } else {
        // Fallback: Group by import_batch_name from leads table
        const { data: leadsData } = await supabase
          .from('leads')
          .select('import_batch_name, import_batch_id, created_at');

        if (leadsData && leadsData.length > 0) {
          const groupedMap = new Map<string, { id: string; filename: string; count: number; created_at: string }>();
          
          leadsData.forEach((l: any) => {
            const batchName = l.import_batch_name || 'Uploaded Dataset';
            const batchId = l.import_batch_id || batchName;
            
            if (groupedMap.has(batchName)) {
              const existing = groupedMap.get(batchName)!;
              existing.count += 1;
            } else {
              groupedMap.set(batchName, {
                id: batchId,
                filename: batchName,
                count: 1,
                created_at: l.created_at || new Date().toISOString(),
              });
            }
          });

          const fallbackBatches: BatchItem[] = Array.from(groupedMap.values()).map((b) => ({
            id: b.id,
            filename: b.filename,
            total_rows: b.count,
            valid_count: b.count,
            created_at: b.created_at,
          }));

          setBatches(fallbackBatches);
        } else {
          setBatches([]);
        }
      }
    } catch (_) {
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchBatches();
    }
  }, [isOpen, fetchBatches]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    if (e.target.files && e.target.files[0]) {
      setFileSelected(e.target.files[0]);
    }
  };

  const handleStartImport = async () => {
    if (!fileSelected) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      // 1. Read File as ArrayBuffer
      const buffer = await fileSelected.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        setErrorMessage('The uploaded Excel file contains no data rows.');
        setIsProcessing(false);
        return;
      }

      const totalRows = rawRows.length;
      const supabase = createClient();

      // 2. Fetch existing phone numbers from Supabase leads table
      const { data: existingLeads, error: fetchErr } = await supabase
        .from('leads')
        .select('phone');

      if (fetchErr) {
        setErrorMessage(`Supabase Read Error: ${fetchErr.message}`);
        setIsProcessing(false);
        return;
      }

      const existingPhoneSet = new Set<string>(
        (existingLeads || []).map((l: any) => l.phone)
      );

      const filePhoneSet = new Set<string>();
      const validLeadsToInsert: any[] = [];
      let dbDuplicateCount = 0;
      let fileDuplicateCount = 0;
      let invalidPhoneCount = 0;

      // 3. Process every row with dynamic column detection
      for (const row of rawRows) {
        const rowKeys = Object.keys(row);
        const findVal = (possibleKeys: string[]) => {
          const matchKey = rowKeys.find((k) =>
            possibleKeys.some((p) => k.toLowerCase().trim().replace(/[\s_]/g, '').includes(p))
          );
          return matchKey ? String(row[matchKey]).trim() : '';
        };

        const name = findVal(['name', 'fullname', 'contact', 'clientname', 'person', 'leadname', 'customer']);
        const rawPhone = findVal(['phone', 'mobile', 'whatsapp', 'phonenumber', 'contactno', 'tel', 'cell', 'number']);
        const business = findVal(['business', 'company', 'businessname', 'organization', 'firm', 'shop', 'store']);
        const category = findVal(['category', 'industry', 'sector', 'businesscategory', 'type']);
        const city = findVal(['city', 'location', 'region', 'place', 'address', 'district', 'state', 'town']);
        const websiteUrl = findVal(['website', 'url', 'domain', 'link', 'site']);

        // Normalize phone number
        const normalizedPhone = normalizePhoneNumber(rawPhone);

        // Category 1: Invalid Phone (< 10 digits)
        const digitCount = normalizedPhone.replace(/[^\d]/g, '').length;
        if (!rawPhone || digitCount < 10) {
          invalidPhoneCount++;
          continue;
        }

        // Category 2: Pre-existing Database Duplicate
        if (existingPhoneSet.has(normalizedPhone)) {
          dbDuplicateCount++;
          continue;
        }

        // Category 3: Duplicate within current Excel file
        if (filePhoneSet.has(normalizedPhone)) {
          fileDuplicateCount++;
          continue;
        }

        // Category 4: Valid New Lead
        filePhoneSet.add(normalizedPhone);
        validLeadsToInsert.push({
          name: name || business || 'Business Lead',
          phone: normalizedPhone,
          business: business || name || 'Local Business',
          category: category || 'General Business',
          city: city || 'Coimbatore',
          status: 'cold',
          campaign_status: 'pending',
          import_batch_name: fileSelected.name,
          website_url: websiteUrl || null,
          website_status: 'UNKNOWN',
        });
      }

      // 4. Create Batch Record in import_batches table if possible
      let batchId: string | null = null;
      try {
        const { data: batchRes } = await supabase
          .from('import_batches')
          .insert({
            filename: fileSelected.name,
            total_rows: totalRows,
            valid_count: validLeadsToInsert.length,
          })
          .select()
          .single();

        if (batchRes) {
          batchId = batchRes.id;
        }
      } catch (_) {}

      // Attach batchId to leads if created
      if (batchId) {
        validLeadsToInsert.forEach((l) => {
          l.import_batch_id = batchId;
        });
      }

      // 5. Batch Insert Valid Leads into Supabase in chunks of 100
      let insertedCount = 0;
      if (validLeadsToInsert.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < validLeadsToInsert.length; i += chunkSize) {
          const chunk = validLeadsToInsert.slice(i, i + chunkSize);
          const { data: insertedData, error: insertErr } = await supabase
            .from('leads')
            .insert(chunk)
            .select();

          if (insertErr) {
            setErrorMessage(`Supabase Insert Error: ${insertErr.message}`);
            setIsProcessing(false);
            return;
          }

          insertedCount += insertedData ? insertedData.length : chunk.length;
        }
      }

      // 6. Summary statistics
      setIsProcessing(false);
      setResultSummary({
        totalRows,
        valid: insertedCount,
        duplicates: fileDuplicateCount + dbDuplicateCount,
        fileDuplicates: fileDuplicateCount,
        dbDuplicates: dbDuplicateCount,
        invalid: invalidPhoneCount,
      });

      // 7. Trigger background website verification (fire and forget)
      if (batchId) {
        fetch('/api/discovery/website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch_id: batchId }),
        }).catch(err => console.error('[Import] Failed to trigger background verification', err));
      }

      fetchBatches();
    } catch (err: any) {
      setErrorMessage(`Excel Parsing Error: ${err?.message || 'Failed to read file.'}`);
      setIsProcessing(false);
    }
  };

  // Delete an imported Excel Dataset Batch & all its associated leads
  const handleDeleteBatch = async (batch: BatchItem) => {
    if (!confirm(`Are you sure you want to delete dataset "${batch.filename}"?\nAll associated leads will be permanently removed from CRM.`)) {
      return;
    }

    setDeletingBatchId(batch.id);
    try {
      const supabase = createClient();

      // 1. Delete from import_batches if ID exists
      if (batch.id && !batch.id.includes('.xlsx') && !batch.id.includes('.csv')) {
        await supabase.from('import_batches').delete().eq('id', batch.id);
      }

      // 2. Delete leads with matching import_batch_id or import_batch_name
      await supabase
        .from('leads')
        .delete()
        .or(`import_batch_id.eq.${batch.id},import_batch_name.eq.${batch.filename}`);

      // 3. Refresh local batch list and notify parent to refresh CRM views immediately
      await fetchBatches();

      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err: any) {
      alert(`Error deleting batch: ${err?.message || 'Failed to delete records'}`);
    } finally {
      setDeletingBatchId(null);
    }
  };

  const handleFinish = () => {
    setFileSelected(null);
    setResultSummary(null);
    setErrorMessage('');
    if (onImportSuccess) {
      onImportSuccess();
    }
    onClose();
  };

  const handleReset = () => {
    setFileSelected(null);
    setResultSummary(null);
    setErrorMessage('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="📊 Excel Lead Data Import & Dataset Manager"
      description="Upload Excel files or manage existing imported datasets for Reliable Vision AI CRM."
      size="lg"
      footer={
        resultSummary ? (
          <Button variant="primary" onClick={handleFinish} className="shadow-lg shadow-pink-500/20">
            Done & Update CRM <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab(activeTab === 'upload' ? 'manage' : 'upload')}
              leftIcon={activeTab === 'upload' ? <Database className="h-4 w-4 text-purple-400" /> : <UploadCloud className="h-4 w-4 text-pink-400" />}
              className="text-xs border-white/10"
            >
              {activeTab === 'upload' ? `Manage Datasets (${batches.length})` : '← Upload New Excel'}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Close
              </Button>
              {activeTab === 'upload' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartImport}
                  disabled={!fileSelected}
                  isLoading={isProcessing}
                  leftIcon={<UploadCloud className="h-4 w-4" />}
                  className="shadow-lg shadow-pink-500/20"
                >
                  Start Import
                </Button>
              )}
            </div>
          </div>
        )
      }
    >
      {/* Top Tab Selector */}
      <div className="flex items-center gap-2 p-1 bg-[#101018] rounded-xl border border-white/[0.08] mb-4">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'upload'
              ? 'bg-[#151520] text-white border border-white/10 shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          ➕ Upload New Excel
        </button>
        <button
          onClick={() => {
            setActiveTab('manage');
            fetchBatches();
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'manage'
              ? 'bg-[#151520] text-white border border-white/10 shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          🗂️ Manage Imported Datasets ({batches.length})
        </button>
      </div>

      {activeTab === 'upload' ? (
        !resultSummary ? (
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2 backdrop-blur-md">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* File Dropzone */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-pink-500/60 rounded-2xl p-8 bg-[#0B0B12] transition-colors text-center cursor-pointer relative shadow-inner">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="h-12 w-12 text-emerald-400 mb-3" />
              <p className="text-sm font-extrabold text-white">
                {fileSelected ? fileSelected.name : 'Click or Drag & Drop Excel File here'}
              </p>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                Supports Bangalore, Hyderabad, Chennai, Coimbatore or any location Excel files (.xlsx, .csv)
              </p>
            </div>

            {/* Sample Format Preview */}
            <div className="rounded-xl bg-[#0B0B12] p-3.5 border border-white/[0.08] text-xs space-y-2">
              <p className="font-bold text-zinc-300">Flexible Header Auto-Detection:</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-zinc-300 font-mono text-[10px]">
                <div className="bg-[#151520] p-2 rounded-lg border border-white/10 text-center font-bold">Name</div>
                <div className="bg-[#151520] p-2 rounded-lg border border-white/10 text-center font-bold">Phone / Mobile</div>
                <div className="bg-[#151520] p-2 rounded-lg border border-white/10 text-center font-bold">Business</div>
                <div className="bg-[#151520] p-2 rounded-lg border border-white/10 text-center font-bold">Category</div>
                <div className="bg-[#151520] p-2 rounded-lg border border-white/10 text-center font-bold">City / Location</div>
              </div>
            </div>
          </div>
        ) : (
          /* Validation & Real Insertion Output Results */
          <div className="space-y-5 animate-in zoom-in-95">
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 backdrop-blur-md">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-300">
                  Successfully imported dataset into Supabase!
                </p>
                <p className="text-xs text-emerald-300/80 mt-0.5 font-medium">
                  {resultSummary.valid} new leads inserted from "{fileSelected?.name}".
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-[#151520] border border-white/[0.08]">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Rows</span>
                <p className="text-lg font-extrabold text-white mt-0.5">{resultSummary.totalRows}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#151520] border border-emerald-500/30">
                <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Inserted</span>
                <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{resultSummary.valid}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#151520] border border-amber-500/30">
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Duplicates</span>
                <p className="text-lg font-extrabold text-amber-400 mt-0.5">{resultSummary.duplicates}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#151520] border border-rose-500/30">
                <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">Invalid</span>
                <p className="text-lg font-extrabold text-rose-400 mt-0.5">{resultSummary.invalid}</p>
              </div>
            </div>
          </div>
        )
      ) : (
        /* Manage Imported Datasets List */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">Active Excel Import Datasets in Database</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBatches}
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loadingBatches ? 'animate-spin' : ''}`} />}
              className="text-[11px] p-1.5"
            >
              Refresh
            </Button>
          </div>

          {loadingBatches ? (
            <div className="p-8 text-center text-xs text-zinc-400">Loading datasets from Supabase...</div>
          ) : batches.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-white/10 rounded-2xl bg-[#0B0B12]">
              No imported Excel datasets found in database.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {batches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#151520] border border-white/[0.08] hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-pink-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-extrabold text-white tracking-tight">{b.filename}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">
                        {b.valid_count || b.total_rows} Leads • Uploaded {new Date(b.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteBatch(b)}
                    isLoading={deletingBatchId === b.id}
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    className="text-xs rounded-xl"
                  >
                    Delete Dataset
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
