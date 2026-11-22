'use client';

import React, { useMemo } from 'react';
import { generateWaveformPoints, solveSinusoidal } from '@/lib/math-engine';
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
  const plotPoints = useMemo(
    () => generateWaveformPoints(analysis, 240),
    [analysis]
  );

  const modeCounts = useMemo(() => {
    const a = angleLogs.filter((l) => l.mode === 'Mode A').length;
    const b = angleLogs.filter((l) => l.mode === 'Mode B').length;
    const c = angleLogs.filter((l) => l.mode === 'Mode C').length;
    return { a, b, c, total: angleLogs.length };
  }, [angleLogs]);

  // Centerpiece Print Oscilloscope SVG Dimensions for Tab 3
  const svgW = 760;
  const svgH = 260;
  const padL = 54;
  const padR = 22;
  const padT = 22;
  const padB = 34;
  const innerW = svgW - padL - padR;
  const innerH = svgH - padT - padB;

  const maxTimeMs = analysis.isValid ? 1.25 * analysis.periodMs : 50;
  const yLimit = analysis.isValid ? 1.2 * analysis.amplitude : 10;

  const mapX = (tMs: number) =>
    padL + (maxTimeMs > 0 ? (tMs / maxTimeMs) * innerW : 0);
  const mapY = (v: number) =>
    padT + innerH / 2 - (yLimit > 0 ? (v / yLimit) * (innerH / 2) : 0);

  const refPath = useMemo(() => {
    if (plotPoints.length === 0) return '';
    return plotPoints
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${mapX(pt.tMs).toFixed(1)} ${mapY(pt.vRef).toFixed(1)}`
      )
      .join(' ');
  }, [plotPoints, maxTimeMs, yLimit]);

  const shiftedPath = useMemo(() => {
    if (plotPoints.length === 0) return '';
    return plotPoints
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${mapX(pt.tMs).toFixed(1)} ${mapY(pt.vShifted).toFixed(1)}`
      )
      .join(' ');
  }, [plotPoints, maxTimeMs, yLimit]);

  const printedDate = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const tabTitle =
    activeTab === 'tujuan'
      ? 'BAGIAN 1 — TUJUAN PEMBELAJARAN, REFERENSI RUMUS & KALKULATOR PRESISI'
      : activeTab === 'konversi'
      ? 'BAGIAN 2 — KALKULATOR & LOG PRAKTIKUM KONVERSI SATUAN SUDUT (° ↔ rad ↔ DMS)'
      : 'BAGIAN 3 — SIMULASI & ANALISIS GELOMBANG SINUSOIDAL AC (1.25 SIKLUS)';

  return (
    <div className="hidden print-only-a4 text-zinc-900 bg-white font-sans">
      {/* SHARED COMPACT A4 HEADER & STUDENT IDENTITY */}
      <div className="border-b-2 border-zinc-900 pb-2.5 mb-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-500">
            LAPORAN PRAKTIKUM MATEMATIKA TEKNIK (M12) · {tabTitle}
          </div>
          <h1 className="text-base font-bold text-zinc-950 tracking-tight mt-0.5">
            {activeTab === 'tujuan' &&
              '1. Tujuan Pembelajaran, Referensi Rumus & Log Kalkulator Aritmatika Dasar'}
            {activeTab === 'konversi' &&
              '2. Laporan Praktikum Konversi Satuan Sudut (Mode A, Mode B, Mode C)'}
            {activeTab === 'sinusoidal' &&
              '3. Laporan Simulasi Osiloskop & Penyelesaian Analitik Gelombang Sinusoidal AC'}
          </h1>
        </div>

        <div className="text-right font-mono text-[10px] leading-snug shrink-0 bg-zinc-100 border border-zinc-300 rounded-md px-3 py-1.5">
          <div>
            <span className="text-zinc-500">Nama : </span>
            <strong className="text-zinc-900">{student.nama || '-'}</strong>
          </div>
          <div>
            <span className="text-zinc-500">NIM : </span>
            <strong className="text-zinc-900">{student.nim || '-'}</strong>
            <span className="text-zinc-400 mx-1.5">|</span>
            <span className="text-zinc-500">Kelas : </span>
            <strong className="text-zinc-900">{student.kelas || '-'}</strong>
          </div>
          <div className="text-[8.5px] text-zinc-500 mt-0.5">
            Tanggal Cetak: {printedDate}
          </div>
        </div>
      </div>

      {/* ====================================================================
          TAB 1 A4 PRINT SHEET: TUJUAN PEMBELAJARAN & BASIC CALCULATOR
         ==================================================================== */}
      {activeTab === 'tujuan' && (
        <div className="space-y-3 break-inside-avoid">
          {/* 3 Compact Formula Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="border border-zinc-300 rounded-md p-2.5 bg-zinc-50/50 space-y-1.5">
              <div className="text-[9px] font-mono font-bold uppercase text-zinc-500">
                [MODUL 01 · KONVERSI SUDUT]
              </div>
              <div className="text-xs font-bold text-zinc-900">
                Hubungan Derajat, Radian &amp; DMS
              </div>
              <div className="font-mono text-[9.5px] space-y-1 text-zinc-800 pt-1">
                <div>• 1 rad = 180° / π ≈ 57.2958°</div>
                <div>• 1° = π / 180 rad ≈ 0.017453 rad</div>
                <div>• 1° = 60&apos; (menit) = 3600&quot; (detik)</div>
                <div>• Desimal = D + M/60 + S/3600</div>
              </div>
            </div>

            <div className="border border-zinc-300 rounded-md p-2.5 bg-zinc-50/50 space-y-1.5">
              <div className="text-[9px] font-mono font-bold uppercase text-zinc-500">
                [MODUL 02 · BEDA FASE]
              </div>
              <div className="text-xs font-bold text-zinc-900">
                Phase Angle (Lead vs Lag)
              </div>
              <div className="font-mono text-[9.5px] space-y-1 text-zinc-800 pt-1">
                <div>• In Phase (0°): y = A sin(ωt)</div>
                <div>• Leading (+φ): y = A sin(ωt + φ)</div>
                <div>• Lagging (-φ): y = A sin(ωt - φ)</div>
                <div>• φ(°) = φ(rad) × (180° / π)</div>
              </div>
            </div>

            <div className="border border-zinc-300 rounded-md p-2.5 bg-zinc-50/50 space-y-1.5">
              <div className="text-[9px] font-mono font-bold uppercase text-zinc-500">
                [MODUL 03 · GELOMBANG AC]
              </div>
              <div className="text-xs font-bold text-zinc-900">
                Parameter Sinusoidal AC
              </div>
              <div className="font-mono text-[9.5px] space-y-1 text-zinc-800 pt-1">
                <div>• Periode: T = 2π / ω (sekon)</div>
                <div>• Frekuensi: f = 1 / T (Hz)</div>
                <div>• Kec. Sudut: ω = 2πf (rad/s)</div>
                <div>• Ref P12: v(t) = 340 sin(50πt - 0.541) V</div>
              </div>
            </div>
          </div>

          {/* Calculator Log Table */}
          <div className="border border-zinc-300 rounded-md p-3">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-200">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-900">
                Tabel Log Perhitungan Kalkulator Aritmatika Presisi (Decimal.js)
              </span>
              <span className="font-mono text-[10px] text-zinc-600">
                Total: {arithmeticLogs.length} Perhitungan
              </span>
            </div>

            <table className="w-full border-collapse text-[10px] font-mono">
              <thead>
                <tr className="bg-zinc-100 text-zinc-800 border-y border-zinc-300 uppercase">
                  <th className="py-1.5 px-2 text-center w-10">No</th>
                  <th className="py-1.5 px-2 text-left w-24">Waktu</th>
                  <th className="py-1.5 px-2 text-left">Ekspresi Matematika</th>
                  <th className="py-1.5 px-2 text-left">Hasil Presisi (Decimal.js)</th>
                  <th className="py-1.5 px-2 text-left">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {arithmeticLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-zinc-400">
                      Belum ada riwayat perhitungan kalkulator yang disimpan.
                    </td>
                  </tr>
                ) : (
                  arithmeticLogs.slice(0, 22).map((item, idx) => (
                    <tr
                      key={item.id}
                      className={idx % 2 === 1 ? 'bg-zinc-50/80' : ''}
                    >
                      <td className="py-1 px-2 text-center text-zinc-500">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 text-zinc-600">{item.timestamp}</td>
                      <td className="py-1 px-2 font-semibold text-zinc-900">
                        {item.expression}
                      </td>
                      <td className="py-1 px-2 font-bold text-zinc-950">
                        {item.result}
                      </td>
                      <td className="py-1 px-2 text-zinc-700 font-sans">
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

      {/* ====================================================================
          TAB 2 A4 PRINT SHEET: KONVERSI SATUAN SUDUT ONLY
         ==================================================================== */}
      {activeTab === 'konversi' && (
        <div className="space-y-3 break-inside-avoid">
          {/* Target Progress & Formula Reference Bar */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-7 border border-zinc-300 rounded-md p-2.5 bg-zinc-50/60">
              <div className="text-[9px] font-mono font-bold uppercase text-zinc-500 mb-1">
                [RUMUS KONVERSI HUB-AND-SPOKE]
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[9.5px] text-zinc-800">
                <div>• rad_dec = deg × (π / 180)</div>
                <div>• rad_π = (deg / 180)π rad</div>
                <div>• deg = D + M/60 + S/3600</div>
                <div>• DMS: D=⌊|deg|⌋, M=⌊(|deg|-D)×60⌋</div>
              </div>
            </div>

            <div className="col-span-5 border border-zinc-300 rounded-md p-2.5 bg-zinc-50/60 flex flex-col justify-between">
              <div className="text-[9px] font-mono font-bold uppercase text-zinc-500">
                [CAPAIAN TARGET PRAKTIKUM KONVERSI SUDUT]
              </div>
              <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] pt-1">
                <div className="border border-zinc-300 bg-white rounded px-2 py-1 text-center">
                  <span className="text-zinc-500 block text-[8.5px]">Mode A</span>
                  <strong>{modeCounts.a}/4</strong>
                </div>
                <div className="border border-zinc-300 bg-white rounded px-2 py-1 text-center">
                  <span className="text-zinc-500 block text-[8.5px]">Mode B</span>
                  <strong>{modeCounts.b}/4</strong>
                </div>
                <div className="border border-zinc-300 bg-white rounded px-2 py-1 text-center">
                  <span className="text-zinc-500 block text-[8.5px]">Mode C</span>
                  <strong>{modeCounts.c}/4</strong>
                </div>
                <div className="border border-zinc-900 bg-zinc-900 text-white rounded px-2 py-1 text-center">
                  <span className="text-zinc-300 block text-[8.5px]">Total</span>
                  <strong>{modeCounts.total}/12</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Angle Conversion Log Table */}
          <div className="border border-zinc-300 rounded-md p-3">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-200">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-900">
                Tabel Log Praktikum Konversi Satuan Sudut (Mode A: Derajat, Mode B: Radian, Mode C: DMS)
              </span>
              <span className="font-mono text-[10px] text-zinc-600">
                Total Data: {angleLogs.length} Baris
              </span>
            </div>

            <table className="w-full border-collapse text-[10px] font-mono">
              <thead>
                <tr className="bg-zinc-100 text-zinc-800 border-y border-zinc-300 uppercase">
                  <th className="py-1.5 px-2 text-center w-9">No</th>
                  <th className="py-1.5 px-2 text-left">Waktu</th>
                  <th className="py-1.5 px-2 text-left">Mode</th>
                  <th className="py-1.5 px-2 text-left">Input Awal</th>
                  <th className="py-1.5 px-2 text-left">Derajat Desimal (°)</th>
                  <th className="py-1.5 px-2 text-left">Radian Desimal (rad)</th>
                  <th className="py-1.5 px-2 text-left">Radian Simbolik (π)</th>
                  <th className="py-1.5 px-2 text-left">Komponen DMS (° &apos; &quot;)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {angleLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-400">
                      Belum ada data konversi sudut yang disimpan pada Tab 2.
                    </td>
                  </tr>
                ) : (
                  angleLogs.slice(0, 24).map((log, idx) => (
                    <tr
                      key={log.id}
                      className={idx % 2 === 1 ? 'bg-zinc-50/80' : ''}
                    >
                      <td className="py-1.5 px-2 text-center text-zinc-500">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2 text-zinc-600">
                        {log.timestamp}
                      </td>
                      <td className="py-1.5 px-2 font-semibold text-zinc-900">
                        {log.mode}
                      </td>
                      <td className="py-1.5 px-2 font-bold text-zinc-950">
                        {log.rawInput}
                      </td>
                      <td className="py-1.5 px-2 text-zinc-900">
                        {log.degFormatted}
                      </td>
                      <td className="py-1.5 px-2 text-zinc-700">
                        {log.radDecFormatted}
                      </td>
                      <td className="py-1.5 px-2 font-bold text-zinc-950">
                        {log.radPiFormatted}
                      </td>
                      <td className="py-1.5 px-2 text-zinc-900">
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
          TAB 3 A4 PRINT SHEET: SINUSOIDAL WAVEFORM SIMULATOR ONLY
         ==================================================================== */}
      {activeTab === 'sinusoidal' && (
        <div className="space-y-3 break-inside-avoid">
          {/* 1. Centerpiece Vector Oscilloscope Graph */}
          <div className="border border-zinc-300 rounded-md p-2.5 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 mb-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-zinc-900">
                A. Grafik Osiloskop Gelombang Sinusoidal AC (1.25 Siklus · t ∈ [0, 1.25T])
              </span>
              <span className="font-mono text-[10px] font-bold text-zinc-950 bg-zinc-100 px-2.5 py-0.5 rounded border border-zinc-300">
                {analysis.equation} · [{analysis.phaseStatusBanner}]
              </span>
            </div>

            {analysis.isValid ? (
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
                <rect
                  x={padL}
                  y={padT}
                  width={innerW}
                  height={innerH}
                  fill="#fafafa"
                  stroke="#d4d4d8"
                  strokeWidth={1}
                />

                {/* Horizontal Gridlines */}
                {[-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].map(
                  (factor) => {
                    const val = factor * analysis.amplitude;
                    const y = mapY(val);
                    const isZero = factor === 0;
                    const isMajor =
                      factor === -1 ||
                      factor === -0.5 ||
                      factor === 0 ||
                      factor === 0.5 ||
                      factor === 1;
                    return (
                      <g key={factor}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={svgW - padR}
                          y2={y}
                          stroke={
                            isZero
                              ? '#52525b'
                              : isMajor
                              ? '#d4d4d8'
                              : '#f4f4f5'
                          }
                          strokeWidth={isZero ? 1.3 : 0.8}
                          strokeDasharray={isZero ? undefined : '3 3'}
                        />
                        {isMajor && (
                          <text
                            x={padL - 6}
                            y={y + 3}
                            textAnchor="end"
                            className="fill-zinc-700 font-mono text-[8.5px]"
                          >
                            {val.toFixed(1)} V
                          </text>
                        )}
                      </g>
                    );
                  }
                )}

                {/* Vertical Time Gridlines */}
                {[
                  0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0, 1.125,
                  1.25,
                ].map((frac) => {
                  const tMs = frac * analysis.periodMs;
                  const x = mapX(tMs);
                  const isOneT = frac === 1.0;
                  const isQuarter =
                    frac === 0 ||
                    frac === 0.25 ||
                    frac === 0.5 ||
                    frac === 0.75 ||
                    frac === 1.0 ||
                    frac === 1.25;
                  return (
                    <g key={frac}>
                      <line
                        x1={x}
                        y1={padT}
                        x2={x}
                        y2={svgH - padB}
                        stroke={
                          isOneT
                            ? '#2563eb'
                            : isQuarter
                            ? '#d4d4d8'
                            : '#e4e4e7'
                        }
                        strokeWidth={isOneT ? 1.2 : 0.8}
                        strokeDasharray="3 3"
                      />
                      <text
                        x={x}
                        y={svgH - padB + 12}
                        textAnchor="middle"
                        className="fill-zinc-700 font-mono text-[8.5px]"
                      >
                        {tMs.toFixed(2)} ms
                      </text>
                      {isQuarter && (
                        <text
                          x={x}
                          y={svgH - padB + 23}
                          textAnchor="middle"
                          className="fill-zinc-500 font-mono text-[8px]"
                        >
                          ({frac}T)
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* V_target horizontal line */}
                {!analysis.targetExceedsAmplitude && (
                  <g>
                    <line
                      x1={padL}
                      y1={mapY(analysis.vTarget)}
                      x2={svgW - padR}
                      y2={mapY(analysis.vTarget)}
                      stroke="#16a34a"
                      strokeWidth={1.1}
                      strokeDasharray="4 3"
                    />
                    <text
                      x={svgW - padR - 4}
                      y={mapY(analysis.vTarget) - 4}
                      textAnchor="end"
                      className="fill-emerald-700 font-mono text-[8.5px] font-bold"
                    >
                      V_target = {analysis.vTarget} V
                    </text>
                  </g>
                )}

                {/* Curves */}
                <path
                  d={refPath}
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
                <path
                  d={shiftedPath}
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth={2.2}
                />

                {/* Key Markers */}
                <circle
                  cx={mapX(0)}
                  cy={mapY(analysis.vAtZero)}
                  r={3.5}
                  fill="#18181b"
                />
                {10 <= maxTimeMs && (
                  <circle
                    cx={mapX(10)}
                    cy={mapY(analysis.vAt10ms)}
                    r={3.5}
                    fill="#2563eb"
                  />
                )}
                {analysis.tAtMaxMs <= maxTimeMs && (
                  <g>
                    <circle
                      cx={mapX(analysis.tAtMaxMs)}
                      cy={mapY(analysis.amplitude)}
                      r={4}
                      fill="#dc2626"
                    />
                    <text
                      x={mapX(analysis.tAtMaxMs)}
                      y={mapY(analysis.amplitude) - 6}
                      textAnchor="middle"
                      className="fill-red-700 font-mono text-[8.5px] font-bold"
                    >
                      Peak ({analysis.tAtMaxFormatted})
                    </text>
                  </g>
                )}
                {analysis.tAtTargetMs !== null &&
                  analysis.tAtTargetMs <= maxTimeMs && (
                    <circle
                      cx={mapX(analysis.tAtTargetMs)}
                      cy={mapY(analysis.vTarget)}
                      r={4}
                      fill="#16a34a"
                    />
                  )}

                <text
                  x={padL + 4}
                  y={padT - 6}
                  className="fill-zinc-800 font-mono text-[9px] font-bold"
                >
                  Tegangan v(t) [Volt]
                </text>
                <text
                  x={svgW - padR}
                  y={padT - 6}
                  textAnchor="end"
                  className="fill-zinc-600 font-mono text-[8.5px]"
                >
                  --- Referensi: A {analysis.waveType}(ωt) | ─── Simulasi:{' '}
                  {analysis.equation}
                </text>
              </svg>
            ) : (
              <div className="p-4 text-xs text-red-600">
                Parameter gelombang tidak valid.
              </div>
            )}
          </div>

          {/* 2. Analytical Problem Solver Box (a s.d. e) */}
          <div className="border border-zinc-300 rounded-md p-2.5 bg-zinc-50/40">
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-zinc-900 border-b border-zinc-200 pb-1 mb-2">
              B. Hasil Analisis Jawaban Soal (Analytical Problem Solver · Poin a s.d. e)
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-[9.5px]">
              <div className="border border-zinc-300 bg-white rounded p-2">
                <div className="text-[8.5px] text-zinc-500 font-sans font-bold uppercase">
                  (a) Periode T &amp; Frekuensi f
                </div>
                <div className="font-bold text-zinc-950 mt-0.5">
                  T = {analysis.periodS.toFixed(4)} s ({analysis.periodMs.toFixed(2)} ms)
                </div>
                <div className="text-zinc-800">
                  f = {analysis.frequencyHz.toFixed(2)} Hz
                </div>
              </div>

              <div className="border border-zinc-300 bg-white rounded p-2">
                <div className="text-[8.5px] text-zinc-500 font-sans font-bold uppercase">
                  (a) Kecepatan Sudut ω &amp; Sudut Fase φ
                </div>
                <div className="font-bold text-zinc-950 mt-0.5">
                  ω = {analysis.omegaInput} ≈ {analysis.omegaRad.toFixed(2)} rad/s
                </div>
                <div className="text-zinc-800">
                  φ = {analysis.phiDegFormatted} ({analysis.phiRadSigned.toFixed(3)} rad)
                </div>
              </div>

              <div className="border border-zinc-300 bg-white rounded p-2">
                <div className="text-[8.5px] text-zinc-500 font-sans font-bold uppercase">
                  (b) Tegangan saat t = 0 s
                </div>
                <div className="text-zinc-600 text-[8.5px]">
                  v(0) = {analysis.amplitude} {analysis.waveType}({analysis.phiRadSigned.toFixed(3)})
                </div>
                <div className="font-bold text-zinc-950 text-[11px] mt-0.5">
                  v(0) = {analysis.vAtZero.toFixed(2)} V
                </div>
              </div>

              <div className="border border-zinc-300 bg-white rounded p-2">
                <div className="text-[8.5px] text-zinc-500 font-sans font-bold uppercase">
                  (c) Tegangan saat t = 10 ms (0.01 s)
                </div>
                <div className="text-zinc-600 text-[8.5px]">
                  v(0.01) = {analysis.amplitude} {analysis.waveType}(ω(0.01) ± φ)
                </div>
                <div className="font-bold text-zinc-950 text-[11px] mt-0.5">
                  v(10 ms) = {analysis.vAt10ms.toFixed(2)} V
                </div>
              </div>

              <div className="border border-zinc-300 bg-white rounded p-2">
                <div className="text-[8.5px] text-zinc-500 font-sans font-bold uppercase">
                  (d) Waktu t pertama saat v = {analysis.vTarget} V
                </div>
                <div className="text-zinc-600 text-[8.5px]">
                  {analysis.targetExceedsAmplitude
                    ? `|V_target| > A (${analysis.amplitude} V)`
                    : `θ₁=${analysis.theta1Rad?.toFixed(2)}, θ₂=${analysis.theta2Rad?.toFixed(2)} rad`}
                </div>
                <div className="font-bold text-zinc-950 text-[10.5px] mt-0.5">
                  t = {analysis.tAtTargetFormatted}
                </div>
              </div>

              <div className="border border-zinc-300 bg-white rounded p-2">
                <div className="text-[8.5px] text-zinc-500 font-sans font-bold uppercase">
                  (e) Waktu t pertama saat v Maksimum
                </div>
                <div className="text-zinc-600 text-[8.5px]">
                  t_max = ((π/2 - φ_signed) mod 2π) / ω
                </div>
                <div className="font-bold text-zinc-950 text-[11px] mt-0.5">
                  t_max = {analysis.tAtMaxFormatted}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Waveform Log Table */}
          <div className="border border-zinc-300 rounded-md p-2.5">
            <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-zinc-200">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-zinc-900">
                C. Tabel Log Simulasi Gelombang Sinusoidal AC
              </span>
              <span className="font-mono text-[9.5px] text-zinc-600">
                Total Simulasi: {waveformLogs.length} Baris
              </span>
            </div>

            <table className="w-full border-collapse text-[9.5px] font-mono">
              <thead>
                <tr className="bg-zinc-100 text-zinc-800 border-y border-zinc-300 uppercase">
                  <th className="py-1 px-2 text-center w-8">No</th>
                  <th className="py-1 px-2 text-left">A (V)</th>
                  <th className="py-1 px-2 text-left">ω (rad/s)</th>
                  <th className="py-1 px-2 text-left">φ (rad/°)</th>
                  <th className="py-1 px-2 text-left">Persamaan v(t) / i(t)</th>
                  <th className="py-1 px-2 text-left">Jenis Fase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {waveformLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-zinc-400">
                      Belum ada data simulasi gelombang yang disimpan pada Tab 3.
                    </td>
                  </tr>
                ) : (
                  waveformLogs.slice(0, 10).map((log, idx) => (
                    <tr
                      key={log.id}
                      className={idx % 2 === 1 ? 'bg-zinc-50/80' : ''}
                    >
                      <td className="py-1 px-2 text-center text-zinc-500">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 font-bold text-zinc-950">
                        {log.amplitude} V
                      </td>
                      <td className="py-1 px-2 text-zinc-800">
                        {log.omegaInput} ({log.omegaRad.toFixed(2)})
                      </td>
                      <td className="py-1 px-2 text-zinc-800">
                        {log.phiFormatted}
                      </td>
                      <td className="py-1 px-2 font-bold text-zinc-950">
                        {log.equation}
                      </td>
                      <td className="py-1 px-2 text-zinc-700">
                        {log.phaseStatus}
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
