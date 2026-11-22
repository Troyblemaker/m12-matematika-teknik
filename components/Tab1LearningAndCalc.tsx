'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Compass,
  GitCompareArrows,
  Play,
  PlusCircle,
  Trash2,
  Waves,
} from 'lucide-react';
import { evaluateArithmetic } from '@/lib/math-engine';
import {
  AngleLogEntry,
  ArithmeticLogEntry,
  SinusoidalInputParams,
  StudentIdentity,
  WaveformLogEntry,
} from '@/lib/types';
import PersistenceToolbar from './PersistenceToolbar';

interface Tab1LearningAndCalcProps {
  student: StudentIdentity;
  angleLogs: AngleLogEntry[];
  waveformLogs: WaveformLogEntry[];
  arithmeticLogs: ArithmeticLogEntry[];
  onAddArithmeticLog: (entry: ArithmeticLogEntry) => void;
  onDeleteArithmeticLog: (id: string) => void;
  onClearArithmeticLogs: () => void;
  onLoadSampleToSimulator: (sample: SinusoidalInputParams) => void;
}

const KEYPAD_BUTTONS = [
  { label: 'C', action: 'clear', style: 'bg-[#2a1a1d] text-red-300 border-red-500/30 hover:bg-red-950/60' },
  { label: '(', value: '(', style: 'bg-[#222227] text-[#c4c9cf] border-white/[0.14] hover:bg-[#2c2c33] hover:text-[#f4f4f5]' },
  { label: ')', value: ')', style: 'bg-[#222227] text-[#c4c9cf] border-white/[0.14] hover:bg-[#2c2c33] hover:text-[#f4f4f5]' },
  { label: '⌫', action: 'backspace', style: 'bg-[#222227] text-[#c4c9cf] border-white/[0.14] hover:bg-[#2c2c33] hover:text-[#f4f4f5]' },

  { label: '7', value: '7', style: 'bg-[#101013] text-[#f4f4f5] border-white/[0.14] hover:bg-[#222227]' },
  { label: '8', value: '8', style: 'bg-[#101013] text-[#f4f4f5] border-white/[0.14] hover:bg-[#222227]' },
  { label: '9', value: '9', style: 'bg-[#101013] text-[#f4f4f5] border-white/[0.14] hover:bg-[#222227]' },
  { label: '÷', value: ' ÷ ', style: 'bg-[#222227] text-[#2f6bff] border-white/[0.16] hover:bg-[#2c2c33] font-bold' },

  { label: '4', value: '4', style: 'bg-[#101013] text-[#f4f4f5] border-white/[0.14] hover:bg-[#222227]' },
  { label: '5', value: '5', style: 'bg-[#101013] text-[#f4f4f5] border-white/[0.14] hover:bg-[#222227]' },
  { label: '6', value: '6', style: 'bg-[#101013] text-[#f4f4f5] border-white/[0.14] hover:bg-[#222227]' },
  { label: '×', value: ' × ', style: 'bg-[#222227] text-[#2f6bff] border-white/[0.16] hover:bg-[#2c2c33] font-bold' },

  { label: '1', value: '1', style: 'bg-[#101013] text-[#f4f4f5] border-white/[0.14] hover:bg-[#222227]' },
  { label: '2', value: '2', style: 'bg-[#101013] text-[#f4f4f5] border-white/[0.14] hover:bg-[#222227]' },
  { label: '3', value: '3', style: 'bg-[#101013] text-[#f4f4f5] border-white/[0.14] hover:bg-[#222227]' },
  { label: '-', value: ' - ', style: 'bg-[#222227] text-[#2f6bff] border-white/[0.16] hover:bg-[#2c2c33] font-bold' },

  { label: '0', value: '0', style: 'bg-[#101013] text-[#f4f4f5] border-white/[0.14] hover:bg-[#222227]' },
  { label: '.', value: '.', style: 'bg-[#101013] text-[#f4f4f5] border-white/[0.14] hover:bg-[#222227]' },
  { label: 'π', value: 'π', style: 'bg-[#222227] text-[#35ff92] border-white/[0.16] hover:bg-[#2c2c33] font-bold' },
  { label: '+', value: ' + ', style: 'bg-[#222227] text-[#2f6bff] border-white/[0.16] hover:bg-[#2c2c33] font-bold' },
];

export default function Tab1LearningAndCalc({
  student,
  angleLogs,
  waveformLogs,
  arithmeticLogs,
  onAddArithmeticLog,
  onDeleteArithmeticLog,
  onClearArithmeticLogs,
  onLoadSampleToSimulator,
}: Tab1LearningAndCalcProps) {
  const [expression, setExpression] = useState<string>('0.1 + 0.2');
  const [notes, setNotes] = useState<string>('Uji Presisi IEEE 754 (Decimal.js)');

  const evaluation = useMemo(() => evaluateArithmetic(expression), [expression]);

  const handleKeypadClick = (btn: (typeof KEYPAD_BUTTONS)[number]) => {
    if (btn.action === 'clear') {
      setExpression('');
      return;
    }
    if (btn.action === 'backspace') {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }
    if (btn.value) {
      setExpression((prev) => prev + btn.value);
    }
  };

  const handleSaveCalculation = () => {
    if (!evaluation.isValid) return;

    const entry: ArithmeticLogEntry = {
      id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      expression: expression.trim(),
      result: evaluation.formattedResult,
      notes: notes.trim() || 'Kalkulator Aritmatika Dasar',
    };

    onAddArithmeticLog(entry);
  };

  const handleLoadSampleP12 = () => {
    onLoadSampleToSimulator({
      amplitude: 340,
      omegaInput: '50π',
      waveType: 'sin',
      phaseSign: '-',
      phiInput: '0.541',
      vTarget: 200,
    });
  };

  const handleLoadSample2 = () => {
    onLoadSampleToSimulator({
      amplitude: 5,
      omegaInput: '100π',
      waveType: 'sin',
      phaseSign: '-',
      phiInput: '0.432',
      vTarget: 200,
    });
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="space-y-1">
        <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
          [01 · TUJUAN PEMBELAJARAN &amp; KALKULATOR PRESISI]
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] tracking-[-0.02em] print:text-black">
          1. Tujuan Pembelajaran, Referensi Rumus &amp; Kalkulator Aritmatika Dasar
        </h2>
        <p className="text-sm text-[#c4c9cf] print:text-zinc-600">
          Pelajari hubungan konversi satuan sudut, beda fase gelombang AC, serta uji perhitungan presisi tinggi sebelum memulai praktikum.
        </p>
      </div>

      {/* 3 Instructional Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Konversi Satuan Sudut */}
        <div className="cafe-card rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                [MODUL 01 · SUDUT]
              </span>
              <Compass className="w-4 h-4 text-[#9ca3af]" />
            </div>

            <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] print:text-black">
              Konversi Satuan Sudut (° ↔ rad ↔ DMS)
            </h3>

            <p className="text-xs text-[#c4c9cf] leading-relaxed print:text-zinc-700">
              Hubungan dua arah (bidirectional) antara <strong className="text-[#f4f4f5]">Derajat Desimal (°)</strong>,{' '}
              <strong className="text-[#f4f4f5]">Radian (rad &amp; kπ)</strong>, serta komponen seksagesimal{' '}
              <strong className="text-[#f4f4f5]">DMS (° &apos; &quot;)</strong>.
            </p>

            <div className="space-y-2 pt-1 font-mono text-xs tabular-nums">
              <div className="p-3 rounded-xl bg-[#101013] border border-white/[0.12] text-[#f4f4f5]">
                <div className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] mb-0.5">
                  Radian ke Derajat
                </div>
                1 rad = 180° / π ≈ 57.2958°
              </div>
              <div className="p-3 rounded-xl bg-[#101013] border border-white/[0.12] text-[#f4f4f5]">
                <div className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] mb-0.5">
                  Derajat ke Radian
                </div>
                1° = π / 180 rad ≈ 0.017453 rad
              </div>
              <div className="p-3 rounded-xl bg-[#101013] border border-white/[0.12] text-[#f4f4f5]">
                <div className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] mb-0.5">
                  Sub-satuan Seksagesimal (DMS)
                </div>
                1° = 60&apos; (menit) = 3600&quot; (detik)
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.12] text-[11px] text-[#9ca3af] font-mono">
            DMS → Desimal: D + M/60 + S/3600
          </div>
        </div>

        {/* Card 2: Phase Angle (Lead vs Lag) */}
        <div className="cafe-card rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                [MODUL 02 · BEDA FASE]
              </span>
              <GitCompareArrows className="w-4 h-4 text-[#9ca3af]" />
            </div>

            <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] print:text-black">
              Phase Angle (Lead vs Lag)
            </h3>

            <p className="text-xs text-[#c4c9cf] leading-relaxed print:text-zinc-700">
              Analisis pergeseran sudut fase <strong className="text-[#f4f4f5]">φ (rad atau °)</strong> terhadap gelombang referensi untuk menentukan kondisi sefase, mendahului, atau tertinggal:
            </p>

            <div className="space-y-2 pt-1 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#101013] border border-white/[0.12] flex items-center justify-between">
                <div>
                  <span className="text-[#9ca3af] block text-[10px] uppercase tracking-[0.06em]">
                    In Phase (Sefase, φ = 0)
                  </span>
                  <span className="text-[#f4f4f5] font-semibold">y = A sin(ωt)</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#222227] text-[#c4c9cf] border border-white/[0.12] text-[10px]">
                  0°
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#101013] border border-white/[0.12] flex items-center justify-between">
                <div>
                  <span className="text-[#9ca3af] block text-[10px] uppercase tracking-[0.06em]">
                    Leading (Mendahului, +φ)
                  </span>
                  <span className="text-[#35ff92] font-semibold">y = A sin(ωt + φ)</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#35ff92]/15 text-[#35ff92] border border-[#35ff92]/30 text-[10px]">
                  LEAD (+)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#101013] border border-white/[0.12] flex items-center justify-between">
                <div>
                  <span className="text-[#9ca3af] block text-[10px] uppercase tracking-[0.06em]">
                    Lagging (Tertinggal, -φ)
                  </span>
                  <span className="text-[#6090ff] font-semibold">y = A sin(ωt - φ)</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#2f6bff]/20 text-[#6090ff] border border-[#2f6bff]/40 text-[10px]">
                  LAG (-)
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.12] text-[11px] text-[#9ca3af] font-mono">
            φ(°) = φ(rad) × (180° / π)
          </div>
        </div>

        {/* Card 3: Parameter Sinusoidal AC */}
        <div className="cafe-card rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                [MODUL 03 · AC WAVEFORM]
              </span>
              <Waves className="w-4 h-4 text-[#9ca3af]" />
            </div>

            <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] print:text-black">
              Parameter Sinusoidal AC &amp; Soal P12
            </h3>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-[#101013] border border-white/[0.12]">
                <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                  Amplitudo
                </span>
                <span className="text-[#f4f4f5] font-semibold">A (V / A)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#101013] border border-white/[0.12]">
                <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                  Periode
                </span>
                <span className="text-[#f4f4f5] font-semibold">T = 2π / ω (s)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#101013] border border-white/[0.12]">
                <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                  Frekuensi
                </span>
                <span className="text-[#f4f4f5] font-semibold">f = 1 / T (Hz)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#101013] border border-white/[0.12]">
                <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                  Kec. Sudut
                </span>
                <span className="text-[#f4f4f5] font-semibold">ω = 2πf (rad/s)</span>
              </div>
            </div>

            {/* Reference Problem P12 */}
            <div className="p-4 rounded-xl bg-[#101013] border border-white/[0.16] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                  [SOAL REFERENSI P12]
                </span>
                <span className="text-[11px] font-mono text-[#35ff92]">V_target = 200 V</span>
              </div>
              <div className="font-mono text-sm font-bold text-[#f4f4f5] bg-[#18181c] px-3 py-2 rounded-lg border border-white/[0.12] text-center">
                v(t) = 340 sin(50πt - 0.541) V
              </div>
              <div className="flex flex-col gap-2 pt-1 print:hidden">
                <button
                  type="button"
                  onClick={handleLoadSampleP12}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#f4f4f5] hover:bg-white text-[#171515] transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Load Sample P12 to Simulator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleLoadSample2}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer"
                >
                  <span>Contoh 2: v(t) = 5 sin(100πt - 0.432) V</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Arithmetic Calculator Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calculator Card */}
        <div className="lg:col-span-5 cafe-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.12] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#222227] border border-white/[0.14] text-[#f4f4f5]">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] print:text-black">
                  Basic Arithmetic Calculator
                </h3>
                <p className="text-xs text-[#9ca3af] font-mono">
                  Decimal.js · 50-Digit Exact
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.06em] rounded-full bg-[#222227] text-[#35ff92] border border-white/[0.14]">
              [NO DRIFT]
            </span>
          </div>

          {/* Quick Preset Expressions */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] block">
              Preset Uji Presisi Cepat
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '0.1 + 0.2', expr: '0.1 + 0.2', note: 'Uji Bebas Drift IEEE 754' },
                { label: '180 / π', expr: '180 / π', note: 'Nilai 1 Radian dalam Derajat' },
                { label: '50.145 × (π / 180)', expr: '50.145 * (π / 180)', note: 'Konversi 50.145° ke Radian' },
                { label: '45 + 55/60 + 7.92/3600', expr: '45 + 55/60 + 7.92/3600', note: 'DMS ke Derajat Desimal' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setExpression(preset.expr);
                    setNotes(preset.note);
                  }}
                  className="px-3 py-1 rounded-full text-xs font-mono bg-[#101013] hover:bg-[#222227] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expression Display & Input */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="calc-expression-input"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                Ekspresi (+, -, ×, ÷, tanda kurung, π)
              </label>
              <input
                id="calc-expression-input"
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="(0.1 + 0.2) × π"
                className="cafe-input w-full px-3.5 py-2.5 text-base font-mono rounded-xl placeholder-[#9ca3af]/40"
              />
            </div>

            {/* Evaluated Output Box */}
            <div className="p-4 rounded-xl bg-[#101013] border border-white/[0.14] flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                HASIL (=)
              </span>
              {evaluation.isValid ? (
                <span
                  data-testid="calc-result-display"
                  className="text-lg sm:text-xl font-mono tabular-nums font-bold text-[#35ff92] break-all text-right"
                >
                  {evaluation.formattedResult}
                </span>
              ) : (
                <span className="text-xs font-mono text-red-400 text-right">
                  {evaluation.error || 'Ekspresi belum lengkap'}
                </span>
              )}
            </div>

            {/* Optional Note Input */}
            <div>
              <label
                htmlFor="calc-note-input"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                Catatan Perhitungan
              </label>
              <input
                id="calc-note-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Menghitung nilai radian"
                className="cafe-input w-full px-3.5 py-2 text-xs rounded-xl placeholder-[#9ca3af]/40"
              />
            </div>
          </div>

          {/* Interactive Keypad */}
          <div className="grid grid-cols-4 gap-2 pt-1 print:hidden">
            {KEYPAD_BUTTONS.map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => handleKeypadClick(btn)}
                className={`py-2.5 rounded-xl font-mono text-sm border transition-all active:scale-95 cursor-pointer ${btn.style}`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSaveCalculation}
            disabled={!evaluation.isValid}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs sm:text-sm font-semibold bg-[#f4f4f5] hover:bg-white text-[#171515] disabled:opacity-40 transition-all active:scale-95 cursor-pointer print:hidden"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Simpan Perhitungan ke Log Praktikum</span>
          </button>
        </div>

        {/* Arithmetic Log & Unified Persistence Toolbar */}
        <div className="lg:col-span-7 space-y-4">
          <PersistenceToolbar
            student={student}
            angleLogs={angleLogs}
            waveformLogs={waveformLogs}
            arithmeticLogs={arithmeticLogs}
            onSaveTrial={evaluation.isValid ? handleSaveCalculation : undefined}
            saveButtonLabel="Save Hasil Kalkulator"
            onClearCurrentLog={onClearArithmeticLogs}
            clearButtonLabel="Clear Log Kalkulator"
          />

          <div className="cafe-card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.12] flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-[0.08em] text-[#f4f4f5]">
                [LOG PERHITUNGAN KALKULATOR DASAR]
              </span>
              <span className="text-xs font-mono tabular-nums text-[#9ca3af]">
                {arithmeticLogs.length} BARIS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#101013] text-[#9ca3af] font-mono text-[11px] uppercase tracking-[0.06em] border-b border-white/[0.12]">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Ekspresi</th>
                    <th className="py-3 px-4">Hasil Presisi</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 px-4 text-center print:hidden">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08]">
                  {arithmeticLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 px-4 text-center text-[#9ca3af] font-mono text-xs"
                      >
                        Belum ada riwayat perhitungan disimpan. Masukkan ekspresi dan klik &quot;Save Hasil Kalkulator&quot;.
                      </td>
                    </tr>
                  ) : (
                    arithmeticLogs.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-3 px-4 font-mono tabular-nums text-center text-[#9ca3af]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-xs text-[#9ca3af]">
                          {item.timestamp}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#f4f4f5]">
                          {item.expression}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums font-bold text-[#35ff92]">
                          {item.result}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#c4c9cf]">
                          {item.notes}
                        </td>
                        <td className="py-3 px-4 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => onDeleteArithmeticLog(item.id)}
                            title="Hapus baris"
                            className="p-1.5 rounded-full text-[#9ca3af] hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
