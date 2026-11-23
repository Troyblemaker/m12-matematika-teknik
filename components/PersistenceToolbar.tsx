'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  PlusCircle,
  Printer,
  Trash2,
} from 'lucide-react';
import {
  AngleLogEntry,
  ArithmeticLogEntry,
  StudentIdentity,
  WaveformLogEntry,
} from '@/lib/types';
import { downloadPracticumExcel } from '@/lib/excel-exporter';

interface PersistenceToolbarProps {
  student: StudentIdentity;
  angleLogs: AngleLogEntry[];
  waveformLogs: WaveformLogEntry[];
  arithmeticLogs: ArithmeticLogEntry[];
  onSaveTrial?: () => void;
  saveButtonLabel?: string;
  onClearCurrentLog: () => void;
  clearButtonLabel?: string;
}

export default function PersistenceToolbar({
  student,
  angleLogs,
  waveformLogs,
  arithmeticLogs,
  onSaveTrial,
  saveButtonLabel = 'Save Hasil Percobaan',
  onClearCurrentLog,
  clearButtonLabel = 'Clear Log',
}: PersistenceToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [justExported, setJustExported] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSaveClick = () => {
    if (!onSaveTrial) return;
    onSaveTrial();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const handleExportExcel = async () => {
    setLocalError(null);
    setIsExporting(true);
    try {
      await downloadPracticumExcel({
        student,
        angleLogs,
        waveformLogs,
        arithmeticLogs,
      });
      setJustExported(true);
      setTimeout(() => setJustExported(false), 1800);
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? `Gagal membuat file Excel: ${err.message}`
          : 'Gagal mengekspor file Excel (.xlsx).'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPdf = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-3 print:hidden">
      <div className="cafe-card grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-between gap-2 sm:gap-2.5 p-3 sm:p-3.5 rounded-2xl">
        <div className="col-span-2 sm:col-span-1 grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          {onSaveTrial && (
            <button
              type="button"
              onClick={handleSaveClick}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer min-h-[42px] ${
                justSaved
                  ? 'bg-[#35ff92] text-[#171515]'
                  : 'bg-[#f4f4f5] hover:bg-white text-[#171515]'
              }`}
            >
              {justSaved ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <PlusCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">
                {justSaved ? 'Tersimpan ke Log!' : saveButtonLabel}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium bg-[#222227] hover:bg-[#2c2c33] text-[#f4f4f5] border border-white/[0.16] transition-all disabled:opacity-50 cursor-pointer min-h-[42px]"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#35ff92] shrink-0" />
            ) : justExported ? (
              <CheckCircle2 className="w-4 h-4 text-[#35ff92] shrink-0" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-[#35ff92] shrink-0" />
            )}
            <span>{justExported ? 'Excel Diunduh!' : 'Export Excel (.xlsx)'}</span>
          </button>
        </div>

        <div className="col-span-2 sm:col-span-1 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePrintPdf}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer min-h-[42px]"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={onClearCurrentLog}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium bg-[#222227] hover:bg-red-950/50 text-[#c4c9cf] hover:text-red-300 border border-white/[0.14] hover:border-red-500/40 transition-colors cursor-pointer min-h-[42px]"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{clearButtonLabel}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {localError && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#18181c] border border-red-500/40 text-[#f4f4f5] text-xs sm:text-sm"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-[#c4c9cf]">{localError}</div>
          <button
            type="button"
            onClick={() => setLocalError(null)}
            className="text-xs font-mono uppercase tracking-[0.06em] text-[#9ca3af] hover:text-white"
          >
            [Tutup]
          </button>
        </div>
      )}
    </div>
  );
}
