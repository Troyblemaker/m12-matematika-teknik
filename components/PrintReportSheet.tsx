'use client';

import React, { useMemo } from 'react';
import { solveSinusoidal, solveSubProblems } from '@/lib/math-engine';
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

  const solvedSubProblems = useMemo(
    () => solveSubProblems(analysis, sinusoidalParams.subProblems),
    [analysis, sinusoidalParams.subProblems]
  );

  // Dynamically size the time horizon so all user-defined sub-problem points fit cleanly on the hero graph
  const maxTimeMs = useMemo(() => {
    if (!analysis.isValid || analysis.periodMs <= 0) return 21;
    const baseMax = 1.05 * analysis.periodMs;
    const maxPtT = solvedSubProblems.reduce((acc, sp) => {
      if (sp.plotPoint && sp.plotPoint.tMs > acc) {
        return sp.plotPoint.tMs;
      }
      return acc;
    }, 0);
    if (maxPtT > baseMax && maxPtT <= analysis.periodMs * 3.5) {
      return maxPtT * 1.08;
    }
    return baseMax;
  }, [analysis, solvedSubProblems]);

  // Generate high-resolution waveform points across [0, maxTimeMs]
  const oneCyclePoints = useMemo(() => {
    if (!analysis.isValid || analysis.periodS <= 0) return [];
    const maxSec = maxTimeMs / 1000;
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
  }, [analysis, maxTimeMs]);

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
  const quantityName = analysis.quantityName;

  const shortPhaseName =
    analysis.phaseSign === '+' && analysis.phiRadUnsigned > 1e-12
      ? 'Leading'
      : analysis.phaseSign === '-' && analysis.phiRadUnsigned > 1e-12
      ? 'Lagging'
      : 'In Phase';

  const statusNarrative =
    analysis.phaseSign === '-' && analysis.phiRadUnsigned > 1e-12
      ? `Gelombang tertinggal sebesar ${fmtComma(analysis.phiDegUnsigned, 2)}° (${fmtCommaStr(analysis.phiDmsFormatted)} | ${fmtComma(analysis.phiRadSigned, 3)} rad).`
      : analysis.phaseSign === '+' && analysis.phiRadUnsigned > 1e-12
      ? `Gelombang mendahului sebesar +${fmtComma(analysis.phiDegUnsigned, 2)}° (+${fmtCommaStr(analysis.phiDmsFormatted)} | +${fmtComma(analysis.phiRadSigned, 3)} rad).`
      : 'Gelombang sefase dengan acuan standar (0,00° | 0 rad).';

  const displayEquationComma = fmtCommaStr(analysis.equation);

  // Plottable sub-problems with anti-overlap Y-axis and X-axis coordinates
  const plottablePoints = useMemo(() => {
    if (!analysis.isValid) return [];
    const fixedYs = [mapY(analysis.amplitude), zeroY, mapY(-analysis.amplitude)];
    const rawList = solvedSubProblems
      .filter((sp) => sp.plotPoint !== null && sp.plotPoint.tMs >= 0 && sp.plotPoint.tMs <= maxTimeMs)
      .map((sp) => ({
        ...sp,
        x: mapX(sp.plotPoint!.tMs),
        y: mapY(sp.plotPoint!.yVal),
        adjYLabel: mapY(sp.plotPoint!.yVal),
        xTier: 0,
      }));

    // De-collide Y-axis labels
    const byY = [...rawList].sort((a, b) => a.y - b.y);
    const occupiedYs = [...fixedYs];
    for (const item of byY) {
      let y = item.y;
      for (const occ of occupiedYs) {
        if (Math.abs(y - occ) < 12) {
          y = y >= occ ? occ + 12.5 : occ - 12.5;
        }
      }
      item.adjYLabel = y;
      occupiedYs.push(y);
    }

    // Stagger X-axis time pills
    const byX = [...rawList].sort((a, b) => a.x - b.x);
    const placedX: { x: number; tier: number }[] = [];
    for (const item of byX) {
      let tier = 0;
      for (const prev of placedX) {
        if (Math.abs(item.x - prev.x) < 76 && prev.tier === tier) {
          tier = (tier + 1) % 3;
        }
      }
      item.xTier = tier;
      placedX.push({ x: item.x, tier });
    }

    return rawList;
  }, [analysis, solvedSubProblems, maxTimeMs, yLimit]);

  const xAxisQuarterTicks = useMemo(() => {
    if (!analysis.isValid || analysis.periodMs <= 0) return [];
    const totalCycles = maxTimeMs / analysis.periodMs;
    const stepFrac = totalCycles > 2 ? 0.5 : 0.25;
    const arr: number[] = [];
    for (let f = stepFrac; f <= totalCycles + 0.001; f += stepFrac) {
      arr.push(f * analysis.periodMs);
    }
    return arr;
  }, [analysis, maxTimeMs]);

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
                  `Simulator Gelombang Sinusoidal & Analisis AC — ${analysis.questionLabel}`}
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
          TAB 3 A4 LANDSCAPE SHEET: HERO GRAPH CENTERPIECE + DYNAMIC SUB-PROBLEMS
         ==================================================================== */}
      {activeTab === 'sinusoidal' && (
        <div className="space-y-1.5 break-inside-avoid">
          {/* TIER 1: Input (2 cols) | HERO OSCILLOSCOPE GRAPH (7 cols) | Dynamic Sub-Problem Answers (3 cols) */}
          <div className="grid grid-cols-12 gap-2 items-stretch">
            {/* LEFT (2 cols): Problem Details & Wave Parameters */}
            <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-2 flex flex-col justify-between shadow-sm">
              <div className="space-y-1">
                <div className="border-b-2 border-cyan-600 pb-0.5">
                  <h3 className="text-[9px] font-extrabold text-slate-900">
                    Detail &amp; Parameter Soal
                  </h3>
                </div>

                <div className="space-y-1 text-[7.5px]">
                  <div>
                    <div className="text-[6.5px] text-slate-500 font-semibold">
                      No. Soal
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50/60 font-bold text-slate-900 truncate">
                      {analysis.questionLabel}
                    </div>
                  </div>

                  {sinusoidalParams.problemDetails && (
                    <div>
                      <div className="text-[6.5px] text-slate-500 font-semibold">
                        Keterangan Soal
                      </div>
                      <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50/40 text-[6.5px] text-slate-700 leading-tight line-clamp-4">
                        {sinusoidalParams.problemDetails}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[6.5px] text-slate-500 font-semibold">
                      Besaran AC
                    </div>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 bg-white font-semibold text-slate-900 truncate">
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
              </div>

              {/* Status Box */}
              <div className="mt-1 border border-slate-300 rounded-lg p-1.5 bg-slate-50">
                <div className="text-[7.5px] font-extrabold text-slate-900 uppercase leading-tight">
                  STATUS: {analysis.phaseStatusLabel}
                </div>
                <div className="text-[6.6px] text-slate-600 leading-tight mt-0.5">
                  {statusNarrative}
                </div>
              </div>
            </div>

            {/* ==============================================================
                CENTER HERO (7 cols / ~58% Page Width):
                SKETSA GELOMBANG SINUSOIDAL (ALL DYNAMIC SUB-PROBLEM POINTS)
               ============================================================== */}
            <div className="col-span-7 bg-white border-2 border-cyan-600/80 rounded-xl p-2.5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-[11px] font-extrabold text-slate-900 tracking-tight">
                    Sketsa Gelombang Sinusoidal (Plot Titik Sub-Soal)
                  </h3>
                  <div className="flex items-center gap-3 text-[8px] text-slate-600">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                      <span className="w-4 h-0.5 bg-cyan-400 inline-block" />
                      <span>Terukur {varName}(t)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 h-0.5 border-b-2 border-dashed border-slate-400 inline-block" />
                      <span>Acuan (φ = 0)</span>
                    </span>
                  </div>
                </div>

                <span className="border border-cyan-600/40 rounded-md px-2.5 py-0.5 font-mono text-[9.5px] font-extrabold text-slate-950 bg-cyan-50/60">
                  {displayEquationComma}
                </span>
              </div>

              {/* LARGE DARK OSCILLOSCOPE CANVAS */}
              <div className="rounded-xl bg-[#0b111e] p-1.5 border border-slate-800 flex-1 flex items-center">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
                  <defs>
                    <linearGradient
                      id="printHeroWaveGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
                      <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.02" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.18" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Graticule Gridlines */}
                  {[-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].map((f) => {
                    const isMajor =
                      f === -1 || f === -0.5 || f === 0 || f === 0.5 || f === 1;
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

                  {/* Vertical Graticule Gridlines */}
                  {xAxisQuarterTicks.map((tVal) => (
                    <line
                      key={`v-${tVal}`}
                      x1={mapX(tVal)}
                      y1={padT}
                      x2={mapX(tVal)}
                      y2={svgH - padB}
                      stroke="rgba(148, 163, 184, 0.16)"
                      strokeWidth={1}
                    />
                  ))}

                  {/* Main Y Axis with Top Arrow */}
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

                  {/* Main X Axis with Right Arrow */}
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

                  {/* Fixed Y-Axis Ticks: +A, 0, -A */}
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

                  {/* X-Axis Quarter-Cycle Tick Numbers */}
                  {xAxisQuarterTicks.map((tVal) => {
                    const x = mapX(tVal);
                    return (
                      <g key={`xtick-${tVal}`}>
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

                  {/* Area Fill + Reference Wave + Measured Cyan Wave */}
                  <path d={measuredAreaPath} fill="url(#printHeroWaveGrad)" />
                  <path
                    d={refPath}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="7 5"
                  />
                  <path
                    d={measuredPath}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth={3.2}
                  />

                  {/* Measured Wave Equation Label Pill */}
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

                  {/* ==========================================================
                      ALL DYNAMIC SUB-PROBLEM POINTS PLOTTED ON HERO GRAPH
                     ========================================================== */}
                  {plottablePoints.map((sp) => {
                    const pt = sp.plotPoint!;
                    const badgeW = 76;
                    const badgeH = 18;
                    const badgeY = zeroY + 22 + sp.xTier * 20;
                    const clampedBadgeX = Math.max(
                      padL + 4,
                      Math.min(svgW - padR - badgeW - 4, sp.x - badgeW / 2)
                    );

                    return (
                      <g key={sp.item.id}>
                        {/* Y-axis dynamic colored tick & label */}
                        <line
                          x1={padL - 4}
                          y1={sp.y}
                          x2={padL + 4}
                          y2={sp.y}
                          stroke={sp.color}
                          strokeWidth={1.5}
                        />
                        <text
                          x={padL - 10}
                          y={sp.adjYLabel + 4}
                          textAnchor="end"
                          fill={sp.color}
                          className="font-mono text-[11px] font-bold"
                        >
                          {fmtComma(pt.yVal, 1)}
                        </text>

                        {/* Horizontal & Vertical Dashed Projection Lines */}
                        <line
                          x1={padL}
                          y1={sp.y}
                          x2={sp.x}
                          y2={sp.y}
                          stroke={sp.color}
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                        />
                        <line
                          x1={sp.x}
                          y1={sp.y}
                          x2={sp.x}
                          y2={zeroY}
                          stroke={sp.color}
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                        />

                        {/* Dot Marker */}
                        <circle
                          cx={sp.x}
                          cy={sp.y}
                          r={5}
                          fill={sp.color}
                          stroke="#0b111e"
                          strokeWidth={1.8}
                        />

                        {/* Letter Circle Badge near Dot */}
                        <circle
                          cx={sp.x}
                          cy={sp.y > padT + 28 ? sp.y - 16 : sp.y + 16}
                          r={9}
                          fill="#0b111e"
                          stroke={sp.color}
                          strokeWidth={1.5}
                        />
                        <text
                          x={sp.x}
                          y={sp.y > padT + 28 ? sp.y - 12.5 : sp.y + 19.5}
                          textAnchor="middle"
                          fill={sp.color}
                          className="font-mono text-[10px] font-bold"
                        >
                          {sp.item.label}
                        </text>

                        {/* X-Axis Callout Pill (for t > 0) */}
                        {pt.tMs > 0 && (
                          <g>
                            <rect
                              x={clampedBadgeX}
                              y={badgeY}
                              width={badgeW}
                              height={badgeH}
                              rx={4}
                              fill="rgba(11, 17, 30, 0.94)"
                              stroke={sp.color}
                              strokeWidth={1.1}
                            />
                            <text
                              x={clampedBadgeX + badgeW / 2}
                              y={badgeY + 12.5}
                              textAnchor="middle"
                              fill={sp.color}
                              className="font-mono text-[9.5px] font-bold"
                            >
                              ({sp.item.label}) {fmtComma(pt.tMs, 2)}ms
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Dynamic Color-Coded Key Points Legend Bar directly under the Hero Graph */}
              <div className="flex flex-wrap gap-1.5 pt-1.5 text-[7.5px] font-mono">
                {plottablePoints.map((sp) => (
                  <div
                    key={sp.item.id}
                    style={{ borderColor: sp.color }}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border text-slate-900"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: sp.color }}
                    />
                    <span>
                      ({sp.item.label}) <strong>{fmtCommaStr(sp.answerText)}</strong>{' '}
                      <span className="text-slate-500">
                        @ {fmtComma(sp.plotPoint!.tMs, 2)}ms
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT (3 cols): Dynamic Hasil Analisis Jawaban Soal */}
            <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
              <div>
                <div className="border-b-2 border-cyan-600 pb-1 mb-1.5">
                  <h3 className="text-[9.5px] font-extrabold text-slate-900">
                    Hasil Analisis Jawaban Soal ({solvedSubProblems.length} Sub-Soal)
                  </h3>
                </div>

                <div className="space-y-1.5 text-[7.8px]">
                  {solvedSubProblems.slice(0, 8).map((sp) => (
                    <div
                      key={sp.item.id}
                      style={{ borderLeftColor: sp.color }}
                      className="p-1.5 rounded-lg bg-slate-50/70 border border-slate-200 border-l-4"
                    >
                      <div className="text-[7px] text-slate-600 font-semibold leading-tight">
                        ({sp.item.label}) {sp.item.prompt}
                      </div>
                      <div className="font-mono font-bold text-slate-950 text-[8.5px] mt-0.5 leading-snug">
                        {fmtCommaStr(sp.answerText)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-1.5 pt-1 border-t border-slate-100 text-[7px] text-slate-500 font-mono flex items-center justify-between">
                <span>Periode T = {fmtComma(analysis.periodMs, 2)} ms</span>
                <span>ω = {fmtComma(analysis.omegaRad, 2)} rad/s</span>
              </div>
            </div>
          </div>

          {/* TIER 2: Dynamic Uraian Langkah Perhitungan Lengkap (7 cols) + Log Percobaan (5 cols) */}
          <div className="grid grid-cols-12 gap-2 items-stretch">
            {/* LEFT (7 cols): Dynamic Step-by-Step Derivations for User's Sub-Problems */}
            <div className="col-span-7 bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
              <div className="border-b-2 border-cyan-600 pb-0.5 mb-1">
                <h3 className="text-[9px] font-extrabold text-slate-900">
                  Uraian Langkah Perhitungan Lengkap
                </h3>
              </div>

              <div
                className={`grid gap-1.5 ${
                  solvedSubProblems.length <= 4 ? 'grid-cols-4' : 'grid-cols-5'
                }`}
              >
                {solvedSubProblems.slice(0, 5).map((sp) => (
                  <div
                    key={sp.item.id}
                    style={{ borderTopColor: sp.color }}
                    className="border border-slate-200 border-t-2 rounded-lg p-1.5 bg-slate-50/40 space-y-0.5"
                  >
                    <div className="text-[7px] font-extrabold text-slate-900 border-b border-slate-200 pb-0.5 truncate">
                      ({sp.item.label}) {sp.item.prompt}
                    </div>
                    <div className="font-mono text-[6.5px] text-slate-800 space-y-0.5 leading-tight">
                      {sp.detailSteps.map((line, i) => (
                        <div
                          key={i}
                          className={
                            i === sp.detailSteps.length - 1
                              ? 'font-bold text-slate-950'
                              : ''
                          }
                        >
                          {fmtCommaStr(line)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
