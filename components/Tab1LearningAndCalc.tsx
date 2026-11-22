'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Check,
  Compass,
  Copy,
  GitCompareArrows,
  Play,
  PlusCircle,
  Trash2,
  Waves,
} from 'lucide-react';
import { CalculatorAngleUnit, evaluateArithmetic } from '@/lib/math-engine';
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

interface ScientificPreset {
  label: string;
  expr: string;
  note: string;
  mode?: CalculatorAngleUnit;
}

const SCIENTIFIC_PRESETS: ScientificPreset[] = [
  {
    label: 'Soal P12: 340·sin(50π·0.01 - 0.541)',
    expr: '340 × sin(50π × 0.01 - 0.541)',
    note: 'Tegangan sesaat Soal P12 saat t = 10 ms (Mode RAD)',
    mode: 'RAD',
  },
  {
    label: 'sin(30°) + cos(60°)',
    expr: 'sin(30) + cos(60)',
    note: 'Trigonometri sudut istimewa (Mode DEG)',
    mode: 'DEG',
  },
  {
    label: 'V_rms = 340 / √2',
    expr: '340 ÷ √(2)',
    note: 'Tegangan Efektif (RMS) dari V_max = 340 V',
  },
  {
    label: 'atan(4/3) Sudut Fase',
    expr: 'atan(4 ÷ 3)',
    note: 'Sudut fase segitiga impedansi R=3, X=4 (Mode DEG)',
    mode: 'DEG',
  },
  {
    label: '0.1 + 0.2 (IEEE 754)',
    expr: '0.1 + 0.2',
    note: 'Uji Presisi Eksak Decimal.js (Bebas Drift)',
  },
  {
    label: '5! + 2^8 + ln(e^3)',
    expr: '5! + 2^8 + ln(e^3)',
    note: 'Faktorial, Eksponensial & Logaritma Natural',
  },
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
  const [expression, setExpression] = useState<string>(
    '340 × sin(50π × 0.01 - 0.541)'
  );
  const [angleUnit, setAngleUnit] = useState<CalculatorAngleUnit>('RAD');
  const [isSecondShift, setIsSecondShift] = useState<boolean>(false);
  const [ansValue, setAnsValue] = useState<string>('0');
  const [memoryValue, setMemoryValue] = useState<number>(0);
  const [notes, setNotes] = useState<string>(
    'Tegangan sesaat Soal P12 saat t = 10 ms (Mode RAD)'
  );
  const [copiedResult, setCopiedResult] = useState<boolean>(false);

  const evaluation = useMemo(
    () =>
      evaluateArithmetic(expression, {
        angleUnit,
        ans: ansValue,
      }),
    [expression, angleUnit, ansValue]
  );

  const appendToken = (token: string) => {
    setExpression((prev) => prev + token);
  };

  const handleClear = () => {
    setExpression('');
  };

  const handleBackspace = () => {
    setExpression((prev) => {
      const trimmed = prev;
      // Remove full multi-char function call prefix if cursor is at the end of e.g. "asin(" or " mod "
      const multiTokens = [
        'asin(',
        'acos(',
        'atan(',
        'sinh(',
        'cosh(',
        'tanh(',
        'sqrt(',
        'cbrt(',
        'sin(',
        'cos(',
        'tan(',
        'log(',
        'exp(',
        'abs(',
        'rad(',
        'deg(',
        'ln(',
        '√(',
        '∛(',
        ' mod ',
        ' ÷ ',
        ' × ',
        ' - ',
        ' + ',
        'Ans',
      ];
      for (const tok of multiTokens) {
        if (trimmed.endsWith(tok)) {
          return trimmed.slice(0, -tok.length);
        }
      }
      return trimmed.slice(0, -1);
    });
  };

  const handleEvaluateEquals = () => {
    if (!evaluation.isValid) return;
    setAnsValue(evaluation.formattedResult);
  };

  const handleSaveCalculation = () => {
    if (!evaluation.isValid) return;

    setAnsValue(evaluation.formattedResult);

    const entry: ArithmeticLogEntry = {
      id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      expression: `[${angleUnit}] ${expression.trim()}`,
      result: evaluation.formattedResult,
      notes: notes.trim() || `Kalkulator Ilmiah (${angleUnit})`,
    };

    onAddArithmeticLog(entry);
  };

  const handleCopyResult = async () => {
    if (!evaluation.isValid) return;
    try {
      await navigator.clipboard.writeText(evaluation.formattedResult);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 1600);
    } catch {
      // Ignore clipboard errors
    }
  };

  // Memory register handlers
  const handleMemoryClear = () => setMemoryValue(0);
  const handleMemoryRecall = () => {
    appendToken(memoryValue.toString());
  };
  const handleMemoryAdd = () => {
    if (evaluation.isValid) {
      setMemoryValue((prev) => prev + evaluation.numericValue);
    }
  };
  const handleMemorySubtract = () => {
    if (evaluation.isValid) {
      setMemoryValue((prev) => prev - evaluation.numericValue);
    }
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
          [01 · TUJUAN PEMBELAJARAN &amp; SCIENTIFIC CALCULATOR]
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] tracking-[-0.02em] print:text-black">
          1. Tujuan Pembelajaran, Referensi Rumus &amp; Modern Scientific Calculator
        </h2>
        <p className="text-sm text-[#c4c9cf] print:text-zinc-600">
          Pelajari hubungan konversi satuan sudut, beda fase gelombang AC, serta gunakan kalkulator ilmiah presisi tinggi (50-digit Decimal.js) untuk evaluasi trigonometri, logaritma, dan eksponensial.
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
              Hubungan dua arah (bidirectional) antara{' '}
              <strong className="text-[#f4f4f5]">Derajat Desimal (°)</strong>,{' '}
              <strong className="text-[#f4f4f5]">Radian (rad &amp; kπ)</strong>,
              serta komponen seksagesimal{' '}
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
              Analisis pergeseran sudut fase{' '}
              <strong className="text-[#f4f4f5]">φ (rad atau °)</strong>{' '}
              terhadap gelombang referensi untuk menentukan kondisi sefase,
              mendahului, atau tertinggal:
            </p>

            <div className="space-y-2 pt-1 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#101013] border border-white/[0.12] flex items-center justify-between">
                <div>
                  <span className="text-[#9ca3af] block text-[10px] uppercase tracking-[0.06em]">
                    In Phase (Sefase, φ = 0)
                  </span>
                  <span className="text-[#f4f4f5] font-semibold">
                    y = A sin(ωt)
                  </span>
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
                  <span className="text-[#35ff92] font-semibold">
                    y = A sin(ωt + φ)
                  </span>
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
                  <span className="text-[#6090ff] font-semibold">
                    y = A sin(ωt - φ)
                  </span>
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
                <span className="text-[#f4f4f5] font-semibold">
                  T = 2π / ω (s)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#101013] border border-white/[0.12]">
                <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                  Frekuensi
                </span>
                <span className="text-[#f4f4f5] font-semibold">
                  f = 1 / T (Hz)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#101013] border border-white/[0.12]">
                <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                  Kec. Sudut
                </span>
                <span className="text-[#f4f4f5] font-semibold">
                  ω = 2πf (rad/s)
                </span>
              </div>
            </div>

            {/* Reference Problem P12 */}
            <div className="p-4 rounded-xl bg-[#101013] border border-white/[0.16] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                  [SOAL REFERENSI P12]
                </span>
                <span className="text-[11px] font-mono text-[#35ff92]">
                  V_target = 200 V
                </span>
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

      {/* ====================================================================
          MODERN SCIENTIFIC CALCULATOR & LOG TABLE
         ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Scientific Calculator Console (6 cols) */}
        <div className="lg:col-span-6 cafe-card rounded-2xl p-5 sm:p-6 space-y-4">
          {/* Top Console Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.12] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#222227] border border-white/[0.16] text-[#35ff92]">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] print:text-black">
                  Modern Scientific Calculator
                </h3>
                <p className="text-[11px] text-[#9ca3af] font-mono">
                  Decimal.js 50-Digit · Trig, Log, Exp &amp; Factorial
                </p>
              </div>
            </div>

            {/* Angle Unit Pill Switcher (DEG / RAD) */}
            <div className="flex items-center gap-2">
              <div
                className="inline-flex rounded-full bg-[#101013] p-0.5 border border-white/[0.16]"
                role="group"
                aria-label="Mode Satuan Sudut Kalkulator"
              >
                <button
                  type="button"
                  onClick={() => setAngleUnit('DEG')}
                  className={`px-3 py-1 text-[11px] font-mono rounded-full transition-all cursor-pointer ${
                    angleUnit === 'DEG'
                      ? 'bg-[#35ff92] text-[#171515] font-bold shadow'
                      : 'text-[#9ca3af] hover:text-[#f4f4f5]'
                  }`}
                >
                  DEG (°)
                </button>
                <button
                  type="button"
                  onClick={() => setAngleUnit('RAD')}
                  className={`px-3 py-1 text-[11px] font-mono rounded-full transition-all cursor-pointer ${
                    angleUnit === 'RAD'
                      ? 'bg-[#2f6bff] text-white font-bold shadow'
                      : 'text-[#9ca3af] hover:text-[#f4f4f5]'
                  }`}
                >
                  RAD (π)
                </button>
              </div>
            </div>
          </div>

          {/* Quick Engineering & Scientific Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] block">
              Preset Uji Ilmiah &amp; Praktikum M12
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SCIENTIFIC_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setExpression(preset.expr);
                    setNotes(preset.note);
                    if (preset.mode) {
                      setAngleUnit(preset.mode);
                    }
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-[#101013] hover:bg-[#222227] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Multi-Line Scientific Display Screen */}
          <div className="p-4 rounded-2xl bg-[#0b0b0e] border border-white/[0.18] shadow-inner space-y-3">
            {/* Status Telemetry Row inside LCD */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-[0.08em] border-b border-white/[0.08] pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    angleUnit === 'DEG'
                      ? 'bg-[#35ff92]/15 text-[#35ff92] border border-[#35ff92]/30'
                      : 'bg-[#2f6bff]/20 text-[#6090ff] border border-[#2f6bff]/40'
                  }`}
                >
                  MODE: {angleUnit}
                </span>
                {isSecondShift && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    2ND INV
                  </span>
                )}
                {memoryValue !== 0 && (
                  <span className="px-2 py-0.5 rounded bg-white/[0.08] text-[#f4f4f5]">
                    M = {Number(memoryValue.toFixed(6))}
                  </span>
                )}
              </div>
              <span className="text-[#9ca3af] tabular-nums">
                ANS = <strong className="text-[#f4f4f5]">{ansValue}</strong>
              </span>
            </div>

            {/* Editable Expression Input */}
            <div>
              <label htmlFor="calc-expression-input" className="sr-only">
                Ekspresi Kalkulator Ilmiah
              </label>
              <input
                id="calc-expression-input"
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleEvaluateEquals();
                  }
                }}
                placeholder="Masukkan ekspresi ilmiah, misal: 340 × sin(50π × 0.01 - 0.541)"
                className="w-full bg-transparent text-[#f4f4f5] font-mono text-sm sm:text-base focus:outline-none placeholder-[#9ca3af]/40"
              />
            </div>

            {/* Primary & Secondary Scientific Readout */}
            <div className="pt-2 border-t border-white/[0.08] flex items-end justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] block">
                  HASIL PRESISI (=)
                </span>
                {evaluation.isValid && evaluation.scientificNotation && (
                  <span className="text-[11px] font-mono tabular-nums text-[#9ca3af] block">
                    Sci: {evaluation.scientificNotation}
                  </span>
                )}
              </div>

              {evaluation.isValid ? (
                <div className="flex items-center gap-2">
                  <span
                    data-testid="calc-result-display"
                    className="text-xl sm:text-2xl font-mono tabular-nums font-bold text-[#35ff92] break-all text-right"
                  >
                    {evaluation.formattedResult}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyResult}
                    title="Salin hasil"
                    className="p-1.5 rounded-lg bg-[#18181c] hover:bg-[#222227] text-[#9ca3af] hover:text-[#f4f4f5] border border-white/[0.12] transition-colors cursor-pointer"
                  >
                    {copiedResult ? (
                      <Check className="w-3.5 h-3.5 text-[#35ff92]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-xs font-mono text-red-400 text-right">
                  {evaluation.error || 'Ekspresi belum lengkap'}
                </span>
              )}
            </div>
          </div>

          {/* Memory Register Bar (MC, MR, M+, M-, Ans) */}
          <div className="grid grid-cols-5 gap-1.5 print:hidden">
            <button
              type="button"
              onClick={handleMemoryClear}
              disabled={memoryValue === 0}
              className="py-1.5 rounded-xl font-mono text-xs bg-[#101013] hover:bg-[#222227] text-[#9ca3af] hover:text-[#f4f4f5] border border-white/[0.1] disabled:opacity-40 transition-all cursor-pointer"
            >
              MC
            </button>
            <button
              type="button"
              onClick={handleMemoryRecall}
              className="py-1.5 rounded-xl font-mono text-xs bg-[#101013] hover:bg-[#222227] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.1] transition-all cursor-pointer"
            >
              MR
            </button>
            <button
              type="button"
              onClick={handleMemoryAdd}
              className="py-1.5 rounded-xl font-mono text-xs bg-[#101013] hover:bg-[#222227] text-[#c4c9cf] hover:text-[#35ff92] border border-white/[0.1] transition-all cursor-pointer"
            >
              M+
            </button>
            <button
              type="button"
              onClick={handleMemorySubtract}
              className="py-1.5 rounded-xl font-mono text-xs bg-[#101013] hover:bg-[#222227] text-[#c4c9cf] hover:text-red-300 border border-white/[0.1] transition-all cursor-pointer"
            >
              M-
            </button>
            <button
              type="button"
              onClick={() => appendToken('Ans')}
              className="py-1.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#35ff92] border border-white/[0.14] transition-all cursor-pointer"
            >
              Ans
            </button>
          </div>

          {/* 5-Column Modern Scientific Keypad */}
          <div className="grid grid-cols-5 gap-2 pt-0.5 print:hidden">
            {/* Row 1: 2nd, sin/asin, cos/acos, tan/atan, sinh/cosh */}
            <button
              type="button"
              onClick={() => setIsSecondShift((v) => !v)}
              className={`py-2.5 rounded-xl font-mono text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
                isSecondShift
                  ? 'bg-amber-400 text-[#171515] border-amber-300 shadow'
                  : 'bg-[#222227] text-amber-300 border-white/[0.16] hover:bg-[#2c2c33]'
              }`}
            >
              2nd
            </button>
            <button
              type="button"
              onClick={() => appendToken(isSecondShift ? 'asin(' : 'sin(')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              {isSecondShift ? 'sin⁻¹' : 'sin'}
            </button>
            <button
              type="button"
              onClick={() => appendToken(isSecondShift ? 'acos(' : 'cos(')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              {isSecondShift ? 'cos⁻¹' : 'cos'}
            </button>
            <button
              type="button"
              onClick={() => appendToken(isSecondShift ? 'atan(' : 'tan(')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              {isSecondShift ? 'tan⁻¹' : 'tan'}
            </button>
            <button
              type="button"
              onClick={() =>
                setAngleUnit((prev) => (prev === 'DEG' ? 'RAD' : 'DEG'))
              }
              className="py-2.5 rounded-xl font-mono text-xs font-bold bg-[#18181c] hover:bg-[#222227] text-[#35ff92] border border-[#35ff92]/30 transition-all active:scale-95 cursor-pointer"
            >
              {angleUnit}
            </button>

            {/* Row 2: ln/exp, log/10^x, x²/x³, x^y, √/∛ */}
            <button
              type="button"
              onClick={() => appendToken(isSecondShift ? 'exp(' : 'ln(')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              {isSecondShift ? 'eˣ' : 'ln'}
            </button>
            <button
              type="button"
              onClick={() => appendToken(isSecondShift ? '10^(' : 'log(')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              {isSecondShift ? '10ˣ' : 'log'}
            </button>
            <button
              type="button"
              onClick={() => appendToken(isSecondShift ? '³' : '²')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              {isSecondShift ? 'x³' : 'x²'}
            </button>
            <button
              type="button"
              onClick={() => appendToken('^')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              xʸ
            </button>
            <button
              type="button"
              onClick={() => appendToken(isSecondShift ? '∛(' : '√(')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              {isSecondShift ? '∛x' : '√x'}
            </button>

            {/* Row 3: π, e, n!, 1/x, |x| */}
            <button
              type="button"
              onClick={() => appendToken('π')}
              className="py-2.5 rounded-xl font-mono text-xs font-bold bg-[#222227] hover:bg-[#2c2c33] text-[#35ff92] border border-white/[0.16] transition-all active:scale-95 cursor-pointer"
            >
              π
            </button>
            <button
              type="button"
              onClick={() => appendToken('e')}
              className="py-2.5 rounded-xl font-mono text-xs font-bold bg-[#222227] hover:bg-[#2c2c33] text-[#35ff92] border border-white/[0.16] transition-all active:scale-95 cursor-pointer"
            >
              e
            </button>
            <button
              type="button"
              onClick={() => appendToken('!')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              n!
            </button>
            <button
              type="button"
              onClick={() => appendToken('^(-1)')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              1/x
            </button>
            <button
              type="button"
              onClick={() => appendToken('abs(')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              |x|
            </button>

            {/* Row 4: (, ), rad/deg, C, ⌫ */}
            <button
              type="button"
              onClick={() => appendToken('(')}
              className="py-2.5 rounded-xl font-mono text-sm bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              (
            </button>
            <button
              type="button"
              onClick={() => appendToken(')')}
              className="py-2.5 rounded-xl font-mono text-sm bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              )
            </button>
            <button
              type="button"
              onClick={() => appendToken(isSecondShift ? 'deg(' : 'rad(')}
              title="Konversi derajat ke radian rad(x) atau radian ke derajat deg(x)"
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              {isSecondShift ? 'deg(' : 'rad('}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="py-2.5 rounded-xl font-mono text-xs font-bold bg-[#2a1a1d] hover:bg-red-950/70 text-red-300 border border-red-500/30 transition-all active:scale-95 cursor-pointer"
            >
              AC
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-2.5 rounded-xl font-mono text-sm bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              ⌫
            </button>

            {/* Row 5: 7, 8, 9, ÷, mod */}
            {['7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => appendToken(d)}
                className="py-2.5 rounded-xl font-mono text-sm font-semibold bg-[#101013] hover:bg-[#222227] text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => appendToken(' ÷ ')}
              className="py-2.5 rounded-xl font-mono text-sm font-bold bg-[#222227] hover:bg-[#2c2c33] text-[#6090ff] border border-white/[0.16] transition-all active:scale-95 cursor-pointer"
            >
              ÷
            </button>
            <button
              type="button"
              onClick={() => appendToken(' mod ')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              mod
            </button>

            {/* Row 6: 4, 5, 6, ×, % */}
            {['4', '5', '6'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => appendToken(d)}
                className="py-2.5 rounded-xl font-mono text-sm font-semibold bg-[#101013] hover:bg-[#222227] text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => appendToken(' × ')}
              className="py-2.5 rounded-xl font-mono text-sm font-bold bg-[#222227] hover:bg-[#2c2c33] text-[#6090ff] border border-white/[0.16] transition-all active:scale-95 cursor-pointer"
            >
              ×
            </button>
            <button
              type="button"
              onClick={() => appendToken('%')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              %
            </button>

            {/* Row 7: 1, 2, 3, -, ± */}
            {['1', '2', '3'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => appendToken(d)}
                className="py-2.5 rounded-xl font-mono text-sm font-semibold bg-[#101013] hover:bg-[#222227] text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => appendToken(' - ')}
              className="py-2.5 rounded-xl font-mono text-sm font-bold bg-[#222227] hover:bg-[#2c2c33] text-[#6090ff] border border-white/[0.16] transition-all active:scale-95 cursor-pointer"
            >
              -
            </button>
            <button
              type="button"
              onClick={() =>
                setExpression((prev) =>
                  prev.startsWith('-(') && prev.endsWith(')')
                    ? prev.slice(2, -1)
                    : prev
                    ? `-(${prev})`
                    : '-'
                )
              }
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              ±
            </button>

            {/* Row 8: 0, ., EXP (×10^), +, = */}
            <button
              type="button"
              onClick={() => appendToken('0')}
              className="py-2.5 rounded-xl font-mono text-sm font-semibold bg-[#101013] hover:bg-[#222227] text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => appendToken('.')}
              className="py-2.5 rounded-xl font-mono text-sm font-bold bg-[#101013] hover:bg-[#222227] text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              .
            </button>
            <button
              type="button"
              onClick={() => appendToken(' × 10^')}
              className="py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-all active:scale-95 cursor-pointer"
            >
              ×10ˣ
            </button>
            <button
              type="button"
              onClick={() => appendToken(' + ')}
              className="py-2.5 rounded-xl font-mono text-sm font-bold bg-[#222227] hover:bg-[#2c2c33] text-[#6090ff] border border-white/[0.16] transition-all active:scale-95 cursor-pointer"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleEvaluateEquals}
              disabled={!evaluation.isValid}
              title="Evaluasi & simpan ke Ans"
              className="py-2.5 rounded-xl font-mono text-sm font-bold bg-[#35ff92] hover:bg-[#4bff9f] text-[#171515] border border-[#35ff92] disabled:opacity-40 transition-all active:scale-95 cursor-pointer shadow"
            >
              =
            </button>
          </div>

          {/* Note Input & Save to Log Button */}
          <div className="space-y-3 pt-2 border-t border-white/[0.12]">
            <div>
              <label
                htmlFor="calc-note-input"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                Catatan Perhitungan Ilmiah
              </label>
              <input
                id="calc-note-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Tegangan sesaat saat t = 10 ms"
                className="cafe-input w-full px-3.5 py-2 text-xs rounded-xl placeholder-[#9ca3af]/40"
              />
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
        </div>

        {/* Scientific Calculator Log & Unified Persistence Toolbar (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
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
                [LOG PERHITUNGAN SCIENTIFIC CALCULATOR]
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
                    <th className="py-3 px-4">Ekspresi Ilmiah</th>
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
                        Belum ada riwayat perhitungan disimpan. Masukkan ekspresi ilmiah dan klik &quot;Save Hasil Kalkulator&quot;.
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
