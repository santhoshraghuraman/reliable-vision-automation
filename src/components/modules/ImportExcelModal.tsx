'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, UploadCloud, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportExcelModal({ isOpen, onClose }: ImportExcelModalProps) {
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    totalRows: number;
    valid: number;
    duplicates: number;
    invalid: number;
  } | null>(null);

  const handleSimulateFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileSelected(e.target.files[0]);
    }
  };

  const handleStartImport = () => {
    if (!fileSelected) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setResultSummary({
        totalRows: 1000,
        valid: 970,
        duplicates: 20,
        invalid: 10,
      });
    }, 1200);
  };

  const handleReset = () => {
    setFileSelected(null);
    setResultSummary(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="📊 Excel / CSV Lead Import"
      description="Upload your Excel sheet (Name, Phone, Business, Category) for automated phone normalization & duplicate checking."
      size="lg"
      footer={
        resultSummary ? (
          <Button variant="primary" onClick={onClose}>
            Done & View Leads <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStartImport}
              disabled={!fileSelected}
              isLoading={isProcessing}
              leftIcon={<UploadCloud className="h-4 w-4" />}
            >
              Start Validation & Import
            </Button>
          </>
        )
      }
    >
      {!resultSummary ? (
        <div className="space-y-4">
          {/* File Dropzone */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-xl p-8 bg-slate-950/60 transition-colors text-center cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleSimulateFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <FileSpreadsheet className="h-12 w-12 text-emerald-400 mb-3" />
            <p className="text-sm font-semibold text-slate-200">
              {fileSelected ? fileSelected.name : 'Click or Drag & Drop Excel File here'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports .xlsx, .xls, or .csv up to 10MB
            </p>
          </div>

          {/* Sample Format Preview */}
          <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 text-xs">
            <p className="font-semibold text-slate-300 mb-2">Expected Column Header Format:</p>
            <div className="grid grid-cols-4 gap-2 text-slate-400 font-mono text-[11px]">
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">Name</div>
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">Phone</div>
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">Business</div>
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">Category</div>
            </div>
          </div>
        </div>
      ) : (
        /* Validation Output Results */
        <div className="space-y-5 animate-in zoom-in-95">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-300">Import & Validation Completed!</h4>
              <p className="text-xs text-emerald-400/90 mt-0.5">
                Phone numbers normalized with country code (+91) and duplicates removed.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Rows</span>
              <p className="text-lg font-bold text-white mt-1">{resultSummary.totalRows}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Valid Leads</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">{resultSummary.valid}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-amber-500/30">
              <span className="text-[10px] text-amber-400 uppercase font-semibold">Duplicates</span>
              <p className="text-lg font-bold text-amber-400 mt-1">{resultSummary.duplicates}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-rose-500/30">
              <span className="text-[10px] text-rose-400 uppercase font-semibold">Invalid Phone</span>
              <p className="text-lg font-bold text-rose-400 mt-1">{resultSummary.invalid}</p>
            </div>
          </div>

          <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 text-xs text-slate-400 space-y-1">
            <p className="flex items-center gap-1 text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> 970 leads ready for WhatsApp campaign outreach.
            </p>
            <p className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> 20 duplicate entries merged into existing contact records.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
