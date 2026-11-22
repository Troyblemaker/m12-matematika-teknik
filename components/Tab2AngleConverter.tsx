'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  PlusCircle,
  Target,
  Trash2,
} from 'lucide-react';
import {
  convertFromDegrees,
  convertFromDMS,
  convertFromRadians,
} from '@/lib/math-engine';
import {
  AngleConversionMode,
  AngleConversionResult,
  AngleLogEntry,
  ArithmeticLogEntry,
  StudentIdentity,
  WaveformLogEntry,
} from '@/lib/types';
import PersistenceToolbar from './PersistenceToolbar';

interface Tab2AngleConverterProps {
  student: StudentIdentity;
  angleLogs: AngleLogEntry[];
  waveformLogs: WaveformLogEntry[];
  arithmeticLogs: ArithmeticLogEntry[];
  onAddAngleLog: (entry: AngleLogEntry) => void;
  onDeleteAngleLog: (id: string) => void;
  onClearAngleLogs: () => void;
}

const MODE_B_PRESETS = ['π/6', 'π/4', 'π/3', 'π/2', '3π/4', 'π', '3π/2', '2π'];

export default function Tab2AngleConverter({
  student,
  angleLogs,
  waveformLogs,
  arithmeticLogs,
  onAddAngleLog,
  onDeleteAngleLog,
  onClearAngleLogs,
}: Tab2AngleConverterProps) {
  // Mode A State (Default: 50.145)
  const [modeAInput, setModeAInput] = useState<string>('50.145');

  // Mode B State (Default: 3π/4)
  const [modeBInput, setModeBInput] = useState<string>('3π/4');

  // Mode C State (Default: 45° 55' 7.92")
  const [modeCSign, setModeCSign] = useState<'+' | '-'>('+');
  const [modeCDeg, setModeCDeg] = useState<string>('45');
  const [modeCMin, setModeCMin] = useState<string>('55');
  const [modeCSec, setModeCSec] = useState<string>('7.92');

  // Track last active mode for the unified toolbar's "Save Hasil Percobaan" button
  const [lastActiveMode, setLastActiveMode] = useState<AngleConversionMode>('Mode A');

  // Evaluate Mode A
  const modeAEval = useMemo<{
    valid: boolean;
    data?: AngleConversionResult;
    error?: string;
  }>(() => {
    try {
      if (!modeAInput.trim()) {
        return { valid: false, error: 'Masukkan angka derajat desimal.' };
      }
      const res = convertFromDegrees(modeAInput);
      return { valid: true, data: res };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Input Mode A tidak valid',
      };
    }
  }, [modeAInput]);

  // Evaluate Mode B
  const modeBEval = useMemo<{
    valid: boolean;
    data?: AngleConversionResult;
    error?: string;
  }>(() => {
    try {
      if (!modeBInput.trim()) {
        return { valid: false, error: 'Masukkan nilai radian (misal: 3π/4 atau 0.8752).' };
      }
      const res = convertFromRadians(modeBInput);
      return { valid: true, data: res };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Input Mode B tidak valid',
      };
    }
  }, [modeBInput]);

  // Evaluate Mode C
  const modeCEval = useMemo<{
    valid: boolean;
    data?: AngleConversionResult;
    error?: string;
  }>(() => {
    try {
      const d = Number(modeCDeg.trim().replace(/,/g, '.'));
      const m = Number(modeCMin.trim().replace(/,/g, '.'));
      const s = Number(modeCSec.trim().replace(/,/g, '.'));

      if (
        !modeCDeg.trim() ||
        !modeCMin.trim() ||
        !modeCSec.trim() ||
        !Number.isFinite(d) ||
        !Number.isFinite(m) ||
        !Number.isFinite(s)
      ) {
        return { valid: false, error: 'Komponen D, M, dan S wajib berupa angka.' };
      }

      if (d < 0) {
        return {
          valid: false,
          error: 'Gunakan pemilih tanda (+/-) untuk sudut negatif dan masukkan D >= 0.',
        };
      }

      const res = convertFromDMS(Math.floor(d), m, s, modeCSign === '-');
      return { valid: true, data: res };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Input Mode C tidak valid',
      };
    }
  }, [modeCDeg, modeCMin, modeCSec, modeCSign]);

  // Practicum Target Tracker Counts
  const modeCounts = useMemo(() => {
    const a = angleLogs.filter((l) => l.mode === 'Mode A').length;
    const b = angleLogs.filter((l) => l.mode === 'Mode B').length;
    const c = angleLogs.filter((l) => l.mode === 'Mode C').length;
    return { a, b, c, total: angleLogs.length };
  }, [angleLogs]);

  const createAndSaveLog = (
    mode: AngleConversionMode,
    rawInput: string,
    result: AngleConversionResult
  ) => {
    const newEntry: AngleLogEntry = {
      id: `angle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      mode,
      rawInput,
      degValue: result.degValue,
      degFormatted: result.degFormatted,
      radDecValue: result.radDecValue,
      radDecFormatted: result.radDecFormatted,
      radPiFormatted: result.radPiFormatted,
      dmsFormatted: result.dms.formatted,
    };
    onAddAngleLog(newEntry);
  };

  const handleSaveModeA = () => {
    if (!modeAEval.valid || !modeAEval.data) return;
    setLastActiveMode('Mode A');
    createAndSaveLog('Mode A', `${modeAInput.trim()}°`, modeAEval.data);
  };

  const handleSaveModeB = () => {
    if (!modeBEval.valid || !modeBEval.data) return;
    setLastActiveMode('Mode B');
    const clean = modeBInput.trim();
    const label = clean.toLowerCase().endsWith('rad') ? clean : `${clean} rad`;
    createAndSaveLog('Mode B', label, modeBEval.data);
  };

  const handleSaveModeC = () => {
    if (!modeCEval.valid || !modeCEval.data) return;
    setLastActiveMode('Mode C');
    const prefix = modeCSign === '-' ? '-' : '';
    const label = `${prefix}${modeCDeg.trim()}° ${modeCMin.trim()}' ${modeCSec.trim()}"`;
    createAndSaveLog('Mode C', label, modeCEval.data);
  };

  const handleSaveActiveModeFromToolbar = () => {
    if (lastActiveMode === 'Mode A' && modeAEval.valid) {
      handleSaveModeA();
    } else if (lastActiveMode === 'Mode B' && modeBEval.valid) {
      handleSaveModeB();
    } else if (lastActiveMode === 'Mode C' && modeCEval.valid) {
      handleSaveModeC();
    } else if (modeAEval.valid) {
      handleSaveModeA();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Practicum Target Tracker */}
      <div className="cafe-card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
            [02 · HUB-AND-SPOKE ANGLE CONVERTER]
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-[#f4f4f5] tracking-[-0.02em] print:text-black">
            2. Kalkulator Konversi Sudut Interaktif
          </h2>
          <p className="text-xs sm:text-sm text-[#c4c9cf] print:text-zinc-600">
            Target Praktikum: Simpan minimal 4 percobaan pada masing-masing Mode A, Mode B, dan Mode C (Total 12 percobaan).
          </p>
        </div>

        {/* Live Pill Badge Counters */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#101013] border border-white/[0.14]">
            <Target className="w-3.5 h-3.5 text-[#9ca3af]" />
            <span className="text-[#9ca3af]">Mode A:</span>
            <span
              className={
                modeCounts.a >= 4 ? 'text-[#35ff92] font-bold' : 'text-[#f4f4f5] font-bold'
              }
            >
              {modeCounts.a}/4
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#101013] border border-white/[0.14]">
            <Target className="w-3.5 h-3.5 text-[#9ca3af]" />
            <span className="text-[#9ca3af]">Mode B:</span>
            <span
              className={
                modeCounts.b >= 4 ? 'text-[#35ff92] font-bold' : 'text-[#f4f4f5] font-bold'
              }
            >
              {modeCounts.b}/4
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#101013] border border-white/[0.14]">
            <Target className="w-3.5 h-3.5 text-[#9ca3af]" />
            <span className="text-[#9ca3af]">Mode C:</span>
            <span
              className={
                modeCounts.c >= 4 ? 'text-[#35ff92] font-bold' : 'text-[#f4f4f5] font-bold'
              }
            >
              {modeCounts.c}/4
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold border ${
              modeCounts.total >= 12
                ? 'bg-[#35ff92]/15 text-[#35ff92] border-[#35ff92]/40'
                : 'bg-[#f4f4f5] text-[#171515] border-[#f4f4f5]'
            }`}
          >
            <span>Total: {modeCounts.total}/12</span>
          </div>
        </div>
      </div>

      {/* Three Interactive Conversion Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================================================================
            CARD 1: MODE A (Degree Decimal °)
           ================================================================ */}
        <div className="cafe-card rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.12] pb-3.5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                  [MODE A]
                </span>
                <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] mt-0.5 print:text-black">
                  Degree Decimal (°)
                </h3>
              </div>
              <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#9ca3af]">
                DESIMAL
              </span>
            </div>

            <div>
              <label
                htmlFor="mode-a-input"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                Nilai Derajat Desimal (titik . atau koma ,)
              </label>
              <div className="relative">
                <input
                  id="mode-a-input"
                  type="text"
                  value={modeAInput}
                  onChange={(e) => {
                    setModeAInput(e.target.value);
                    setLastActiveMode('Mode A');
                  }}
                  placeholder="50.145"
                  className="cafe-input w-full px-3.5 py-2.5 pr-10 text-base font-mono tabular-nums rounded-xl"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[#9ca3af]">
                  °
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5 print:hidden">
                {['50.145', '30', '45', '-60', '120.5'].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setModeAInput(sample);
                      setLastActiveMode('Mode A');
                    }}
                    className="px-2.5 py-0.5 text-[11px] font-mono tabular-nums rounded-full bg-[#101013] hover:bg-[#222227] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer"
                  >
                    {sample}°
                  </button>
                ))}
              </div>
            </div>

            {/* Mode A Outputs */}
            {modeAEval.valid && modeAEval.data ? (
              <div className="space-y-2 pt-1">
                <OutputRow label="Derajat Desimal (°)" value={modeAEval.data.degFormatted} highlight="white" />
                <OutputRow label="Radian Desimal (rad)" value={modeAEval.data.radDecFormatted} />
                <OutputRow label="Radian Simbolik (π)" value={modeAEval.data.radPiFormatted} highlight="mint" />
                <OutputRow label="Komponen DMS (° ' &quot;)" value={modeAEval.data.dms.formatted} highlight="blue" />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#101013] border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modeAEval.error}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveModeA}
            disabled={!modeAEval.valid}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs sm:text-sm font-semibold bg-[#f4f4f5] hover:bg-white text-[#171515] disabled:opacity-40 transition-all active:scale-95 cursor-pointer print:hidden"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Save Hasil Percobaan (Mode A)</span>
          </button>
        </div>

        {/* ================================================================
            CARD 2: MODE B (Radian rad & Symbolic π)
           ================================================================ */}
        <div className="cafe-card rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.12] pb-3.5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                  [MODE B]
                </span>
                <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] mt-0.5 print:text-black">
                  Radian (rad &amp; Simbolik π)
                </h3>
              </div>
              <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#9ca3af]">
                kπ / RAD
              </span>
            </div>

            <div>
              <label
                htmlFor="mode-b-input"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                Nilai Radian (3π/4, pi/6, -pi/3, 3.14)
              </label>
              <div className="relative">
                <input
                  id="mode-b-input"
                  type="text"
                  value={modeBInput}
                  onChange={(e) => {
                    setModeBInput(e.target.value);
                    setLastActiveMode('Mode B');
                  }}
                  placeholder="3π/4"
                  className="cafe-input w-full px-3.5 py-2.5 pr-14 text-base font-mono tabular-nums rounded-xl"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#9ca3af]">
                  rad
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="mt-2.5 space-y-1.5 print:hidden">
                <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] block">
                  Preset Sudut Istimewa (π)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {MODE_B_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setModeBInput(preset);
                        setLastActiveMode('Mode B');
                      }}
                      className={`px-2.5 py-0.5 text-xs font-mono rounded-full border transition-colors cursor-pointer ${
                        modeBInput.trim() === preset
                          ? 'bg-[#f4f4f5] text-[#171515] border-[#f4f4f5] font-bold'
                          : 'bg-[#101013] hover:bg-[#222227] text-[#c4c9cf] border-white/[0.14]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mode B Outputs */}
            {modeBEval.valid && modeBEval.data ? (
              <div className="space-y-2 pt-1">
                <OutputRow label="Derajat Desimal (°)" value={modeBEval.data.degFormatted} highlight="white" />
                <OutputRow label="Radian Desimal (rad)" value={modeBEval.data.radDecFormatted} />
                <OutputRow label="Radian Simbolik (π)" value={modeBEval.data.radPiFormatted} highlight="mint" />
                <OutputRow label="Komponen DMS (° ' &quot;)" value={modeBEval.data.dms.formatted} highlight="blue" />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#101013] border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modeBEval.error}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveModeB}
            disabled={!modeBEval.valid}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs sm:text-sm font-semibold bg-[#f4f4f5] hover:bg-white text-[#171515] disabled:opacity-40 transition-all active:scale-95 cursor-pointer print:hidden"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Save Hasil Percobaan (Mode B)</span>
          </button>
        </div>

        {/* ================================================================
            CARD 3: MODE C (Komponen DMS ° ' ")
           ================================================================ */}
        <div className="cafe-card rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.12] pb-3.5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                  [MODE C]
                </span>
                <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] mt-0.5 print:text-black">
                  Komponen DMS (° &apos; &quot;)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#9ca3af]">
                M∈[0,59] S∈[0,60)
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                  Komponen D, M, S
                </span>
                <div className="inline-flex rounded-full bg-[#101013] p-0.5 border border-white/[0.14]">
                  <button
                    type="button"
                    onClick={() => {
                      setModeCSign('+');
                      setLastActiveMode('Mode C');
                    }}
                    className={`px-2.5 py-0.5 text-[11px] font-mono rounded-full transition-colors cursor-pointer ${
                      modeCSign === '+'
                        ? 'bg-[#f4f4f5] text-[#171515] font-bold'
                        : 'text-[#9ca3af]'
                    }`}
                  >
                    + Pos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModeCSign('-');
                      setLastActiveMode('Mode C');
                    }}
                    className={`px-2.5 py-0.5 text-[11px] font-mono rounded-full transition-colors cursor-pointer ${
                      modeCSign === '-'
                        ? 'bg-[#f4f4f5] text-[#171515] font-bold'
                        : 'text-[#9ca3af]'
                    }`}
                  >
                    - Neg
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="dms-d" className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#9ca3af] mb-1">
                    Deg D (°)
                  </label>
                  <input
                    id="dms-d"
                    type="number"
                    min="0"
                    step="1"
                    value={modeCDeg}
                    onChange={(e) => {
                      setModeCDeg(e.target.value);
                      setLastActiveMode('Mode C');
                    }}
                    className="cafe-input w-full px-2.5 py-2 text-sm font-mono tabular-nums rounded-xl"
                  />
                </div>

                <div>
                  <label htmlFor="dms-m" className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#9ca3af] mb-1">
                    Min M (&apos;)
                  </label>
                  <input
                    id="dms-m"
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    value={modeCMin}
                    onChange={(e) => {
                      setModeCMin(e.target.value);
                      setLastActiveMode('Mode C');
                    }}
                    className="cafe-input w-full px-2.5 py-2 text-sm font-mono tabular-nums rounded-xl"
                  />
                </div>

                <div>
                  <label htmlFor="dms-s" className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#9ca3af] mb-1">
                    Sec S (&quot;)
                  </label>
                  <input
                    id="dms-s"
                    type="number"
                    min="0"
                    max="59.99"
                    step="0.01"
                    value={modeCSec}
                    onChange={(e) => {
                      setModeCSec(e.target.value);
                      setLastActiveMode('Mode C');
                    }}
                    className="cafe-input w-full px-2.5 py-2 text-sm font-mono tabular-nums rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 print:hidden">
                {[
                  { label: '45° 55\' 7.92"', d: '45', m: '55', s: '7.92', sign: '+' as const },
                  { label: '50° 8\' 42.00"', d: '50', m: '8', s: '42', sign: '+' as const },
                  { label: '-30° 15\' 30"', d: '30', m: '15', s: '30', sign: '-' as const },
                ].map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      setModeCDeg(sample.d);
                      setModeCMin(sample.m);
                      setModeCSec(sample.s);
                      setModeCSign(sample.sign);
                      setLastActiveMode('Mode C');
                    }}
                    className="px-2.5 py-0.5 text-[11px] font-mono tabular-nums rounded-full bg-[#101013] hover:bg-[#222227] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode C Outputs */}
            {modeCEval.valid && modeCEval.data ? (
              <div className="space-y-2 pt-1">
                <OutputRow label="Derajat Desimal (°)" value={modeCEval.data.degFormatted} highlight="white" />
                <OutputRow label="Radian Desimal (rad)" value={modeCEval.data.radDecFormatted} />
                <OutputRow label="Radian Simbolik (π)" value={modeCEval.data.radPiFormatted} highlight="mint" />
                <OutputRow label="Komponen DMS (° ' &quot;)" value={modeCEval.data.dms.formatted} highlight="blue" />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#101013] border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modeCEval.error}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveModeC}
            disabled={!modeCEval.valid}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs sm:text-sm font-semibold bg-[#f4f4f5] hover:bg-white text-[#171515] disabled:opacity-40 transition-all active:scale-95 cursor-pointer print:hidden"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Save Hasil Percobaan (Mode C)</span>
          </button>
        </div>
      </div>

      {/* Unified Persistence & Export Bar + Practicum Log Table */}
      <div className="space-y-4">
        <PersistenceToolbar
          student={student}
          angleLogs={angleLogs}
          waveformLogs={waveformLogs}
          arithmeticLogs={arithmeticLogs}
          onSaveTrial={handleSaveActiveModeFromToolbar}
          saveButtonLabel={`Save Hasil Percobaan (${lastActiveMode})`}
          onClearCurrentLog={onClearAngleLogs}
          clearButtonLabel="Clear Log Konversi Sudut"
        />

        <div className="cafe-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.12] flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-[0.08em] text-[#f4f4f5]">
              [TABEL LOG PRAKTIKUM KONVERSI SUDUT]
            </span>
            <span className="text-xs font-mono tabular-nums text-[#9ca3af]">
              TOTAL: {angleLogs.length} / 12
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#101013] text-[#9ca3af] font-mono text-[11px] uppercase tracking-[0.06em] border-b border-white/[0.12]">
                  <th className="py-3 px-3.5 text-center w-12">No</th>
                  <th className="py-3 px-3.5">Waktu</th>
                  <th className="py-3 px-3.5">Mode</th>
                  <th className="py-3 px-3.5">Input</th>
                  <th className="py-3 px-3.5">Derajat (°)</th>
                  <th className="py-3 px-3.5">Radian (rad)</th>
                  <th className="py-3 px-3.5">Radian (π)</th>
                  <th className="py-3 px-3.5">DMS</th>
                  <th className="py-3 px-3.5 text-center print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {angleLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-10 px-4 text-center text-[#9ca3af] font-mono text-xs"
                    >
                      Belum ada data konversi sudut yang disimpan. Klik tombol &quot;Save Hasil Percobaan&quot; pada salah satu kartu di atas.
                    </td>
                  </tr>
                ) : (
                  angleLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3 px-3.5 font-mono tabular-nums text-center text-[#9ca3af]">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-xs text-[#9ca3af]">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-[0.04em] rounded-full bg-[#222227] text-[#f4f4f5] border border-white/[0.14]">
                          {log.mode}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums font-semibold text-[#f4f4f5]">
                        {log.rawInput}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-[#f4f4f5]">
                        {log.degFormatted}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-[#c4c9cf]">
                        {log.radDecFormatted}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums font-semibold text-[#35ff92]">
                        {log.radPiFormatted}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-[#f4f4f5]">
                        {log.dmsFormatted}
                      </td>
                      <td className="py-3 px-3.5 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => onDeleteAngleLog(log.id)}
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
  );
}

function OutputRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'white' | 'mint' | 'blue';
}) {
  const colorClass =
    highlight === 'mint'
      ? 'text-[#35ff92] font-bold'
      : highlight === 'blue'
      ? 'text-[#f4f4f5] font-bold'
      : highlight === 'white'
      ? 'text-[#f4f4f5] font-bold'
      : 'text-[#c4c9cf] font-medium';

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#101013] border border-white/[0.12]">
      <span className="text-xs text-[#9ca3af]">{label}</span>
      <span className={`font-mono tabular-nums text-xs sm:text-sm ${colorClass}`}>
        {value}
      </span>
    </div>
  );
}
