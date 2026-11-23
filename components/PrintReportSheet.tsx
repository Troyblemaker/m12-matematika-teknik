'use client';

import React, { useMemo } from 'react';
import { solveSinusoidal } from '@/lib/math-engine';
import {
  AngleLogEntry,
  ArithmeticLogEntry,
  NavigationTab,
  SinusoidalInputParams,
  StudentIdentity,
  WaveformLogEntry,
} from '@/lib/types';

interface PrintReportSheetProps {
  activeTab: NavigationTab;
  student: StudentIdentity;
  sinusoidalParams: SinusoidalInputParams;
  angleLogs: AngleLogEntry[];
  waveformLogs: WaveformLogEntry[];
  arithmeticLogs: ArithmeticLogEntry[];
}

/**
 * Formats a number using Indonesian comma decimal notation (e.g. 314.16 -> "314,16")
 */
function fmtComma(val: number, decimals: number): string {
  if (!Number.isFinite(val)) return '-';
  return val.toFixed(decimals).replace('.', ',');
}

function fmtCommaStr(raw: string): string {
  return raw.replace(/\./g, ',');
}

function Frac({
  top,
  bottom,
}: {
  top: React.ReactNode;
  bottom: React.ReactNode;
}) {
  return (
    <span className="inline-flex flex-col items-center align-middle mx-1 leading-none">
      <span className="border-b border-slate-700 px-1 pb-0.5 text-[7.5px]">
        {top}
      </span>
      <span className="px-1 pt-0.5 text-[7.5px]">{bottom}</span>
    </span>
  );
}

export default function PrintReportSheet({
  activeTab,
  student,
  sinusoidalParams,
  angleLogs,
  waveformLogs,
  arithmeticLogs,
}: PrintReportSheetProps) {
  const analysis = useMemo(
    () => solveSinusoidal(sinusoidalParams),
    [sinusoidalParams]
  );

  // Generate 1 full cycle (plus small 5% margin) for the dark oscilloscope sketch in Tab 3
  const oneCyclePoints = useMemo(() => {
    if (!analysis.isValid || analysis.periodS <= 0) return [];
    const maxSec = 1.05 * analysis.periodS;
    const steps = 220;
    const pts: { tMs: number; vRef: number; vMeasured: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const tSec = (i / steps) * maxSec;
      const tMs = tSec * 1000;
      const argRef = analysis.omegaRad * tSec;
      const argMeas = analysis.omegaRad * tSec + analysis.phiRadSigned;
      const vRef =
        analysis.waveType === 'cos'
          ? analysis.amplitude * Math.cos(argRef)
          : analysis.amplitude * Math.sin(argRef);
      const vMeasured =
        analysis.waveType === 'cos'
          ? analysis.amplitude * Math.cos(argMeas)
          : analysis.amplitude * Math.sin(argMeas);
      pts.push({ tMs, vRef, vMeasured });
    }
    return pts;
  }, [analysis]);

  const modeCounts = useMemo(() => {
    const a = angleLogs.filter((l) => l.mode === 'Mode A').length;
    const b = angleLogs.filter((l) => l.mode === 'Mode B').length;
    const c = angleLogs.filter((l) => l.mode === 'Mode C').length;
    return { a, b, c, total: angleLogs.length };
  }, [angleLogs]);

  // Dark Oscilloscope Sketch SVG coordinates (matches screenshot)
  const svgW = 540;
  const svgH = 215;
  const padL = 46;
  const padR = 32;
  const padT = 22;
  const padB = 22;
  const innerW = svgW - padL - padR;
  const innerH = svgH - padT - padB;

  const maxTimeMs = analysis.isValid ? 1.05 * analysis.periodMs : 21;
  const yLimit = analysis.isValid ? 1.22 * analysis.amplitude : 6;

  const mapX = (tMs: number) =>
    padL + (maxTimeMs > 0 ? (tMs / maxTimeMs) * innerW : 0);
  const mapY = (v: number) =>
    padT + innerH / 2 - (yLimit > 0 ? (v / yLimit) * (innerH / 2) : 0);

  const zeroY = mapY(0);

  const refPath = useMemo(() => {
    if (oneCyclePoints.length === 0) return '';
    return oneCyclePoints
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${mapX(pt.tMs).toFixed(1)} ${mapY(pt.vRef).toFixed(1)}`
      )
      .join(' ');
  }, [oneCyclePoints, maxTimeMs, yLimit]);

  const measuredPath = useMemo(() => {
    if (oneCyclePoints.length === 0) return '';
    return oneCyclePoints
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${mapX(pt.tMs).toFixed(1)} ${mapY(pt.vMeasured).toFixed(1)}`
      )
      .join(' ');
  }, [oneCyclePoints, maxTimeMs, yLimit]);

  const varName = analysis.quantityType === 'i' ? 'i' : 'v';
  const unitSymbol = analysis.unitSymbol;
  const unitFullName = analysis.quantityType === 'i' ? 'Ampere' : 'Volt';
  const quantityName = analysis.quantityName;

  const shortPhaseName =
    analysis.phaseSign === '+' && analysis.phiRadUnsigned > 1e-12
      ? 'Leading'
      : analysis.phaseSign === '-' && analysis.phiRadUnsigned > 1e-12
      ? 'Lagging'
      : 'In Phase';

  const signSelectLabel =
    analysis.phaseSign === '-'
      ? 'Minus (-) → Lagging'
      : analysis.phaseSign === '+'
      ? 'Plus (+) → Leading'
      : 'Nol (0) → In Phase';

  const statusNarrative =
    analysis.phaseSign === '-' && analysis.phiRadUnsigned > 1e-12
      ? `Gelombang tertinggal sebesar ${fmtComma(analysis.phiDegUnsigned, 2)}° (${fmtCommaStr(analysis.phiDmsFormatted)} | ${fmtComma(analysis.phiRadSigned, 3)} rad).`
      : analysis.phaseSign === '+' && analysis.phiRadUnsigned > 1e-12
      ? `Gelombang mendahului sebesar +${fmtComma(analysis.phiDegUnsigned, 2)}° (+${fmtCommaStr(analysis.phiDmsFormatted)} | +${fmtComma(analysis.phiRadSigned, 3)} rad).`
      : 'Gelombang sefase dengan acuan standar (0,00° | 0 rad).';

  const displayEquationComma = fmtCommaStr(analysis.equation);

  // Ensure the log table in Tab 3 always shows at least the current simulation row if user hasn't clicked save yet
  const effectiveWaveformLogs = useMemo(() => {
    if (waveformLogs.length > 0) return waveformLogs;
    if (!analysis.isValid) return [];
    const signPrefix =
      analysis.phaseSign === '+'
        ? '+'
        : analysis.phaseSign === '-'
        ? '-'
        : '';
    return [
      {
        id: 'current-sim',
        timestamp: '-',
        questionLabel: analysis.questionLabel,
        quantityType: analysis.quantityType,
        amplitude: analysis.amplitude,
        omegaInput: analysis.omegaInput,
        omegaRad: analysis.omegaRad,
        waveType: analysis.waveType,
        phaseSign: analysis.phaseSign,
        phiInput: analysis.phiInput,
        phiRad: analysis.phiRadSigned,
        phiDeg: analysis.phiDegSigned,
        phiFormatted: `${signPrefix}${fmtComma(analysis.phiRadUnsigned, 3)} (${signPrefix}${fmtComma(analysis.phiDegUnsigned, 2)}°)`,
        tUjiMs: analysis.tUjiMs,
        vAtTuji: analysis.vAtTuji,
        vTarget: analysis.vTarget,
        periodS: analysis.periodS,
        periodMs: analysis.periodMs,
        frequencyHz: analysis.frequencyHz,
        vAtZero: analysis.vAtZero,
        vAt10ms: analysis.vAt10ms,
        tAtTargetFormatted: analysis.tAtTargetFormatted,
        tAtMaxMs: analysis.tAtMaxMs,
        equation: analysis.equation,
        phaseStatus: analysis.phaseStatusBanner,
      },
    ];
  }, [waveformLogs, analysis]);

  const displayStudent = {
    nama: student.nama.trim() || 'M.Roihan',
    nim: student.nim.trim() || '3.32.26.2.20',
    kelas: student.kelas.trim() || 'EK-1C',
    prodi: (student.prodi ?? '').trim() || 'D3 Teknik Elektronika',
    jurusan: (student.jurusan ?? '').trim() || 'Teknik Elektro',
  };

  return (
    <div className="hidden print-only-a4 text-slate-900 bg-[#f8fafc] font-sans">
      {/* ====================================================================
          TOP HEADER BAR (Matches Screenshot: Matematika Teknik (M12) + POLINES Pill)
         ==================================================================== */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3.5 py-1.5 rounded-t-xl mb-1.5">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
            Matematika Teknik (M12)
          </h1>
          <p className="text-[8.5px] text-slate-500">
            Angle Conversion (Deg/Rad/DMS) &amp; Sinusoidal Waveform Simulator
          </p>
        </div>

        <div className="border border-slate-300 rounded-full px-3 py-1 text-[8.5px] font-bold text-slate-800 bg-white shadow-sm">
          D3 Teknik Elektronika • POLINES
        </div>
      </div>

      {/* ====================================================================
          MODULE BANNER & 5-COLUMN STUDENT IDENTITY CARD
         ==================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 mb-1.5 shadow-sm">
        <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-1 mb-1.5">
          <div>
            <div className="text-[7.5px] font-extrabold uppercase tracking-wider text-cyan-600">
              D3 TEKNIK ELEKTRONIKA • MODUL PRAKTIKUM M12
            </div>
            <h2 className="text-xs font-extrabold text-slate-900 leading-snug">
              {activeTab === 'sinusoidal' &&
                'Simulator Gelombang Sinusoidal & Analisis AC'}
              {activeTab === 'konversi' &&
                'Kalkulator Konversi Satuan Sudut (Derajat Desimal, Radian & DMS)'}
              {activeTab === 'tujuan' &&
                'Tujuan Pembelajaran, Referensi Rumus & Scientific Calculator'}
            </h2>
          </div>
          <p className="text-[8px] text-slate-500 text-right max-w-xl">
            {activeTab === 'sinusoidal' &&
              'Visualisasi bentuk gelombang tegangan/arus sinusoidal 1 siklus penuh beserta analisis parameter fisis dan sudut fase (Leading / In Phase / Lagging).'}
            {activeTab === 'konversi' &&
              'Konversi satuan sudut dua arah (Hub-and-Spoke) antara Derajat Desimal (°), Radian Desimal & Simbolik (π rad), serta Komponen DMS (° \' ").'}
            {activeTab === 'tujuan' &&
              'Referensi konsep konversi satuan sudut, beda fase gelombang AC, serta log perhitungan Scientific Calculator presisi 50-digit Decimal.js.'}
          </p>
        </div>

        <div className="text-[7.5px] font-extrabold uppercase tracking-wider text-cyan-600 mb-1">
          IDENTITAS PRAKTIKUM MAHASISWA
        </div>

        <div className="grid grid-cols-5 gap-2 text-[8.5px]">
          <div>
            <div className="text-[7.5px] font-semibold text-slate-600 mb-0.5">
              Nama Mahasiswa
            </div>
            <div className="border border-slate-200 rounded-md px-2 py-1 bg-slate-50/60 font-medium text-slate-900 truncate">
              {displayStudent.nama}
            </div>
          </div>
          <div>
            <div className="text-[7.5px] font-semibold text-slate-600 mb-0.5">
              NIM
            </div>
            <div className="border border-slate-200 rounded-md px-2 py-1 bg-slate-50/60 font-medium text-slate-900 truncate">
              {displayStudent.nim}
            </div>
          </div>
          <div>
            <div className="text-[7.5px] font-semibold text-slate-600 mb-0.5">
              Kelas
            </div>
            <div className="border border-slate-200 rounded-md px-2 py-1 bg-slate-50/60 font-medium text-slate-900 truncate">
              {displayStudent.kelas}
            </div>
          </div>
          <div>
            <div className="text-[7.5px] font-semibold text-slate-600 mb-0.5">
              Program Studi (Prodi)
            </div>
            <div className="border border-slate-200 rounded-md px-2 py-1 bg-slate-50/60 font-medium text-slate-900 truncate">
              {displayStudent.prodi}
            </div>
          </div>
          <div>
            <div className="text-[7.5px] font-semibold text-slate-600 mb-0.5">
              Jurusan
            </div>
            <div className="border border-slate-200 rounded-md px-2 py-1 bg-slate-50/60 font-medium text-slate-900 truncate">
              {displayStudent.jurusan}
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          TAB 3 A4 LANDSCAPE SHEET: MATCHES UPLOADED PDF DESIGN IN LANDSCAPE
         ==================================================================== */}
      {activeTab === 'sinusoidal' && (
        <div className="space-y-1.5 break-inside-avoid">
          {/* 3-Column Widescreen Main Section */}
          <div className="grid grid-cols-12 gap-2 items-stretch">
            {/* COLUMN 1 (3 cols): Input Parameter Gelombang */}
            <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
              <div className="space-y-1.5">
                <div className="border-b-2 border-cyan-600 pb-1">
                  <h3 className="text-[10px] font-extrabold text-slate-900">
                    Input Parameter Gelombang
                  </h3>
                </div>

                <div className="text-[7px] font-extrabold uppercase tracking-wider text-cyan-600 pt-0.5">
                  1. IDENTITAS &amp; BENTUK PERSAMAAN
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[8px]">
                  <div>
                    <div className="text-[7px] text-slate-500 font-semibold mb-0.5">
                      No. / Ket. Soal
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-semibold text-slate-900 truncate">
                      {analysis.questionLabel}
                    </div>
                  </div>
                  <div>
                    <div className="text-[7px] text-slate-500 font-semibold mb-0.5">
                      Besaran AC
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-semibold text-slate-900 truncate">
                      {quantityName} — {varName}(t) [{unitFullName}]
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[8px]">
                  <div>
                    <div className="text-[7px] text-slate-500 font-semibold mb-0.5">
                      Amplitudo A ({unitFullName})
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-semibold text-slate-900">
                      {analysis.amplitude}
                    </div>
                  </div>
                  <div>
                    <div className="text-[7px] text-slate-500 font-semibold mb-0.5">
                      ω (rad/s) [notasi π]
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-semibold text-slate-900">
                      {analysis.omegaInput}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-right font-mono text-[7.5px] font-semibold text-slate-700">
                  {fmtComma(analysis.omegaRad, 1)} rad/s | f ={' '}
                  {fmtComma(analysis.frequencyHz, 2)} Hz
                </div>

                <div className="text-[8px]">
                  <div className="text-[7px] text-slate-500 font-semibold mb-0.5">
                    Fungsi Gelombang
                  </div>
                  <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-semibold text-slate-900">
                    {analysis.waveType === 'cos' ? 'Cosinus' : 'Sinus'} —{' '}
                    {varName}(t) = A {analysis.waveType}(ωt ± φ)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[8px]">
                  <div>
                    <div className="text-[7px] text-slate-500 font-semibold mb-0.5">
                      Tanda Fase (Sign)
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-semibold text-slate-900 truncate">
                      {signSelectLabel}
                    </div>
                  </div>
                  <div>
                    <div className="text-[7px] text-slate-500 font-semibold mb-0.5">
                      Besar Sudut Fase |φ| (rad)
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-semibold text-slate-900">
                      {analysis.phiRadUnsigned}
                    </div>
                  </div>
                </div>

                <div className="text-[7px] font-extrabold uppercase tracking-wider text-cyan-600 pt-1 border-t border-slate-100">
                  2. PARAMETER UJI POIN (C) &amp; (D)
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[8px]">
                  <div>
                    <div className="text-[7px] text-slate-500 font-semibold mb-0.5">
                      Waktu Uji t_uji (ms) [c]
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-semibold text-slate-900">
                      {analysis.tUjiMs}
                    </div>
                  </div>
                  <div>
                    <div className="text-[7px] text-slate-500 font-semibold mb-0.5">
                      Target {varName}_target ({unitSymbol}) [d]
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-semibold text-slate-900">
                      {analysis.vTarget}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Box */}
              <div className="mt-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50/70">
                <div className="text-[8.5px] font-extrabold text-slate-900 uppercase">
                  STATUS: {analysis.phaseStatusLabel}
                </div>
                <div className="text-[7.5px] text-slate-600 leading-snug mt-0.5">
                  {statusNarrative}
                </div>
              </div>
            </div>

            {/* COLUMN 2 (5 cols): Dark Oscilloscope Sketch + Hasil Analisis Jawaban Soal */}
            <div className="col-span-5 flex flex-col justify-between gap-1.5">
              {/* Top Card: Sketsa Gelombang Sinusoidal (1 Cycle Waveform) */}
              <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                  <h3 className="text-[9.5px] font-extrabold text-slate-900">
                    Sketsa Gelombang Sinusoidal (1 Cycle Waveform)
                  </h3>
                  <span className="border border-slate-300 rounded-md px-2 py-0.5 font-mono text-[8px] font-bold text-slate-900 bg-slate-50">
                    {displayEquationComma}
                  </span>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-[7.5px] text-slate-600 mb-1 px-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-cyan-400 inline-block" />
                    <span>Gelombang Terukur {varName}(t)</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-0.5 border-b border-dashed border-slate-400 inline-block" />
                    <span>Acuan Standar (φ = 0)</span>
                  </span>
                </div>

                {/* Dark Navy/Black Oscilloscope Canvas (Exact style from screenshot) */}
                <div className="rounded-lg bg-[#0b111e] p-1 border border-slate-800">
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
                    {/* Subtle Horizontal Gridlines */}
                    {[-1, -0.5, 0, 0.5, 1].map((f) => (
                      <line
                        key={`h-${f}`}
                        x1={padL}
                        y1={mapY(f * analysis.amplitude)}
                        x2={svgW - padR}
                        y2={mapY(f * analysis.amplitude)}
                        stroke="rgba(148, 163, 184, 0.12)"
                        strokeWidth={0.8}
                      />
                    ))}

                    {/* Subtle Vertical Quarter-Cycle Gridlines */}
                    {[0.25, 0.5, 0.75, 1.0].map((frac) => (
                      <line
                        key={`v-${frac}`}
                        x1={mapX(frac * analysis.periodMs)}
                        y1={padT}
                        x2={mapX(frac * analysis.periodMs)}
                        y2={svgH - padB}
                        stroke="rgba(148, 163, 184, 0.12)"
                        strokeWidth={0.8}
                      />
                    ))}

                    {/* Main Y Axis (at t = 0) with Top Arrow */}
                    <line
                      x1={padL}
                      y1={svgH - padB + 4}
                      x2={padL}
                      y2={padT - 6}
                      stroke="#94a3b8"
                      strokeWidth={1.2}
                    />
                    <polygon
                      points={`${padL},${padT - 10} ${padL - 3},${padT - 4} ${padL + 3},${padT - 4}`}
                      fill="#94a3b8"
                    />
                    <text
                      x={padL}
                      y={padT - 12}
                      textAnchor="middle"
                      className="fill-slate-200 font-mono text-[8px] font-bold"
                    >
                      {quantityName} {varName}
                    </text>

                    {/* Main X Axis (at y = 0) with Right Arrow */}
                    <line
                      x1={padL - 4}
                      y1={zeroY}
                      x2={svgW - padR + 8}
                      y2={zeroY}
                      stroke="#94a3b8"
                      strokeWidth={1.2}
                    />
                    <polygon
                      points={`${svgW - padR + 12},${zeroY} ${svgW - padR + 6},${zeroY - 3} ${svgW - padR + 6},${zeroY + 3}`}
                      fill="#94a3b8"
                    />
                    <text
                      x={svgW - padR + 10}
                      y={zeroY - 6}
                      textAnchor="end"
                      className="fill-slate-200 font-mono text-[8px] font-bold"
                    >
                      t (ms)
                    </text>

                    {/* Y-Axis Tick Labels: +A, 0, -A */}
                    <text
                      x={padL - 6}
                      y={mapY(analysis.amplitude) + 3}
                      textAnchor="end"
                      className="fill-slate-300 font-mono text-[8px]"
                    >
                      {fmtComma(analysis.amplitude, 1)}
                    </text>
                    <line
                      x1={padL - 3}
                      y1={mapY(analysis.amplitude)}
                      x2={padL + 3}
                      y2={mapY(analysis.amplitude)}
                      stroke="#94a3b8"
                      strokeWidth={1}
                    />

                    <text
                      x={padL - 6}
                      y={zeroY + 3}
                      textAnchor="end"
                      className="fill-slate-400 font-mono text-[8px]"
                    >
                      0
                    </text>

                    <text
                      x={padL - 6}
                      y={mapY(-analysis.amplitude) + 3}
                      textAnchor="end"
                      className="fill-slate-300 font-mono text-[8px]"
                    >
                      {fmtComma(-analysis.amplitude, 1)}
                    </text>
                    <line
                      x1={padL - 3}
                      y1={mapY(-analysis.amplitude)}
                      x2={padL + 3}
                      y2={mapY(-analysis.amplitude)}
                      stroke="#94a3b8"
                      strokeWidth={1}
                    />

                    {/* X-Axis Quarter-Cycle Tick Labels (e.g. 5, 10, 15, 20 ms) */}
                    {[0.25, 0.5, 0.75, 1.0].map((frac) => {
                      const tVal = frac * analysis.periodMs;
                      const x = mapX(tVal);
                      return (
                        <g key={`xtick-${frac}`}>
                          <line
                            x1={x}
                            y1={zeroY - 3}
                            x2={x}
                            y2={zeroY + 3}
                            stroke="#94a3b8"
                            strokeWidth={1}
                          />
                          <text
                            x={x}
                            y={zeroY + 12}
                            textAnchor="middle"
                            className="fill-slate-400 font-mono text-[7.5px]"
                          >
                            {Number(tVal.toFixed(1))}
                          </text>
                        </g>
                      );
                    })}

                    {/* Reference Standard Wave (Dashed Gray) */}
                    <path
                      d={refPath}
                      fill="none"
                      stroke="#64748b"
                      strokeWidth={1.4}
                      strokeDasharray="5 4"
                    />

                    {/* Measured Phase-Shifted Wave (Solid Cyan) */}
                    <path
                      d={measuredPath}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth={2.2}
                    />

                    {/* Curve Labels inside Canvas */}
                    <text
                      x={mapX(0.22 * analysis.periodMs)}
                      y={mapY(0.48 * analysis.amplitude)}
                      className="fill-slate-400 font-mono text-[7.5px]"
                    >
                      {varName} = {analysis.amplitude} {analysis.waveType}{' '}
                      {analysis.omegaInput}t
                    </text>
                    <text
                      x={mapX(0.12 * analysis.periodMs)}
                      y={mapY(analysis.amplitude) - 6}
                      className="fill-cyan-300 font-mono text-[8px] font-bold"
                    >
                      {displayEquationComma.replace(` ${unitSymbol}`, '')}
                    </text>

                    {/* 1. Point (b): t = 0 (Orange Marker & Y-axis Label) */}
                    <circle
                      cx={padL}
                      cy={mapY(analysis.vAtZero)}
                      r={3}
                      fill="#fb923c"
                    />
                    <text
                      x={padL - 6}
                      y={mapY(analysis.vAtZero) + 3}
                      textAnchor="end"
                      className="fill-amber-400 font-mono text-[8px] font-bold"
                    >
                      {fmtComma(analysis.vAtZero, 1)}
                    </text>

                    {/* 2. Point (d): First Target Crossing (Emerald Green Dashed Drop-Lines & Label) */}
                    {analysis.tAtTargetMs !== null &&
                      analysis.tAtTargetMs <= maxTimeMs && (
                        <g>
                          <line
                            x1={padL}
                            y1={mapY(analysis.vTarget)}
                            x2={mapX(analysis.tAtTargetMs)}
                            y2={mapY(analysis.vTarget)}
                            stroke="#34d399"
                            strokeWidth={1}
                            strokeDasharray="3 3"
                          />
                          <line
                            x1={mapX(analysis.tAtTargetMs)}
                            y1={mapY(analysis.vTarget)}
                            x2={mapX(analysis.tAtTargetMs)}
                            y2={zeroY}
                            stroke="#34d399"
                            strokeWidth={1}
                            strokeDasharray="3 3"
                          />
                          <circle
                            cx={mapX(analysis.tAtTargetMs)}
                            cy={mapY(analysis.vTarget)}
                            r={2.8}
                            fill="#34d399"
                          />
                          <text
                            x={padL - 6}
                            y={mapY(analysis.vTarget) + 3}
                            textAnchor="end"
                            className="fill-emerald-400 font-mono text-[8px] font-bold"
                          >
                            {fmtComma(analysis.vTarget, 1)}
                          </text>
                          <text
                            x={mapX(analysis.tAtTargetMs)}
                            y={zeroY + 19}
                            textAnchor="middle"
                            className="fill-emerald-400 font-mono text-[7.5px] font-bold"
                          >
                            ↑ {fmtComma(analysis.tAtTargetMs, 3)}
                          </text>
                        </g>
                      )}

                    {/* 3. Point (e): First Maximum Peak (Pink/Magenta Dashed Drop-Lines & Label) */}
                    {analysis.tAtMaxMs <= maxTimeMs && (
                      <g>
                        <line
                          x1={padL}
                          y1={mapY(analysis.amplitude)}
                          x2={mapX(analysis.tAtMaxMs)}
                          y2={mapY(analysis.amplitude)}
                          stroke="#f472b6"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                        />
                        <line
                          x1={mapX(analysis.tAtMaxMs)}
                          y1={mapY(analysis.amplitude)}
                          x2={mapX(analysis.tAtMaxMs)}
                          y2={zeroY}
                          stroke="#f472b6"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                        />
                        <circle
                          cx={mapX(analysis.tAtMaxMs)}
                          cy={mapY(analysis.amplitude)}
                          r={3}
                          fill="#f472b6"
                        />
                        <text
                          x={mapX(analysis.tAtMaxMs)}
                          y={zeroY + 19}
                          textAnchor="middle"
                          className="fill-pink-400 font-mono text-[7.5px] font-bold"
                        >
                          ↑ {fmtComma(analysis.tAtMaxMs, 3)}
                        </text>
                      </g>
                    )}

                    {/* 4. Point (c): Test Time t_uji (Cyan Dashed Drop-Lines & Y-axis Label) */}
                    {analysis.tUjiMs <= maxTimeMs && (
                      <g>
                        <line
                          x1={padL}
                          y1={mapY(analysis.vAtTuji)}
                          x2={mapX(analysis.tUjiMs)}
                          y2={mapY(analysis.vAtTuji)}
                          stroke="#38bdf8"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                        />
                        <line
                          x1={mapX(analysis.tUjiMs)}
                          y1={mapY(analysis.vAtTuji)}
                          x2={mapX(analysis.tUjiMs)}
                          y2={zeroY}
                          stroke="#38bdf8"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                        />
                        <circle
                          cx={mapX(analysis.tUjiMs)}
                          cy={mapY(analysis.vAtTuji)}
                          r={2.8}
                          fill="#38bdf8"
                        />
                        <text
                          x={padL - 6}
                          y={mapY(analysis.vAtTuji) + 3}
                          textAnchor="end"
                          className="fill-cyan-300 font-mono text-[8px] font-bold"
                        >
                          {fmtComma(analysis.vAtTuji, 1)}
                        </text>
                      </g>
                    )}
                  </svg>
                </div>
              </div>

              {/* Bottom Card: Hasil Analisis Jawaban Soal (Poin a - e) */}
              <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
                <div className="border-b-2 border-cyan-600 pb-0.5 mb-1">
                  <h3 className="text-[9.5px] font-extrabold text-slate-900">
                    Hasil Analisis Jawaban Soal (Poin a - e)
                  </h3>
                </div>

                <div className="divide-y divide-slate-100 text-[8px]">
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-600">
                      (a1) Periode (T) &amp; Frekuensi (f)
                    </span>
                    <strong className="font-mono text-slate-900">
                      {fmtComma(analysis.periodS, 4)} s (
                      {fmtComma(analysis.periodMs, 2)} ms) |{' '}
                      {fmtComma(analysis.frequencyHz, 2)} Hz
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-600">(a2) Sudut Fase (φ)</span>
                    <strong className="font-mono text-slate-900">
                      {fmtComma(analysis.phiDegSigned, 2)}° (
                      {fmtCommaStr(analysis.phiDmsFormatted)}) ({shortPhaseName})
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-600">
                      (b) {quantityName} {varName} saat t = 0
                    </span>
                    <strong className="font-mono text-slate-900">
                      {fmtComma(analysis.vAtZero, 3)} {unitSymbol}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-600">
                      (c) {quantityName} {varName} saat t = {analysis.tUjiMs} ms
                    </span>
                    <strong className="font-mono text-slate-900">
                      {fmtComma(analysis.vAtTuji, 3)} {unitSymbol}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-600">
                      (d) Waktu t saat {varName} ={' '}
                      {fmtComma(analysis.vTarget, 1)} {unitSymbol} pertama
                    </span>
                    <strong className="font-mono text-slate-900">
                      {analysis.tAtTargetMs !== null
                        ? `${fmtComma(analysis.tAtTargetMs, 3)} ms`
                        : analysis.tAtTargetFormatted}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-600">
                      (e) Waktu t saat {varName} Maksimum (+A)
                    </span>
                    <strong className="font-mono text-slate-900">
                      {fmtComma(analysis.tAtMaxMs, 3)} ms
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 3 (4 cols): Uraian Langkah Perhitungan Lengkap (4 Bagian) */}
            <div className="col-span-4 bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
              <div className="border-b-2 border-cyan-600 pb-1 mb-1.5">
                <h3 className="text-[10px] font-extrabold text-slate-900">
                  Uraian Langkah Perhitungan Lengkap (4 Bagian)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-1.5 flex-1">
                {/* Step Card 1: Poin a */}
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/40 space-y-1">
                  <div className="text-[8px] font-extrabold text-slate-900 border-b border-slate-200 pb-0.5">
                    1. Parameter Gelombang &amp; Fase (Poin a)
                  </div>
                  <div className="font-mono text-[7.5px] text-slate-800 space-y-0.5 leading-snug">
                    <div>
                      ω = {analysis.omegaInput} = {fmtComma(analysis.omegaRad, 2)}{' '}
                      rad/s
                    </div>
                    <div className="flex items-center flex-wrap">
                      <span>T =</span>
                      <Frac top="2π" bottom="ω" />
                      <span>=</span>
                      <Frac top="2π" bottom={analysis.omegaInput} />
                    </div>
                    <div className="font-bold text-slate-950 pl-2">
                      = {fmtComma(analysis.periodS, 4)} s (
                      {fmtComma(analysis.periodMs, 2)} ms)
                    </div>
                    <div className="flex items-center flex-wrap">
                      <span>f =</span>
                      <Frac top="1" bottom="T" />
                      <span>=</span>
                      <Frac top="1" bottom={fmtComma(analysis.periodS, 4)} />
                    </div>
                    <div className="font-bold text-slate-950 pl-2">
                      = {fmtComma(analysis.frequencyHz, 2)} Hz
                    </div>
                    <div className="flex items-center flex-wrap">
                      <span>
                        φ = {fmtComma(analysis.phiRadSigned, 3)} ×
                      </span>
                      <Frac top="180°" bottom="π" />
                    </div>
                    <div className="font-bold text-slate-950 pl-2">
                      = {fmtComma(analysis.phiDegSigned, 2)}° (
                      {fmtCommaStr(analysis.phiDmsFormatted)})
                    </div>
                  </div>
                </div>

                {/* Step Card 2: Poin b & c */}
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/40 space-y-1">
                  <div className="text-[8px] font-extrabold text-slate-900 border-b border-slate-200 pb-0.5">
                    2. Nilai Sesaat t = 0 &amp; t_uji (Poin b &amp; c)
                  </div>
                  <div className="font-mono text-[7.5px] text-slate-800 space-y-0.5 leading-snug">
                    <div>
                      {varName}(0) = {analysis.amplitude} {analysis.waveType}(
                      {fmtComma(analysis.omegaRad, 2)}(0){' '}
                      {analysis.phiRadSigned >= 0 ? '+' : '-'}{' '}
                      {fmtComma(analysis.phiRadUnsigned, 3)})
                    </div>
                    <div className="pl-3">
                      = {analysis.amplitude} {analysis.waveType}(
                      {fmtComma(analysis.phiRadSigned, 3)} rad)
                    </div>
                    <div className="font-bold text-slate-950 pl-3">
                      = {fmtComma(analysis.vAtZero, 3)} {unitSymbol}
                    </div>

                    <div className="pt-1 border-t border-slate-200/80">
                      {varName}({fmtComma(analysis.tUjiSec, 3)}) ={' '}
                      {analysis.amplitude} {analysis.waveType}(
                      {fmtComma(analysis.omegaRad, 2)} ×{' '}
                      {fmtComma(analysis.tUjiSec, 3)}{' '}
                      {analysis.phiRadSigned >= 0 ? '+' : '-'}{' '}
                      {fmtComma(analysis.phiRadUnsigned, 3)})
                    </div>
                    <div className="pl-3">
                      = {analysis.amplitude} {analysis.waveType}(
                      {fmtComma(
                        analysis.omegaRad * analysis.tUjiSec +
                          analysis.phiRadSigned,
                        4
                      )}{' '}
                      rad)
                    </div>
                    <div className="font-bold text-slate-950 pl-3">
                      = {fmtComma(analysis.vAtTuji, 3)} {unitSymbol}
                    </div>
                  </div>
                </div>

                {/* Step Card 3: Poin d */}
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/40 space-y-1">
                  <div className="text-[8px] font-extrabold text-slate-900 border-b border-slate-200 pb-0.5">
                    3. Waktu Target {varName} = {fmtComma(analysis.vTarget, 1)}{' '}
                    {unitSymbol} (Poin d)
                  </div>
                  {analysis.targetExceedsAmplitude ? (
                    <div className="font-mono text-[7.5px] text-red-600">
                      |Target| ({analysis.vTarget} {unitSymbol}) melebihi
                      amplitudo A ({analysis.amplitude} {unitSymbol}).
                    </div>
                  ) : (
                    (() => {
                      const ratio = analysis.vTarget / analysis.amplitude;
                      const invRad =
                        analysis.waveType === 'cos'
                          ? Math.acos(Math.max(-1, Math.min(1, ratio)))
                          : Math.asin(Math.max(-1, Math.min(1, ratio)));
                      const numerator = invRad - analysis.phiRadSigned;
                      const tSec =
                        analysis.tAtTargetMs !== null
                          ? analysis.tAtTargetMs / 1000
                          : 0;
                      return (
                        <div className="font-mono text-[7.5px] text-slate-800 space-y-0.5 leading-snug">
                          <div>
                            {analysis.amplitude} {analysis.waveType}(
                            {fmtComma(analysis.omegaRad, 2)}t{' '}
                            {analysis.phiRadSigned >= 0 ? '+' : '-'}{' '}
                            {fmtComma(analysis.phiRadUnsigned, 3)}) ={' '}
                            {fmtComma(analysis.vTarget, 1)}
                          </div>
                          <div className="flex items-center flex-wrap">
                            <span>
                              {analysis.waveType}({fmtComma(analysis.omegaRad, 2)}
                              t {analysis.phiRadSigned >= 0 ? '+' : '-'}{' '}
                              {fmtComma(analysis.phiRadUnsigned, 3)}) =
                            </span>
                            <Frac
                              top={fmtComma(analysis.vTarget, 1)}
                              bottom={analysis.amplitude}
                            />
                            <span>= {fmtComma(ratio, 4)}</span>
                          </div>
                          <div>
                            {fmtComma(analysis.omegaRad, 2)}t{' '}
                            {analysis.phiRadSigned >= 0 ? '+' : '-'}{' '}
                            {fmtComma(analysis.phiRadUnsigned, 3)} = arc
                            {analysis.waveType}({fmtComma(ratio, 4)}) ={' '}
                            {fmtComma(invRad, 4)} rad
                          </div>
                          <div className="flex items-center flex-wrap">
                            <span>t =</span>
                            <Frac
                              top={`${fmtComma(invRad, 4)} - (${fmtComma(analysis.phiRadSigned, 3)})`}
                              bottom={fmtComma(analysis.omegaRad, 2)}
                            />
                            <span>=</span>
                            <Frac
                              top={fmtComma(numerator, 4)}
                              bottom={fmtComma(analysis.omegaRad, 2)}
                            />
                          </div>
                          <div>= {fmtComma(tSec, 6)} s</div>
                          <div className="font-bold text-slate-950">
                            = {fmtComma(analysis.tAtTargetMs ?? 0, 3)} ms
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Step Card 4: Poin e */}
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/40 space-y-1">
                  <div className="text-[8px] font-extrabold text-slate-900 border-b border-slate-200 pb-0.5">
                    4. Waktu Maksimum +{analysis.amplitude} {unitSymbol} (Poin e)
                  </div>
                  {(() => {
                    const peakAngle =
                      analysis.waveType === 'cos' ? 0 : Math.PI / 2;
                    const numerator = peakAngle - analysis.phiRadSigned;
                    const tMaxSec = analysis.tAtMaxMs / 1000;
                    return (
                      <div className="font-mono text-[7.5px] text-slate-800 space-y-0.5 leading-snug">
                        <div className="flex items-center flex-wrap">
                          <span>Syarat Maksimum (+A) = sudut fase =</span>
                          {analysis.waveType === 'sin' ? (
                            <>
                              <Frac top="π" bottom="2" />
                              <span>(1,5708 rad)</span>
                            </>
                          ) : (
                            <span>0 rad</span>
                          )}
                        </div>
                        <div>
                          {fmtComma(analysis.omegaRad, 2)}t{' '}
                          {analysis.phiRadSigned >= 0 ? '+' : '-'}{' '}
                          {fmtComma(analysis.phiRadUnsigned, 3)} ={' '}
                          {fmtComma(peakAngle, 4)} rad
                        </div>
                        <div className="flex items-center flex-wrap">
                          <span>t =</span>
                          <Frac
                            top={`${fmtComma(peakAngle, 4)} - (${fmtComma(analysis.phiRadSigned, 3)})`}
                            bottom={fmtComma(analysis.omegaRad, 2)}
                          />
                        </div>
                        <div className="flex items-center flex-wrap pl-2">
                          <span>=</span>
                          <Frac
                            top={fmtComma(numerator, 4)}
                            bottom={fmtComma(analysis.omegaRad, 2)}
                          />
                        </div>
                        <div className="pl-2">= {fmtComma(tMaxSec, 6)} s</div>
                        <div className="font-bold text-slate-950 pl-2">
                          = {fmtComma(analysis.tAtMaxMs, 3)} ms
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM FULL-WIDTH CARD: Log Percobaan Gelombang Sinusoidal */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
            <div className="border-b-2 border-cyan-600 pb-0.5 mb-1 flex items-center justify-between">
              <h3 className="text-[9.5px] font-extrabold text-slate-900">
                Log Percobaan Gelombang Sinusoidal
              </h3>
              <span className="text-[7.5px] font-mono text-slate-500">
                Total: {effectiveWaveformLogs.length} Percobaan
              </span>
            </div>

            <table className="w-full border-collapse text-[8px]">
              <thead>
                <tr className="bg-slate-50 text-slate-800 border-b border-slate-200 font-bold">
                  <th className="py-1 px-2 text-left w-8">No</th>
                  <th className="py-1 px-2 text-left">No. Soal</th>
                  <th className="py-1 px-2 text-left">Besaran</th>
                  <th className="py-1 px-2 text-left">Amplitudo (A)</th>
                  <th className="py-1 px-2 text-left">ω (rad/s)</th>
                  <th className="py-1 px-2 text-left">φ (rad / °)</th>
                  <th className="py-1 px-2 text-left">Persamaan v(t) / i(t)</th>
                  <th className="py-1 px-2 text-left">Jenis Fase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {effectiveWaveformLogs.slice(0, 5).map((log, idx) => {
                  const isLag = log.phaseSign === '-';
                  const isLead = log.phaseSign === '+';
                  const unit = log.quantityType === 'i' ? 'A' : 'V';
                  const besaranLabel =
                    log.quantityType === 'i' ? 'Arus (i)' : 'Tegangan (v)';
                  const signStr = isLag ? '-' : isLead ? '+' : '';
                  const phiDisplay =
                    log.phaseSign === '0'
                      ? '0 (0,00°)'
                      : `${signStr}${fmtComma(Math.abs(log.phiRad), 3)} (${signStr}${fmtComma(Math.abs(log.phiDeg), 2)}°)`;

                  return (
                    <tr key={log.id}>
                      <td className="py-1 px-2 text-slate-700">{idx + 1}</td>
                      <td className="py-1 px-2 font-medium text-slate-900">
                        {log.questionLabel || 'PE 118 NO 7 H.256'}
                      </td>
                      <td className="py-1 px-2 text-slate-700">
                        {besaranLabel}
                      </td>
                      <td className="py-1 px-2 text-slate-900">
                        {log.amplitude} {unit}
                      </td>
                      <td className="py-1 px-2 font-mono text-slate-900">
                        {log.omegaInput}
                      </td>
                      <td className="py-1 px-2 font-mono text-slate-800">
                        {phiDisplay}
                      </td>
                      <td className="py-1 px-2 font-mono font-semibold text-slate-900">
                        {fmtCommaStr(log.equation)}
                      </td>
                      <td className="py-1 px-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[7.5px] font-bold ${
                            isLag
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isLead
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {isLag
                            ? 'Lagging (-)'
                            : isLead
                            ? 'Leading (+)'
                            : 'In Phase (0)'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2 A4 LANDSCAPE SHEET: KONVERSI SATUAN SUDUT
         ==================================================================== */}
      {activeTab === 'konversi' && (
        <div className="space-y-2 break-inside-avoid">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-7 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm">
              <div className="text-[7.5px] font-extrabold uppercase tracking-wider text-cyan-600 mb-1">
                RUMUS KONVERSI SATUAN SUDUT (HUB-AND-SPOKE)
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[8.5px] text-slate-800">
                <div>• rad_dec = deg × (π / 180°)</div>
                <div>• rad_π = (deg / 180°)π rad</div>
                <div>• deg = D + M/60 + S/3600</div>
                <div>• DMS: D = ⌊|deg|⌋, M = ⌊(|deg| - D) × 60⌋</div>
              </div>
            </div>

            <div className="col-span-5 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
              <div className="text-[7.5px] font-extrabold uppercase tracking-wider text-cyan-600 mb-1">
                CAPAIAN TARGET PRAKTIKUM KONVERSI SUDUT
              </div>
              <div className="grid grid-cols-4 gap-1.5 font-mono text-[9px]">
                <div className="border border-slate-200 bg-slate-50 rounded px-2 py-1 text-center">
                  <span className="text-slate-500 block text-[7.5px]">Mode A</span>
                  <strong>{modeCounts.a}/4</strong>
                </div>
                <div className="border border-slate-200 bg-slate-50 rounded px-2 py-1 text-center">
                  <span className="text-slate-500 block text-[7.5px]">Mode B</span>
                  <strong>{modeCounts.b}/4</strong>
                </div>
                <div className="border border-slate-200 bg-slate-50 rounded px-2 py-1 text-center">
                  <span className="text-slate-500 block text-[7.5px]">Mode C</span>
                  <strong>{modeCounts.c}/4</strong>
                </div>
                <div className="border border-cyan-600 bg-cyan-600 text-white rounded px-2 py-1 text-center">
                  <span className="text-cyan-100 block text-[7.5px]">Total</span>
                  <strong>{modeCounts.total}/12</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm">
            <div className="border-b-2 border-cyan-600 pb-1 mb-1.5 flex items-center justify-between">
              <h3 className="text-[10px] font-extrabold text-slate-900">
                Log Percobaan Konversi Satuan Sudut (Mode A: Derajat, Mode B: Radian, Mode C: DMS)
              </h3>
              <span className="font-mono text-[8px] text-slate-500">
                Total Data: {angleLogs.length} Baris
              </span>
            </div>

            <table className="w-full border-collapse text-[8.5px] font-mono">
              <thead>
                <tr className="bg-slate-50 text-slate-800 border-b border-slate-200">
                  <th className="py-1 px-2 text-center w-8">No</th>
                  <th className="py-1 px-2 text-left">Waktu</th>
                  <th className="py-1 px-2 text-left">Mode</th>
                  <th className="py-1 px-2 text-left">Input Awal</th>
                  <th className="py-1 px-2 text-left">Derajat Desimal (°)</th>
                  <th className="py-1 px-2 text-left">Radian Desimal (rad)</th>
                  <th className="py-1 px-2 text-left">Radian Simbolik (π)</th>
                  <th className="py-1 px-2 text-left">Komponen DMS (° &apos; &quot;)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {angleLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      Belum ada data konversi sudut yang disimpan pada Tab 2.
                    </td>
                  </tr>
                ) : (
                  angleLogs.slice(0, 16).map((log, idx) => (
                    <tr key={log.id}>
                      <td className="py-1 px-2 text-center text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 text-slate-600">{log.timestamp}</td>
                      <td className="py-1 px-2 font-semibold text-slate-900">
                        {log.mode}
                      </td>
                      <td className="py-1 px-2 font-bold text-slate-950">
                        {log.rawInput}
                      </td>
                      <td className="py-1 px-2 text-slate-900">
                        {log.degFormatted}
                      </td>
                      <td className="py-1 px-2 text-slate-700">
                        {log.radDecFormatted}
                      </td>
                      <td className="py-1 px-2 font-bold text-cyan-700">
                        {log.radPiFormatted}
                      </td>
                      <td className="py-1 px-2 text-slate-900">
                        {log.dmsFormatted}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 1 A4 LANDSCAPE SHEET: TUJUAN PEMBELAJARAN & SCIENTIFIC CALCULATOR
         ==================================================================== */}
      {activeTab === 'tujuan' && (
        <div className="space-y-2 break-inside-avoid">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm space-y-1">
              <div className="text-[7.5px] font-extrabold uppercase text-cyan-600">
                MODUL 01 • KONVERSI SATUAN SUDUT
              </div>
              <div className="text-[9.5px] font-bold text-slate-900">
                Hubungan Derajat, Radian &amp; DMS
              </div>
              <div className="font-mono text-[8px] space-y-0.5 text-slate-700">
                <div>• 1 rad = 180° / π ≈ 57,2958°</div>
                <div>• 1° = π / 180 rad ≈ 0,017453 rad</div>
                <div>• 1° = 60&apos; (menit) = 3600&quot; (detik)</div>
                <div>• Desimal = D + M/60 + S/3600</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm space-y-1">
              <div className="text-[7.5px] font-extrabold uppercase text-cyan-600">
                MODUL 02 • BEDA FASE GELOMBANG
              </div>
              <div className="text-[9.5px] font-bold text-slate-900">
                Phase Angle (Leading vs Lagging)
              </div>
              <div className="font-mono text-[8px] space-y-0.5 text-slate-700">
                <div>• In Phase (0°): y = A sin(ωt)</div>
                <div>• Leading (+φ): y = A sin(ωt + φ)</div>
                <div>• Lagging (-φ): y = A sin(ωt - φ)</div>
                <div>• φ(°) = φ(rad) × (180° / π)</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm space-y-1">
              <div className="text-[7.5px] font-extrabold uppercase text-cyan-600">
                MODUL 03 • PARAMETER SINUSOIDAL AC
              </div>
              <div className="text-[9.5px] font-bold text-slate-900">
                Periode, Frekuensi &amp; Kecepatan Sudut
              </div>
              <div className="font-mono text-[8px] space-y-0.5 text-slate-700">
                <div>• Periode: T = 2π / ω (sekon)</div>
                <div>• Frekuensi: f = 1 / T (Hz)</div>
                <div>• Kec. Sudut: ω = 2πf (rad/s)</div>
                <div>• Soal PE 118 No 7: i(t) = 5 sin(100πt - 0,432) A</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm">
            <div className="border-b-2 border-cyan-600 pb-1 mb-1.5 flex items-center justify-between">
              <h3 className="text-[10px] font-extrabold text-slate-900">
                Log Perhitungan Scientific Calculator (Presisi 50-Digit Decimal.js)
              </h3>
              <span className="font-mono text-[8px] text-slate-500">
                Total: {arithmeticLogs.length} Perhitungan
              </span>
            </div>

            <table className="w-full border-collapse text-[8.5px] font-mono">
              <thead>
                <tr className="bg-slate-50 text-slate-800 border-b border-slate-200">
                  <th className="py-1 px-2 text-center w-8">No</th>
                  <th className="py-1 px-2 text-left w-24">Waktu</th>
                  <th className="py-1 px-2 text-left">Ekspresi Ilmiah</th>
                  <th className="py-1 px-2 text-left">Hasil Presisi (Decimal.js)</th>
                  <th className="py-1 px-2 text-left">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {arithmeticLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Belum ada riwayat perhitungan Scientific Calculator yang disimpan.
                    </td>
                  </tr>
                ) : (
                  arithmeticLogs.slice(0, 14).map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-1 px-2 text-center text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 text-slate-600">{item.timestamp}</td>
                      <td className="py-1 px-2 font-semibold text-slate-900">
                        {item.expression}
                      </td>
                      <td className="py-1 px-2 font-bold text-cyan-700">
                        {item.result}
                      </td>
                      <td className="py-1 px-2 text-slate-700 font-sans">
                        {item.notes}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
