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
      <span className="border-b border-slate-700 px-1 pb-0.5 text-[7px]">
        {top}
      </span>
      <span className="px-1 pt-0.5 text-[7px]">{bottom}</span>
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

  // Generate 1 full cycle (plus 5% margin) with high resolution (320 points) for smooth hero curve
  const oneCyclePoints = useMemo(() => {
    if (!analysis.isValid || analysis.periodS <= 0) return [];
    const maxSec = 1.05 * analysis.periodS;
    const steps = 320;
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

  // ==========================================================================
  // HERO OSCILLOSCOPE SVG DIMENSIONS (Large, Spacious & Easy to Read)
  // ==========================================================================
  const svgW = 860;
  const svgH = 350;
  const padL = 74;
  const padR = 46;
  const padT = 36;
  const padB = 46;
  const innerW = svgW - padL - padR;
  const innerH = svgH - padT - padB;

  const maxTimeMs = analysis.isValid ? 1.05 * analysis.periodMs : 21;
  const yLimit = analysis.isValid ? 1.24 * analysis.amplitude : 6;

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
          `${i === 0 ? 'M' : 'L'} ${mapX(pt.tMs).toFixed(2)} ${mapY(pt.vRef).toFixed(2)}`
      )
      .join(' ');
  }, [oneCyclePoints, maxTimeMs, yLimit]);

  const measuredPath = useMemo(() => {
    if (oneCyclePoints.length === 0) return '';
    return oneCyclePoints
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${mapX(pt.tMs).toFixed(2)} ${mapY(pt.vMeasured).toFixed(2)}`
      )
      .join(' ');
  }, [oneCyclePoints, maxTimeMs, yLimit]);

  const measuredAreaPath = useMemo(() => {
    if (oneCyclePoints.length === 0) return '';
    const firstX = mapX(oneCyclePoints[0].tMs).toFixed(2);
    const lastX = mapX(
      oneCyclePoints[oneCyclePoints.length - 1].tMs
    ).toFixed(2);
    return `${measuredPath} L ${lastX} ${zeroY.toFixed(2)} L ${firstX} ${zeroY.toFixed(2)} Z`;
  }, [measuredPath, oneCyclePoints, zeroY]);

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

  // De-collide Y-axis dynamic labels so they never overlap with +A, 0, -A or each other
  const yAxisDynamicLabels = useMemo(() => {
    if (!analysis.isValid) return [];
    const fixedYs = [
      mapY(analysis.amplitude),
      zeroY,
      mapY(-analysis.amplitude),
    ];
    const items: {
      id: string;
      val: number;
      rawY: number;
      adjY: number;
      text: string;
      color: string;
    }[] = [
      {
        id: 'v0',
        val: analysis.vAtZero,
        rawY: mapY(analysis.vAtZero),
        adjY: mapY(analysis.vAtZero),
        text: fmtComma(analysis.vAtZero, 1),
        color: '#fbbf24', // amber-400
      },
    ];

    if (
      analysis.tAtTargetMs !== null &&
      analysis.tAtTargetMs <= maxTimeMs &&
      Math.abs(analysis.vTarget) <= analysis.amplitude
    ) {
      items.push({
        id: 'vtarget',
        val: analysis.vTarget,
        rawY: mapY(analysis.vTarget),
        adjY: mapY(analysis.vTarget),
        text: fmtComma(analysis.vTarget, 1),
        color: '#34d399', // emerald-400
      });
    }

    if (analysis.tUjiMs <= maxTimeMs) {
      items.push({
        id: 'vtuji',
        val: analysis.vAtTuji,
        rawY: mapY(analysis.vAtTuji),
        adjY: mapY(analysis.vAtTuji),
        text: fmtComma(analysis.vAtTuji, 1),
        color: '#38bdf8', // sky-400
      });
    }

    // Sort top-to-bottom (increasing Y) and nudge if too close (< 13px) to fixed ticks or previous labels
    items.sort((a, b) => a.rawY - b.rawY);
    const occupiedYs = [...fixedYs];
    for (const item of items) {
      let y = item.rawY;
      for (const occ of occupiedYs) {
        if (Math.abs(y - occ) < 12) {
          y = y >= occ ? occ + 12.5 : occ - 12.5;
        }
      }
      item.adjY = y;
      occupiedYs.push(y);
    }
    return items;
  }, [analysis, maxTimeMs, yLimit]);

  // Ensure the log table in Tab 3 always shows at least the current simulation row
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
          TOP COMPACT HEADER & 5-COLUMN STUDENT IDENTITY BAR
         ==================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 mb-1.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">
                Matematika Teknik (M12)
              </h1>
              <p className="text-[7.5px] text-slate-500 mt-0.5">
                Angle Conversion (Deg/Rad/DMS) &amp; Sinusoidal Waveform Simulator
              </p>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <div className="text-[7px] font-extrabold uppercase tracking-wider text-cyan-600 leading-none">
                D3 TEKNIK ELEKTRONIKA • MODUL PRAKTIKUM M12
              </div>
              <div className="text-[10.5px] font-extrabold text-slate-900 leading-tight">
                {activeTab === 'sinusoidal' &&
                  'Simulator Gelombang Sinusoidal & Analisis AC'}
                {activeTab === 'konversi' &&
                  'Kalkulator Konversi Satuan Sudut (Derajat Desimal, Radian & DMS)'}
                {activeTab === 'tujuan' &&
                  'Tujuan Pembelajaran, Referensi Rumus & Scientific Calculator'}
              </div>
            </div>
          </div>

          <div className="border border-slate-300 rounded-full px-3 py-0.5 text-[8px] font-bold text-slate-800 bg-slate-50">
            D3 Teknik Elektronika • POLINES
          </div>
        </div>

        {/* 5-Column Student Identity Row */}
        <div className="grid grid-cols-5 gap-2 text-[8px]">
          <div className="flex items-center gap-1.5 border border-slate-200 rounded px-2 py-0.5 bg-slate-50/70">
            <span className="text-[7px] font-semibold text-slate-500 shrink-0">
              Nama:
            </span>
            <strong className="text-slate-900 truncate">
              {displayStudent.nama}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded px-2 py-0.5 bg-slate-50/70">
            <span className="text-[7px] font-semibold text-slate-500 shrink-0">
              NIM:
            </span>
            <strong className="font-mono text-slate-900 truncate">
              {displayStudent.nim}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded px-2 py-0.5 bg-slate-50/70">
            <span className="text-[7px] font-semibold text-slate-500 shrink-0">
              Kelas:
            </span>
            <strong className="font-mono text-slate-900 truncate">
              {displayStudent.kelas}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded px-2 py-0.5 bg-slate-50/70">
            <span className="text-[7px] font-semibold text-slate-500 shrink-0">
              Prodi:
            </span>
            <strong className="text-slate-900 truncate">
              {displayStudent.prodi}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded px-2 py-0.5 bg-slate-50/70">
            <span className="text-[7px] font-semibold text-slate-500 shrink-0">
              Jurusan:
            </span>
            <strong className="text-slate-900 truncate">
              {displayStudent.jurusan}
            </strong>
          </div>
        </div>
      </div>

      {/* ====================================================================
          TAB 3 A4 LANDSCAPE SHEET: HERO GRAPH CENTERPIECE LAYOUT
         ==================================================================== */}
      {activeTab === 'sinusoidal' && (
        <div className="space-y-1.5 break-inside-avoid">
          {/* TIER 1: HERO OSCILLOSCOPE GRAPH (7 cols / ~58% width) flanked by Input (2 cols) & Analisis (3 cols) */}
          <div className="grid grid-cols-12 gap-2 items-stretch">
            {/* LEFT (2 cols): Compact Input Parameter Gelombang */}
            <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-2 flex flex-col justify-between shadow-sm">
              <div className="space-y-1">
                <div className="border-b-2 border-cyan-600 pb-0.5">
                  <h3 className="text-[9px] font-extrabold text-slate-900">
                    Input Parameter
                  </h3>
                </div>

                <div className="text-[6.5px] font-extrabold uppercase tracking-wider text-cyan-600">
                  1. IDENTITAS PERSAMAAN
                </div>

                <div className="space-y-1 text-[7.5px]">
                  <div>
                    <div className="text-[6.5px] text-slate-500 font-semibold">
                      No. / Ket. Soal
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50/60 font-bold text-slate-900 truncate">
                      {analysis.questionLabel}
                    </div>
                  </div>

                  <div>
                    <div className="text-[6.5px] text-slate-500 font-semibold">
                      Besaran AC
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50/60 font-semibold text-slate-900 truncate">
                      {quantityName} — {varName}(t) [{unitSymbol}]
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <div className="text-[6.5px] text-slate-500 font-semibold">
                        Amplitudo A
                      </div>
                      <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-bold text-slate-900">
                        {analysis.amplitude} {unitSymbol}
                      </div>
                    </div>
                    <div>
                      <div className="text-[6.5px] text-slate-500 font-semibold">
                        ω [notasi π]
                      </div>
                      <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-bold text-slate-900">
                        {analysis.omegaInput}
                      </div>
                    </div>
                  </div>

                  <div className="bg-cyan-50/70 border border-cyan-200 rounded px-1.5 py-0.5 text-center font-mono text-[7px] font-bold text-cyan-900">
                    {fmtComma(analysis.omegaRad, 1)} rad/s | f ={' '}
                    {fmtComma(analysis.frequencyHz, 1)} Hz
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <div className="text-[6.5px] text-slate-500 font-semibold">
                        Tanda Fase
                      </div>
                      <div className="border border-slate-200 rounded px-1 py-0.5 bg-white font-semibold text-slate-900 truncate">
                        {shortPhaseName} ({analysis.phaseSign})
                      </div>
                    </div>
                    <div>
                      <div className="text-[6.5px] text-slate-500 font-semibold">
                        |φ| (rad)
                      </div>
                      <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-bold text-slate-900">
                        {analysis.phiRadUnsigned}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[6.5px] font-extrabold uppercase tracking-wider text-cyan-600 pt-0.5 border-t border-slate-100">
                  2. PARAMETER UJI (C &amp; D)
                </div>

                <div className="grid grid-cols-2 gap-1 text-[7.5px]">
                  <div>
                    <div className="text-[6.5px] text-slate-500 font-semibold">
                      t_uji (ms) [c]
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-bold text-slate-900">
                      {analysis.tUjiMs} ms
                    </div>
                  </div>
                  <div>
                    <div className="text-[6.5px] text-slate-500 font-semibold">
                      {varName}_target [d]
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-bold text-slate-900">
                      {analysis.vTarget} {unitSymbol}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Box */}
              <div className="mt-1 border border-slate-300 rounded-lg p-1.5 bg-slate-50">
                <div className="text-[7.5px] font-extrabold text-slate-900 uppercase leading-tight">
                  STATUS: {analysis.phaseStatusLabel}
                </div>
                <div className="text-[6.8px] text-slate-600 leading-tight mt-0.5">
                  {statusNarrative}
                </div>
              </div>
            </div>

            {/* ==============================================================
                CENTER HERO (7 cols / ~58% Page Width):
                SKETSA GELOMBANG SINUSOIDAL (MAIN VISUAL FOCUS)
               ============================================================== */}
            <div className="col-span-7 bg-white border-2 border-cyan-600/80 rounded-xl p-2.5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-[11px] font-extrabold text-slate-900 tracking-tight">
                    Sketsa Gelombang Sinusoidal (1 Cycle Waveform)
                  </h3>
                  <div className="flex items-center gap-3 text-[8px] text-slate-600">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                      <span className="w-4 h-0.5 bg-cyan-400 inline-block" />
                      <span>Gelombang Terukur {varName}(t)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 h-0.5 border-b-2 border-dashed border-slate-400 inline-block" />
                      <span>Acuan Standar (φ = 0)</span>
                    </span>
                  </div>
                </div>

                <span className="border border-cyan-600/40 rounded-md px-2.5 py-0.5 font-mono text-[9.5px] font-extrabold text-slate-950 bg-cyan-50/60">
                  {displayEquationComma}
                </span>
              </div>

              {/* LARGE DARK OSCILLOSCOPE CANVAS */}
              <div className="rounded-xl bg-[#0b111e] p-1.5 border border-slate-800 flex-1 flex items-center">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-auto"
                >
                  <defs>
                    <linearGradient
                      id="printHeroWaveGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#22d3ee"
                        stopOpacity="0.18"
                      />
                      <stop
                        offset="50%"
                        stopColor="#22d3ee"
                        stopOpacity="0.02"
                      />
                      <stop
                        offset="100%"
                        stopColor="#22d3ee"
                        stopOpacity="0.18"
                      />
                    </linearGradient>
                  </defs>

                  {/* Minor & Major Horizontal Graticule Gridlines */}
                  {[-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].map((f) => {
                    const isMajor = f === -1 || f === -0.5 || f === 0 || f === 0.5 || f === 1;
                    return (
                      <line
                        key={`h-${f}`}
                        x1={padL}
                        y1={mapY(f * analysis.amplitude)}
                        x2={svgW - padR}
                        y2={mapY(f * analysis.amplitude)}
                        stroke={
                          isMajor
                            ? 'rgba(148, 163, 184, 0.16)'
                            : 'rgba(148, 163, 184, 0.07)'
                        }
                        strokeWidth={isMajor ? 1 : 0.7}
                      />
                    );
                  })}

                  {/* Minor & Major Vertical Graticule Gridlines */}
                  {[0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0].map(
                    (frac) => {
                      const isQuarter =
                        frac === 0.25 ||
                        frac === 0.5 ||
                        frac === 0.75 ||
                        frac === 1.0;
                      return (
                        <line
                          key={`v-${frac}`}
                          x1={mapX(frac * analysis.periodMs)}
                          y1={padT}
                          x2={mapX(frac * analysis.periodMs)}
                          y2={svgH - padB}
                          stroke={
                            isQuarter
                              ? 'rgba(148, 163, 184, 0.18)'
                              : 'rgba(148, 163, 184, 0.08)'
                          }
                          strokeWidth={isQuarter ? 1 : 0.7}
                        />
                      );
                    }
                  )}

                  {/* Main Y Axis (at t = 0) with Top Arrow */}
                  <line
                    x1={padL}
                    y1={svgH - padB + 8}
                    x2={padL}
                    y2={padT - 10}
                    stroke="#cbd5e1"
                    strokeWidth={1.6}
                  />
                  <polygon
                    points={`${padL},${padT - 16} ${padL - 4},${padT - 8} ${padL + 4},${padT - 8}`}
                    fill="#cbd5e1"
                  />
                  <text
                    x={padL + 6}
                    y={padT - 14}
                    textAnchor="start"
                    className="fill-white font-mono text-[12px] font-bold"
                  >
                    {quantityName} {varName} ({unitSymbol})
                  </text>

                  {/* Main X Axis (at y = 0) with Right Arrow */}
                  <line
                    x1={padL - 6}
                    y1={zeroY}
                    x2={svgW - padR + 12}
                    y2={zeroY}
                    stroke="#cbd5e1"
                    strokeWidth={1.6}
                  />
                  <polygon
                    points={`${svgW - padR + 18},${zeroY} ${svgW - padR + 10},${zeroY - 4} ${svgW - padR + 10},${zeroY + 4}`}
                    fill="#cbd5e1"
                  />
                  <text
                    x={svgW - padR + 16}
                    y={zeroY - 10}
                    textAnchor="end"
                    className="fill-white font-mono text-[12px] font-bold"
                  >
                    t (ms)
                  </text>

                  {/* Fixed Y-Axis Tick Labels: +A, 0, -A */}
                  <g>
                    <line
                      x1={padL - 5}
                      y1={mapY(analysis.amplitude)}
                      x2={padL + 5}
                      y2={mapY(analysis.amplitude)}
                      stroke="#cbd5e1"
                      strokeWidth={1.4}
                    />
                    <text
                      x={padL - 10}
                      y={mapY(analysis.amplitude) + 4}
                      textAnchor="end"
                      className="fill-white font-mono text-[11.5px] font-bold"
                    >
                      {fmtComma(analysis.amplitude, 1)}
                    </text>

                    <text
                      x={padL - 10}
                      y={zeroY + 4}
                      textAnchor="end"
                      className="fill-slate-300 font-mono text-[11px] font-bold"
                    >
                      0
                    </text>

                    <line
                      x1={padL - 5}
                      y1={mapY(-analysis.amplitude)}
                      x2={padL + 5}
                      y2={mapY(-analysis.amplitude)}
                      stroke="#cbd5e1"
                      strokeWidth={1.4}
                    />
                    <text
                      x={padL - 10}
                      y={mapY(-analysis.amplitude) + 4}
                      textAnchor="end"
                      className="fill-white font-mono text-[11.5px] font-bold"
                    >
                      {fmtComma(-analysis.amplitude, 1)}
                    </text>
                  </g>

                  {/* De-collided Dynamic Y-Axis Labels (v0, v_target, v_tuji) */}
                  {yAxisDynamicLabels.map((lbl) => (
                    <g key={lbl.id}>
                      <line
                        x1={padL - 4}
                        y1={lbl.rawY}
                        x2={padL + 4}
                        y2={lbl.rawY}
                        stroke={lbl.color}
                        strokeWidth={1.4}
                      />
                      <text
                        x={padL - 10}
                        y={lbl.adjY + 4}
                        textAnchor="end"
                        fill={lbl.color}
                        className="font-mono text-[11.5px] font-bold"
                      >
                        {lbl.text}
                      </text>
                    </g>
                  ))}

                  {/* X-Axis Quarter-Cycle Tick Labels (e.g. 5, 10, 15, 20 ms) */}
                  {[0.25, 0.5, 0.75, 1.0].map((frac) => {
                    const tVal = frac * analysis.periodMs;
                    const x = mapX(tVal);
                    return (
                      <g key={`xtick-${frac}`}>
                        <line
                          x1={x}
                          y1={zeroY - 4}
                          x2={x}
                          y2={zeroY + 4}
                          stroke="#cbd5e1"
                          strokeWidth={1.4}
                        />
                        <rect
                          x={x - 16}
                          y={zeroY + 6}
                          width={32}
                          height={15}
                          rx={3}
                          fill="rgba(11, 17, 30, 0.85)"
                        />
                        <text
                          x={x}
                          y={zeroY + 17}
                          textAnchor="middle"
                          className="fill-slate-300 font-mono text-[11px] font-semibold"
                        >
                          {Number(tVal.toFixed(1))}
                        </text>
                      </g>
                    );
                  })}

                  {/* Subtle Area Fill under Measured Wave */}
                  <path d={measuredAreaPath} fill="url(#printHeroWaveGrad)" />

                  {/* Reference Standard Wave (Dashed Light Slate) */}
                  <path
                    d={refPath}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="7 5"
                  />

                  {/* Measured Phase-Shifted Wave (Bold Glowing Cyan) */}
                  <path
                    d={measuredPath}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth={3.2}
                  />

                  {/* Reference Equation Label Pill inside Canvas */}
                  <g>
                    <rect
                      x={mapX(0.54 * analysis.periodMs)}
                      y={mapY(-0.52 * analysis.amplitude) - 11}
                      width={165}
                      height={18}
                      rx={4}
                      fill="rgba(15, 23, 42, 0.88)"
                      stroke="rgba(148, 163, 184, 0.35)"
                    />
                    <text
                      x={mapX(0.54 * analysis.periodMs) + 8}
                      y={mapY(-0.52 * analysis.amplitude) + 2}
                      className="fill-slate-300 font-mono text-[10.5px]"
                    >
                      Acuan: {varName} = {analysis.amplitude}{' '}
                      {analysis.waveType}({analysis.omegaInput}t)
                    </text>
                  </g>

                  {/* Measured Wave Equation Label Pill near Peak */}
                  <g>
                    <rect
                      x={padL + 14}
                      y={padT + 4}
                      width={235}
                      height={20}
                      rx={5}
                      fill="rgba(8, 51, 68, 0.92)"
                      stroke="#22d3ee"
                      strokeWidth={1}
                    />
                    <text
                      x={padL + 24}
                      y={padT + 18}
                      className="fill-cyan-300 font-mono text-[11.5px] font-bold"
                    >
                      {displayEquationComma}
                    </text>
                  </g>

                  {/* 1. Point (b): t = 0 (Orange Dot) */}
                  <circle
                    cx={padL}
                    cy={mapY(analysis.vAtZero)}
                    r={5}
                    fill="#fb923c"
                    stroke="#0b111e"
                    strokeWidth={1.8}
                  />

                  {/* 2. Point (d): First Target Crossing (Emerald Green Dashed Lines & Pill Badge) */}
                  {analysis.tAtTargetMs !== null &&
                    analysis.tAtTargetMs <= maxTimeMs && (
                      <g>
                        <line
                          x1={padL}
                          y1={mapY(analysis.vTarget)}
                          x2={mapX(analysis.tAtTargetMs)}
                          y2={mapY(analysis.vTarget)}
                          stroke="#34d399"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                        />
                        <line
                          x1={mapX(analysis.tAtTargetMs)}
                          y1={mapY(analysis.vTarget)}
                          x2={mapX(analysis.tAtTargetMs)}
                          y2={zeroY}
                          stroke="#34d399"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                        />
                        <circle
                          cx={mapX(analysis.tAtTargetMs)}
                          cy={mapY(analysis.vTarget)}
                          r={4.8}
                          fill="#34d399"
                          stroke="#0b111e"
                          strokeWidth={1.8}
                        />
                        {/* High-contrast time badge below axis */}
                        <rect
                          x={mapX(analysis.tAtTargetMs) - 34}
                          y={zeroY + 22}
                          width={68}
                          height={18}
                          rx={4}
                          fill="#064e3b"
                          stroke="#34d399"
                          strokeWidth={1}
                        />
                        <text
                          x={mapX(analysis.tAtTargetMs)}
                          y={zeroY + 34}
                          textAnchor="middle"
                          className="fill-emerald-300 font-mono text-[10.5px] font-bold"
                        >
                          ↑ {fmtComma(analysis.tAtTargetMs, 3)}
                        </text>
                      </g>
                    )}

                  {/* 3. Point (e): First Maximum Peak (Pink/Magenta Dashed Lines & Pill Badge) */}
                  {analysis.tAtMaxMs <= maxTimeMs && (
                    <g>
                      <line
                        x1={padL}
                        y1={mapY(analysis.amplitude)}
                        x2={mapX(analysis.tAtMaxMs)}
                        y2={mapY(analysis.amplitude)}
                        stroke="#f472b6"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />
                      <line
                        x1={mapX(analysis.tAtMaxMs)}
                        y1={mapY(analysis.amplitude)}
                        x2={mapX(analysis.tAtMaxMs)}
                        y2={zeroY}
                        stroke="#f472b6"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />
                      <circle
                        cx={mapX(analysis.tAtMaxMs)}
                        cy={mapY(analysis.amplitude)}
                        r={5}
                        fill="#f472b6"
                        stroke="#0b111e"
                        strokeWidth={1.8}
                      />
                      {/* High-contrast time badge below axis */}
                      <rect
                        x={mapX(analysis.tAtMaxMs) - 34}
                        y={
                          analysis.tAtTargetMs !== null &&
                          Math.abs(
                            mapX(analysis.tAtMaxMs) -
                              mapX(analysis.tAtTargetMs)
                          ) < 72
                            ? zeroY + 42
                            : zeroY + 22
                        }
                        width={68}
                        height={18}
                        rx={4}
                        fill="#500724"
                        stroke="#f472b6"
                        strokeWidth={1}
                      />
                      <text
                        x={mapX(analysis.tAtMaxMs)}
                        y={
                          analysis.tAtTargetMs !== null &&
                          Math.abs(
                            mapX(analysis.tAtMaxMs) -
                              mapX(analysis.tAtTargetMs)
                          ) < 72
                            ? zeroY + 54
                            : zeroY + 34
                        }
                        textAnchor="middle"
                        className="fill-pink-300 font-mono text-[10.5px] font-bold"
                      >
                        ↑ {fmtComma(analysis.tAtMaxMs, 3)}
                      </text>
                    </g>
                  )}

                  {/* 4. Point (c): Test Time t_uji (Cyan Dashed Lines & Callout Badge) */}
                  {analysis.tUjiMs <= maxTimeMs && (
                    <g>
                      <line
                        x1={padL}
                        y1={mapY(analysis.vAtTuji)}
                        x2={mapX(analysis.tUjiMs)}
                        y2={mapY(analysis.vAtTuji)}
                        stroke="#38bdf8"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />
                      <line
                        x1={mapX(analysis.tUjiMs)}
                        y1={mapY(analysis.vAtTuji)}
                        x2={mapX(analysis.tUjiMs)}
                        y2={zeroY}
                        stroke="#38bdf8"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />
                      <circle
                        cx={mapX(analysis.tUjiMs)}
                        cy={mapY(analysis.vAtTuji)}
                        r={4.8}
                        fill="#38bdf8"
                        stroke="#0b111e"
                        strokeWidth={1.8}
                      />
                      <rect
                        x={mapX(analysis.tUjiMs) + 8}
                        y={mapY(analysis.vAtTuji) - 10}
                        width={92}
                        height={18}
                        rx={4}
                        fill="rgba(12, 74, 110, 0.92)"
                        stroke="#38bdf8"
                        strokeWidth={1}
                      />
                      <text
                        x={mapX(analysis.tUjiMs) + 54}
                        y={mapY(analysis.vAtTuji) + 2}
                        textAnchor="middle"
                        className="fill-sky-200 font-mono text-[10px] font-bold"
                      >
                        t={analysis.tUjiMs}ms: {fmtComma(analysis.vAtTuji, 2)}
                        {unitSymbol}
                      </text>
                    </g>
                  )}
                </svg>
              </div>

              {/* Color-Coded Key Points Legend Bar directly under the Hero Graph */}
              <div className="grid grid-cols-4 gap-1.5 pt-1.5 text-[7.5px] font-mono">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-950">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="truncate">
                    (b) t=0: <strong>{fmtComma(analysis.vAtZero, 3)} {unitSymbol}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-950">
                  <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                  <span className="truncate">
                    (c) t={analysis.tUjiMs}ms: <strong>{fmtComma(analysis.vAtTuji, 3)} {unitSymbol}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">
                    (d) {varName}={fmtComma(analysis.vTarget, 1)}{unitSymbol}:{' '}
                    <strong>
                      {analysis.tAtTargetMs !== null
                        ? `${fmtComma(analysis.tAtTargetMs, 3)} ms`
                        : '-'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-pink-50 border border-pink-200 text-pink-950">
                  <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                  <span className="truncate">
                    (e) Peak +{analysis.amplitude}{unitSymbol}:{' '}
                    <strong>{fmtComma(analysis.tAtMaxMs, 3)} ms</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT (3 cols): Hasil Analisis Jawaban Soal (Poin a - e) */}
            <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
              <div>
                <div className="border-b-2 border-cyan-600 pb-1 mb-1.5">
                  <h3 className="text-[9.5px] font-extrabold text-slate-900">
                    Hasil Analisis Jawaban Soal (Poin a - e)
                  </h3>
                </div>

                <div className="space-y-1.5 text-[8px]">
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[7px] text-slate-500 font-semibold">
                      (a1) Periode (T) &amp; Frekuensi (f)
                    </div>
                    <div className="font-mono font-bold text-slate-950 text-[8.5px] mt-0.5">
                      {fmtComma(analysis.periodS, 4)} s (
                      {fmtComma(analysis.periodMs, 2)} ms) |{' '}
                      {fmtComma(analysis.frequencyHz, 2)} Hz
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[7px] text-slate-500 font-semibold">
                      (a2) Sudut Fase (φ)
                    </div>
                    <div className="font-mono font-bold text-slate-950 text-[8.5px] mt-0.5">
                      {fmtComma(analysis.phiDegSigned, 2)}° (
                      {fmtCommaStr(analysis.phiDmsFormatted)}) ({shortPhaseName})
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-amber-50/50 border border-amber-200/80 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">
                      (b) {quantityName} {varName} saat t = 0
                    </span>
                    <strong className="font-mono text-[9px] text-slate-950">
                      {fmtComma(analysis.vAtZero, 3)} {unitSymbol}
                    </strong>
                  </div>

                  <div className="p-1.5 rounded-lg bg-sky-50/50 border border-sky-200/80 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">
                      (c) {quantityName} {varName} saat t = {analysis.tUjiMs} ms
                    </span>
                    <strong className="font-mono text-[9px] text-slate-950">
                      {fmtComma(analysis.vAtTuji, 3)} {unitSymbol}
                    </strong>
                  </div>

                  <div className="p-1.5 rounded-lg bg-emerald-50/50 border border-emerald-200/80 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">
                      (d) Waktu t saat {varName} ={' '}
                      {fmtComma(analysis.vTarget, 1)} {unitSymbol}
                    </span>
                    <strong className="font-mono text-[9px] text-slate-950">
                      {analysis.tAtTargetMs !== null
                        ? `${fmtComma(analysis.tAtTargetMs, 3)} ms`
                        : analysis.tAtTargetFormatted}
                    </strong>
                  </div>

                  <div className="p-1.5 rounded-lg bg-pink-50/50 border border-pink-200/80 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">
                      (e) Waktu t saat {varName} Maks (+A)
                    </span>
                    <strong className="font-mono text-[9px] text-slate-950">
                      {fmtComma(analysis.tAtMaxMs, 3)} ms
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mt-1.5 pt-1 border-t border-slate-100 text-[7px] text-slate-500 font-mono flex items-center justify-between">
                <span>1 Siklus Penuh: T = {fmtComma(analysis.periodMs, 2)} ms</span>
                <span>ω = {fmtComma(analysis.omegaRad, 2)} rad/s</span>
              </div>
            </div>
          </div>

          {/* TIER 2: Uraian Langkah Perhitungan Lengkap (7 cols, 4 horizontal boxes) + Log Percobaan (5 cols) */}
          <div className="grid grid-cols-12 gap-2 items-stretch">
            {/* LEFT (7 cols): Uraian Langkah Perhitungan Lengkap (4 Bagian) */}
            <div className="col-span-7 bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
              <div className="border-b-2 border-cyan-600 pb-0.5 mb-1">
                <h3 className="text-[9px] font-extrabold text-slate-900">
                  Uraian Langkah Perhitungan Lengkap (4 Bagian)
                </h3>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {/* Step 1: Poin a */}
                <div className="border border-slate-200 rounded-lg p-1.5 bg-slate-50/40 space-y-0.5">
                  <div className="text-[7.2px] font-extrabold text-slate-900 border-b border-slate-200 pb-0.5">
                    1. Parameter &amp; Fase (Poin a)
                  </div>
                  <div className="font-mono text-[6.8px] text-slate-800 space-y-0.5 leading-tight">
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
                    <div className="font-bold text-slate-950">
                      = {fmtComma(analysis.periodS, 4)} s (
                      {fmtComma(analysis.periodMs, 2)} ms)
                    </div>
                    <div className="flex items-center flex-wrap">
                      <span>f =</span>
                      <Frac top="1" bottom="T" />
                      <span>= {fmtComma(analysis.frequencyHz, 2)} Hz</span>
                    </div>
                    <div className="flex items-center flex-wrap">
                      <span>φ = {fmtComma(analysis.phiRadSigned, 3)} ×</span>
                      <Frac top="180°" bottom="π" />
                    </div>
                    <div className="font-bold text-slate-950">
                      = {fmtComma(analysis.phiDegSigned, 2)}° (
                      {fmtCommaStr(analysis.phiDmsFormatted)})
                    </div>
                  </div>
                </div>

                {/* Step 2: Poin b & c */}
                <div className="border border-slate-200 rounded-lg p-1.5 bg-slate-50/40 space-y-0.5">
                  <div className="text-[7.2px] font-extrabold text-slate-900 border-b border-slate-200 pb-0.5">
                    2. Nilai t=0 &amp; t_uji (Poin b &amp; c)
                  </div>
                  <div className="font-mono text-[6.8px] text-slate-800 space-y-0.5 leading-tight">
                    <div>
                      {varName}(0) = {analysis.amplitude} {analysis.waveType}(
                      {fmtComma(analysis.omegaRad, 2)}(0){' '}
                      {analysis.phiRadSigned >= 0 ? '+' : '-'}{' '}
                      {fmtComma(analysis.phiRadUnsigned, 3)})
                    </div>
                    <div>
                      = {analysis.amplitude} {analysis.waveType}(
                      {fmtComma(analysis.phiRadSigned, 3)} rad)
                    </div>
                    <div className="font-bold text-slate-950">
                      = {fmtComma(analysis.vAtZero, 3)} {unitSymbol}
                    </div>
                    <div className="pt-0.5 border-t border-slate-200/80">
                      {varName}({fmtComma(analysis.tUjiSec, 3)}) ={' '}
                      {analysis.amplitude} {analysis.waveType}(
                      {fmtComma(analysis.omegaRad, 2)}×
                      {fmtComma(analysis.tUjiSec, 3)}{' '}
                      {analysis.phiRadSigned >= 0 ? '+' : '-'}{' '}
                      {fmtComma(analysis.phiRadUnsigned, 3)})
                    </div>
                    <div>
                      = {analysis.amplitude} {analysis.waveType}(
                      {fmtComma(
                        analysis.omegaRad * analysis.tUjiSec +
                          analysis.phiRadSigned,
                        4
                      )}{' '}
                      rad)
                    </div>
                    <div className="font-bold text-slate-950">
                      = {fmtComma(analysis.vAtTuji, 3)} {unitSymbol}
                    </div>
                  </div>
                </div>

                {/* Step 3: Poin d */}
                <div className="border border-slate-200 rounded-lg p-1.5 bg-slate-50/40 space-y-0.5">
                  <div className="text-[7.2px] font-extrabold text-slate-900 border-b border-slate-200 pb-0.5">
                    3. Waktu Target {varName}={fmtComma(analysis.vTarget, 1)}
                    {unitSymbol} (Poin d)
                  </div>
                  {analysis.targetExceedsAmplitude ? (
                    <div className="font-mono text-[6.8px] text-red-600">
                      |Target| &gt; A ({analysis.amplitude} {unitSymbol}).
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
                        <div className="font-mono text-[6.8px] text-slate-800 space-y-0.5 leading-tight">
                          <div className="flex items-center flex-wrap">
                            <span>
                              {analysis.waveType}(ωt ± φ) =
                            </span>
                            <Frac
                              top={fmtComma(analysis.vTarget, 1)}
                              bottom={analysis.amplitude}
                            />
                            <span>= {fmtComma(ratio, 4)}</span>
                          </div>
                          <div>
                            ωt ± φ = arc{analysis.waveType}(
                            {fmtComma(ratio, 4)}) = {fmtComma(invRad, 4)} rad
                          </div>
                          <div className="flex items-center flex-wrap">
                            <span>t =</span>
                            <Frac
                              top={`${fmtComma(invRad, 4)} - (${fmtComma(analysis.phiRadSigned, 3)})`}
                              bottom={fmtComma(analysis.omegaRad, 2)}
                            />
                          </div>
                          <div className="flex items-center flex-wrap">
                            <span>=</span>
                            <Frac
                              top={fmtComma(numerator, 4)}
                              bottom={fmtComma(analysis.omegaRad, 2)}
                            />
                            <span>= {fmtComma(tSec, 6)} s</span>
                          </div>
                          <div className="font-bold text-slate-950">
                            = {fmtComma(analysis.tAtTargetMs ?? 0, 3)} ms
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Step 4: Poin e */}
                <div className="border border-slate-200 rounded-lg p-1.5 bg-slate-50/40 space-y-0.5">
                  <div className="text-[7.2px] font-extrabold text-slate-900 border-b border-slate-200 pb-0.5">
                    4. Waktu Maks +{analysis.amplitude}
                    {unitSymbol} (Poin e)
                  </div>
                  {(() => {
                    const peakAngle =
                      analysis.waveType === 'cos' ? 0 : Math.PI / 2;
                    const numerator = peakAngle - analysis.phiRadSigned;
                    const tMaxSec = analysis.tAtMaxMs / 1000;
                    return (
                      <div className="font-mono text-[6.8px] text-slate-800 space-y-0.5 leading-tight">
                        <div className="flex items-center flex-wrap">
                          <span>Syarat Maks (+A) =</span>
                          {analysis.waveType === 'sin' ? (
                            <>
                              <Frac top="π" bottom="2" />
                              <span>(1,5708 rad)</span>
                            </>
                          ) : (
                            <span>0 rad</span>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap">
                          <span>t =</span>
                          <Frac
                            top={`${fmtComma(peakAngle, 4)} - (${fmtComma(analysis.phiRadSigned, 3)})`}
                            bottom={fmtComma(analysis.omegaRad, 2)}
                          />
                        </div>
                        <div className="flex items-center flex-wrap">
                          <span>=</span>
                          <Frac
                            top={fmtComma(numerator, 4)}
                            bottom={fmtComma(analysis.omegaRad, 2)}
                          />
                          <span>= {fmtComma(tMaxSec, 6)} s</span>
                        </div>
                        <div className="font-bold text-slate-950">
                          = {fmtComma(analysis.tAtMaxMs, 3)} ms
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* RIGHT (5 cols): Log Percobaan Gelombang Sinusoidal */}
            <div className="col-span-5 bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
              <div className="border-b-2 border-cyan-600 pb-0.5 mb-1 flex items-center justify-between">
                <h3 className="text-[9px] font-extrabold text-slate-900">
                  Log Percobaan Gelombang Sinusoidal
                </h3>
                <span className="text-[7px] font-mono text-slate-500">
                  Total: {effectiveWaveformLogs.length} Percobaan
                </span>
              </div>

              <table className="w-full border-collapse text-[7.2px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 border-b border-slate-200 font-bold">
                    <th className="py-1 px-1.5 text-left w-5">No</th>
                    <th className="py-1 px-1.5 text-left">No. Soal</th>
                    <th className="py-1 px-1.5 text-left">Besaran</th>
                    <th className="py-1 px-1.5 text-left">A</th>
                    <th className="py-1 px-1.5 text-left">ω</th>
                    <th className="py-1 px-1.5 text-left">φ (rad / °)</th>
                    <th className="py-1 px-1.5 text-left">Persamaan</th>
                    <th className="py-1 px-1.5 text-left">Fase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {effectiveWaveformLogs.slice(0, 4).map((log, idx) => {
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
                        <td className="py-1 px-1.5 text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-1.5 font-medium text-slate-900 truncate max-w-[78px]">
                          {log.questionLabel || 'PE 118 NO 7'}
                        </td>
                        <td className="py-1 px-1.5 text-slate-700">
                          {besaranLabel}
                        </td>
                        <td className="py-1 px-1.5 text-slate-900 font-semibold">
                          {log.amplitude} {unit}
                        </td>
                        <td className="py-1 px-1.5 font-mono text-slate-900">
                          {log.omegaInput}
                        </td>
                        <td className="py-1 px-1.5 font-mono text-slate-800">
                          {phiDisplay}
                        </td>
                        <td className="py-1 px-1.5 font-mono font-semibold text-slate-900">
                          {fmtCommaStr(log.equation)}
                        </td>
                        <td className="py-1 px-1.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded border text-[6.8px] font-bold whitespace-nowrap ${
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
