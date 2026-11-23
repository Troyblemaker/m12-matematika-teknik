'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Crosshair,
  Lock,
  PlusCircle,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  evaluateWaveAt,
  generateWaveformPoints,
  solveSinusoidal,
} from '@/lib/math-engine';
import {
  ACQuantityType,
  AngleLogEntry,
  ArithmeticLogEntry,
  PhaseSignType,
  SinusoidalInputParams,
  StudentIdentity,
  WaveFunctionType,
  WaveformLogEntry,
} from '@/lib/types';
import PersistenceToolbar from './PersistenceToolbar';

interface Tab3SinusoidalSimulatorProps {
  student: StudentIdentity;
  params: SinusoidalInputParams;
  onChangeParams: (next: SinusoidalInputParams) => void;
  angleLogs: AngleLogEntry[];
  waveformLogs: WaveformLogEntry[];
  arithmeticLogs: ArithmeticLogEntry[];
  onAddWaveformLog: (entry: WaveformLogEntry) => void;
  onDeleteWaveformLog: (id: string) => void;
  onClearWaveformLogs: () => void;
}

interface CursorProbe {
  tMs: number;
  tSec: number;
  cycleFraction: number;
  angleRad: number;
  angleDeg: number;
  totalPhaseRad: number;
  totalPhaseDeg: number;
  vShifted: number;
  vRef: number;
  deltaV: number;
}

export default function Tab3SinusoidalSimulator({
  student,
  params,
  onChangeParams,
  angleLogs,
  waveformLogs,
  arithmeticLogs,
  onAddWaveformLog,
  onDeleteWaveformLog,
  onClearWaveformLogs,
}: Tab3SinusoidalSimulatorProps) {
  const analysis = useMemo(() => solveSinusoidal(params), [params]);
  const plotPoints = useMemo(
    () => generateWaveformPoints(analysis, 360),
    [analysis]
  );

  // Interactive Hover, Pin & Custom Time Input State on the Oscilloscope
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverTimeMs, setHoverTimeMs] = useState<number | null>(null);
  const [pinnedTimeMs, setPinnedTimeMs] = useState<number | null>(null);
  const [customTimeInput, setCustomTimeInput] = useState<string>(
    String(params.tUjiMs ?? 8)
  );
  const [customTimeUnit, setCustomTimeUnit] = useState<'ms' | 's'>('ms');
  const [showRefWave, setShowRefWave] = useState<boolean>(true);
  const [showKeyMarkers, setShowKeyMarkers] = useState<boolean>(true);

  const handleSaveSimulation = () => {
    if (!analysis.isValid) return;

    const signChar =
      analysis.phaseSign === '0'
        ? '0'
        : analysis.phaseSign === '+'
        ? '+'
        : '-';
    const phiFormatted =
      analysis.phaseSign === '0'
        ? '0 rad (0.00°)'
        : `${signChar}${analysis.phiRadUnsigned.toFixed(3)} rad (${signChar}${analysis.phiDegUnsigned.toFixed(2)}°)`;

    const entry: WaveformLogEntry = {
      id: `wave-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
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
      phiFormatted,
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
    };

    onAddWaveformLog(entry);
  };

  // Large Centerpiece SVG Dimensions & Padding
  const svgWidth = 1080;
  const svgHeight = 470;
  const padLeft = 78;
  const padRight = 38;
  const padTop = 36;
  const padBottom = 58;
  const innerW = svgWidth - padLeft - padRight;
  const innerH = svgHeight - padTop - padBottom;

  const maxTimeMs = analysis.isValid ? 1.25 * analysis.periodMs : 50;
  const yLimit = analysis.isValid ? 1.2 * analysis.amplitude : 10;

  const mapX = (tMs: number) =>
    padLeft + (maxTimeMs > 0 ? (tMs / maxTimeMs) * innerW : 0);
  const mapY = (v: number) =>
    padTop + innerH / 2 - (yLimit > 0 ? (v / yLimit) * (innerH / 2) : 0);

  const zeroY = mapY(0);

  const refPathData = useMemo(() => {
    if (plotPoints.length === 0) return '';
    return plotPoints
      .map(
        (pt, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${mapX(pt.tMs).toFixed(2)} ${mapY(pt.vRef).toFixed(2)}`
      )
      .join(' ');
  }, [plotPoints, maxTimeMs, yLimit]);

  const shiftedPathData = useMemo(() => {
    if (plotPoints.length === 0) return '';
    return plotPoints
      .map(
        (pt, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${mapX(pt.tMs).toFixed(2)} ${mapY(pt.vShifted).toFixed(2)}`
      )
      .join(' ');
  }, [plotPoints, maxTimeMs, yLimit]);

  const shiftedAreaData = useMemo(() => {
    if (plotPoints.length === 0) return '';
    const firstX = mapX(plotPoints[0].tMs).toFixed(2);
    const lastX = mapX(plotPoints[plotPoints.length - 1].tMs).toFixed(2);
    return `${shiftedPathData} L ${lastX} ${zeroY.toFixed(2)} L ${firstX} ${zeroY.toFixed(2)} Z`;
  }, [shiftedPathData, plotPoints, zeroY]);

  // Evaluate Custom Time Input (supports any arbitrary time value in ms or s)
  const customTimeEval = useMemo<{
    isValid: boolean;
    probe?: CursorProbe;
    inPlotRange: boolean;
    error?: string;
  }>(() => {
    if (!analysis.isValid) {
      return { isValid: false, inPlotRange: false, error: 'Parameter gelombang belum valid.' };
    }
    const cleaned = customTimeInput.trim().replace(/,/g, '.');
    if (!cleaned) {
      return { isValid: false, inPlotRange: false, error: 'Masukkan nilai waktu t.' };
    }
    const rawNum = Number(cleaned);
    if (!Number.isFinite(rawNum)) {
      return { isValid: false, inPlotRange: false, error: 'Nilai waktu t harus berupa angka.' };
    }

    const tMs = customTimeUnit === 's' ? rawNum * 1000 : rawNum;
    const tSec = tMs / 1000;
    const vShifted = evaluateWaveAt(
      analysis.amplitude,
      analysis.omegaRad,
      analysis.phiRadSigned,
      analysis.waveType,
      tSec
    );
    const vRef = evaluateWaveAt(
      analysis.amplitude,
      analysis.omegaRad,
      0,
      analysis.waveType,
      tSec
    );
    const angleRad = analysis.omegaRad * tSec;
    const angleDeg = (angleRad * 180) / Math.PI;
    const totalPhaseRad = angleRad + analysis.phiRadSigned;
    const totalPhaseDeg = (totalPhaseRad * 180) / Math.PI;
    const cycleFraction = analysis.periodMs > 0 ? tMs / analysis.periodMs : 0;

    return {
      isValid: true,
      inPlotRange: tMs >= 0 && tMs <= maxTimeMs,
      probe: {
        tMs,
        tSec,
        cycleFraction,
        angleRad,
        angleDeg,
        totalPhaseRad,
        totalPhaseDeg,
        vShifted,
        vRef,
        deltaV: vShifted - vRef,
      },
    };
  }, [analysis, customTimeInput, customTimeUnit, maxTimeMs]);

  // Active time being inspected on the graph (Pinned takes priority over hover)
  const activeTimeMs =
    pinnedTimeMs !== null
      ? Math.max(0, Math.min(maxTimeMs, pinnedTimeMs))
      : hoverTimeMs !== null
      ? Math.max(0, Math.min(maxTimeMs, hoverTimeMs))
      : null;

  const activeProbe = useMemo<CursorProbe | null>(() => {
    if (!analysis.isValid || activeTimeMs === null) return null;
    const tSec = activeTimeMs / 1000;
    const vShifted = evaluateWaveAt(
      analysis.amplitude,
      analysis.omegaRad,
      analysis.phiRadSigned,
      analysis.waveType,
      tSec
    );
    const vRef = evaluateWaveAt(
      analysis.amplitude,
      analysis.omegaRad,
      0,
      analysis.waveType,
      tSec
    );
    const angleRad = analysis.omegaRad * tSec;
    const angleDeg = (angleRad * 180) / Math.PI;
    const totalPhaseRad = angleRad + analysis.phiRadSigned;
    const totalPhaseDeg = (totalPhaseRad * 180) / Math.PI;
    const cycleFraction =
      analysis.periodMs > 0 ? activeTimeMs / analysis.periodMs : 0;

    return {
      tMs: activeTimeMs,
      tSec,
      cycleFraction,
      angleRad,
      angleDeg,
      totalPhaseRad,
      totalPhaseDeg,
      vShifted,
      vRef,
      deltaV: vShifted - vRef,
    };
  }, [analysis, activeTimeMs]);

  const pinTimeAndSyncInput = (tMs: number) => {
    setPinnedTimeMs(tMs);
    if (customTimeUnit === 's') {
      setCustomTimeInput((tMs / 1000).toFixed(5));
    } else {
      setCustomTimeInput(Number(tMs.toFixed(3)).toString());
    }
  };

  const handleCustomTimeChange = (val: string, unit: 'ms' | 's') => {
    setCustomTimeInput(val);
    setCustomTimeUnit(unit);
    const num = Number(val.trim().replace(/,/g, '.'));
    if (Number.isFinite(num) && val.trim() !== '') {
      const tMs = unit === 's' ? num * 1000 : num;
      onChangeParams({
        ...params,
        tUjiMs: Number(tMs.toFixed(3)),
      });
      if (tMs >= 0 && tMs <= maxTimeMs) {
        setPinnedTimeMs(tMs);
      }
    }
  };

  const computeTimeFromClientX = (clientX: number): number | null => {
    if (!svgRef.current || !analysis.isValid) return null;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const scaleX = svgWidth / rect.width;
    const svgX = (clientX - rect.left) * scaleX;
    const clampedX = Math.max(padLeft, Math.min(svgWidth - padRight, svgX));
    const ratio = (clampedX - padLeft) / innerW;
    return ratio * maxTimeMs;
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const t = computeTimeFromClientX(e.clientX);
    if (t !== null) {
      setHoverTimeMs(t);
    }
  };

  const handleSvgMouseLeave = () => {
    setHoverTimeMs(null);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const t = computeTimeFromClientX(e.clientX);
    if (t === null) return;
    if (pinnedTimeMs !== null) {
      setPinnedTimeMs(null);
    } else {
      pinTimeAndSyncInput(t);
    }
  };

  const handleSvgTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 0) return;
    const t = computeTimeFromClientX(e.touches[0].clientX);
    if (t !== null) {
      pinTimeAndSyncInput(t);
    }
  };

  // Minor & Major Grid Divisions
  const minorTimeFractions = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i <= 25; i++) {
      arr.push(i * 0.05); // Every 0.05T up to 1.25T
    }
    return arr;
  }, []);

  const majorTimeFractions = [
    0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0, 1.125, 1.25,
  ];

  const minorVoltageFactors = [
    -1.1, -0.9, -0.8, -0.7, -0.6, -0.4, -0.3, -0.2, -0.1, 0.1, 0.2, 0.3, 0.4,
    0.6, 0.7, 0.8, 0.9, 1.1,
  ];
  const majorVoltageFactors = [-1.0, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* Header & Quick Sample Presets */}
      <div className="cafe-card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-2xl">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
            [03 · AC SINUSOIDAL WAVEFORM SIMULATOR]
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-[#f4f4f5] tracking-[-0.02em] print:text-black">
            3. AC Sinusoidal Waveform Simulator &amp; Analytical Solver
          </h2>
          <p className="text-xs sm:text-sm text-[#c4c9cf] print:text-zinc-600">
            Sentuh/geser pada grafik osiloskop atau masukkan nilai waktu kustom <code className="text-[#f4f4f5]">t</code> untuk membaca nilai tegangan <code className="text-[#f4f4f5]">v(t)</code> secara instan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 print:hidden">
          <span className="hidden sm:inline text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
            Preset:
          </span>
          <button
            type="button"
            onClick={() => {
              setPinnedTimeMs(null);
              setCustomTimeInput('8');
              setCustomTimeUnit('ms');
              onChangeParams({
                questionLabel: 'PE 118 NO 7 H.256',
                quantityType: 'i',
                amplitude: 5,
                omegaInput: '100π',
                waveType: 'sin',
                phaseSign: '-',
                phiInput: '0.432',
                tUjiMs: 8,
                vTarget: 3,
              });
            }}
            className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-mono bg-[#222227] hover:bg-[#2c2c33] text-[#f4f4f5] border border-white/[0.16] transition-colors cursor-pointer text-center"
          >
            PE 118 NO 7: i(t) = 5 sin(100πt - 0.432) A
          </button>
          <button
            type="button"
            onClick={() => {
              setPinnedTimeMs(null);
              setCustomTimeInput('5');
              setCustomTimeUnit('ms');
              onChangeParams({
                questionLabel: 'Problem 10 H.255',
                quantityType: 'i',
                amplitude: 30,
                omegaInput: '100π',
                waveType: 'sin',
                phaseSign: '+',
                phiInput: '0.35',
                tUjiMs: 5,
                vTarget: 15,
              });
            }}
            className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-mono bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer text-center"
          >
            Problem 10: i(t) = 30 sin(100πt + 0.35) A
          </button>
          <button
            type="button"
            onClick={() => {
              setPinnedTimeMs(null);
              setCustomTimeInput('10');
              setCustomTimeUnit('ms');
              onChangeParams({
                questionLabel: 'Problem 12 H.255',
                quantityType: 'v',
                amplitude: 340,
                omegaInput: '50π',
                waveType: 'sin',
                phaseSign: '-',
                phiInput: '0.541',
                tUjiMs: 10,
                vTarget: 200,
              });
            }}
            className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-mono bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer text-center"
          >
            Problem 12: v(t) = 340 sin(50πt - 0.541) V
          </button>
        </div>
      </div>

      {/* ====================================================================
          CENTERPIECE: FULL-WIDTH INTERACTIVE OSCILLOSCOPE GRAPH
         ==================================================================== */}
      <div className="cafe-card rounded-2xl p-3.5 sm:p-6 space-y-4 sm:space-y-5">
        {/* Top Bar: Graph Title, Equation Badge, & Phase Status Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/[0.12] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                [INTERACTIVE OSCILLOSCOPE · 1.25 CYCLES]
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#101013] text-[#35ff92] border border-white/[0.14]">
                {analysis.equation}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#f4f4f5] tracking-[-0.015em] print:text-black">
              Grafik Interaktif Gelombang Sinusoidal AC terhadap Waktu t (ms)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Reference Wave */}
            <button
              type="button"
              aria-pressed={showRefWave}
              onClick={() => setShowRefWave((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition-colors cursor-pointer print:hidden ${
                showRefWave
                  ? 'bg-[#222227] text-[#f4f4f5] border-white/[0.18]'
                  : 'bg-[#101013] text-[#9ca3af] border-white/[0.08]'
              }`}
            >
              {showRefWave ? '● Ref Wave: ON' : '○ Ref Wave: OFF'}
            </button>

            {/* Toggle Key Markers */}
            <button
              type="button"
              aria-pressed={showKeyMarkers}
              onClick={() => setShowKeyMarkers((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition-colors cursor-pointer print:hidden ${
                showKeyMarkers
                  ? 'bg-[#222227] text-[#f4f4f5] border-white/[0.18]'
                  : 'bg-[#101013] text-[#9ca3af] border-white/[0.08]'
              }`}
            >
              {showKeyMarkers ? '● Titik Kunci: ON' : '○ Titik Kunci: OFF'}
            </button>

            {/* Phase Status Banner */}
            <div
              data-testid="phase-status-banner"
              className={`px-3.5 py-1.5 rounded-full font-mono text-xs font-bold border ${
                analysis.phaseStatusLabel === 'LEADING (MENDAHULUI)'
                  ? 'bg-[#35ff92]/15 text-[#35ff92] border-[#35ff92]/35'
                  : analysis.phaseStatusLabel === 'LAGGING (TERTINGGAL)'
                  ? 'bg-[#2f6bff]/20 text-[#f4f4f5] border-[#2f6bff]/50'
                  : 'bg-[#222227] text-[#c4c9cf] border-white/[0.14]'
              }`}
            >
              {analysis.phaseStatusBanner}
            </div>
          </div>
        </div>

        {/* Live Telemetry Readout Bar (Updates as you hover or touch-drag over the graph!) */}
        {analysis.isValid && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-2.5 sm:p-3 rounded-xl bg-[#101013] border border-white/[0.14] font-mono text-xs tabular-nums">
            <div className="px-2.5 py-2 rounded-lg bg-[#18181c] border border-white/[0.1]">
              <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] flex items-center justify-between">
                <span>WAKTU (t)</span>
                {pinnedTimeMs !== null ? (
                  <Lock className="w-3 h-3 text-[#35ff92]" />
                ) : (
                  <Crosshair className="w-3 h-3 text-[#9ca3af]" />
                )}
              </span>
              <div className="text-xs sm:text-sm font-bold text-[#f4f4f5] mt-0.5 truncate">
                {activeProbe
                  ? `${activeProbe.tMs.toFixed(2)} ms (${activeProbe.cycleFraction.toFixed(2)}T)`
                  : 'Sentuh/Hover...'}
              </div>
            </div>

            <div className="px-2.5 py-2 rounded-lg bg-[#18181c] border border-white/[0.1]">
              <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                SIMULASI v(t)
              </span>
              <div className="text-xs sm:text-sm font-bold text-[#35ff92] mt-0.5 truncate">
                {activeProbe ? `${activeProbe.vShifted.toFixed(2)} V` : `${analysis.vAtZero.toFixed(2)} V (t=0)`}
              </div>
            </div>

            <div className="px-2.5 py-2 rounded-lg bg-[#18181c] border border-white/[0.1]">
              <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                REFERENSI v_ref
              </span>
              <div className="text-xs sm:text-sm font-bold text-[#c4c9cf] mt-0.5 truncate">
                {activeProbe ? `${activeProbe.vRef.toFixed(2)} V` : '0.00 V (t=0)'}
              </div>
            </div>

            <div className="px-2.5 py-2 rounded-lg bg-[#18181c] border border-white/[0.1]">
              <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                SELISIH Δv
              </span>
              <div className="text-xs sm:text-sm font-bold text-[#6090ff] mt-0.5 truncate">
                {activeProbe
                  ? `${activeProbe.deltaV >= 0 ? '+' : ''}${activeProbe.deltaV.toFixed(2)} V`
                  : `${analysis.vAtZero >= 0 ? '+' : ''}${analysis.vAtZero.toFixed(2)} V`}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 px-2.5 py-2 rounded-lg bg-[#18181c] border border-white/[0.1] flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                SUDUT FASE (ωt)
              </span>
              <div className="text-xs sm:text-sm font-bold text-[#f4f4f5] mt-0.5 truncate">
                {activeProbe
                  ? `${activeProbe.angleRad.toFixed(2)} rad (${activeProbe.angleDeg.toFixed(1)}°)`
                  : '0.00 rad (0.0°)'}
              </div>
            </div>
          </div>
        )}

        {!analysis.isValid ? (
          <div className="p-6 rounded-xl bg-[#101013] border border-red-500/40 text-red-200 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{analysis.errorMessage}</span>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Main Interactive SVG Oscilloscope Canvas — Responsive Full Width on Mobile & Desktop */}
            <div className="w-full rounded-2xl bg-[#09090b] border border-white/[0.16] p-1.5 sm:p-3 shadow-inner">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                tabIndex={0}
                onMouseMove={handleSvgMouseMove}
                onMouseLeave={handleSvgMouseLeave}
                onClick={handleSvgClick}
                onTouchStart={handleSvgTouchMove}
                onTouchMove={handleSvgTouchMove}
                onKeyDown={(e) => {
                  const step = maxTimeMs / 100;
                  const curr = activeTimeMs ?? 0;
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    pinTimeAndSyncInput(Math.min(maxTimeMs, curr + step));
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    pinTimeAndSyncInput(Math.max(0, curr - step));
                  } else if (e.key === 'Home') {
                    e.preventDefault();
                    pinTimeAndSyncInput(0);
                  } else if (e.key === 'End') {
                    e.preventDefault();
                    pinTimeAndSyncInput(maxTimeMs);
                  } else if (e.key === 'Escape') {
                    setPinnedTimeMs(null);
                  }
                }}
                className="w-full h-auto cursor-crosshair select-none touch-pan-y rounded-xl"
                role="img"
                aria-label="Grafik Osiloskop Interaktif Gelombang Sinusoidal 1.25 Siklus. Gunakan tombol panah Kiri/Kanan untuk menggeser waktu kursor t."
              >
                <defs>
                  <linearGradient id="waveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f6bff" stopOpacity="0.24" />
                    <stop offset="50%" stopColor="#2f6bff" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#2f6bff" stopOpacity="0.24" />
                  </linearGradient>
                </defs>

                {/* Plot Background Frame */}
                <rect
                  x={padLeft}
                  y={padTop}
                  width={innerW}
                  height={innerH}
                  fill="#050507"
                  stroke="rgba(255, 255, 255, 0.18)"
                  strokeWidth={1}
                />

                {/* 1. Minor Sub-Gridlines (Fine Graticule) */}
                {minorVoltageFactors.map((factor) => {
                  const y = mapY(factor * analysis.amplitude);
                  return (
                    <line
                      key={`minor-h-${factor}`}
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.04)"
                      strokeWidth={1}
                    />
                  );
                })}

                {minorTimeFractions.map((frac) => {
                  const x = mapX(frac * analysis.periodMs);
                  return (
                    <line
                      key={`minor-v-${frac}`}
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={svgHeight - padBottom}
                      stroke="rgba(255, 255, 255, 0.04)"
                      strokeWidth={1}
                    />
                  );
                })}

                {/* 2. Major Horizontal Voltage Gridlines (-A to +A in 0.25A steps) */}
                {majorVoltageFactors.map((factor) => {
                  const val = factor * analysis.amplitude;
                  const y = mapY(val);
                  const isZeroAxis = factor === 0;
                  const isPeak = Math.abs(factor) === 1.0;
                  return (
                    <g key={`major-h-${factor}`}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke={
                          isZeroAxis
                            ? 'rgba(244, 244, 245, 0.42)'
                            : isPeak
                            ? 'rgba(255, 255, 255, 0.16)'
                            : 'rgba(255, 255, 255, 0.10)'
                        }
                        strokeWidth={isZeroAxis ? 1.6 : 1}
                        strokeDasharray={isZeroAxis ? undefined : '4 4'}
                      />
                      <text
                        x={padLeft - 10}
                        y={y + 4}
                        textAnchor="end"
                        className={`font-mono text-[10.5px] ${
                          isZeroAxis || isPeak
                            ? 'fill-[#f4f4f5] font-bold'
                            : 'fill-[#9ca3af]'
                        }`}
                      >
                        {val.toFixed(1)} V
                      </text>
                    </g>
                  );
                })}

                {/* 3. Major Vertical Time Gridlines (0 to 1.25T in 0.125T steps) */}
                {majorTimeFractions.map((cycleFrac) => {
                  const tMs = cycleFrac * analysis.periodMs;
                  const x = mapX(tMs);
                  const isFullPeriod = cycleFrac === 1.0;
                  const isQuarter =
                    cycleFrac === 0 ||
                    cycleFrac === 0.25 ||
                    cycleFrac === 0.5 ||
                    cycleFrac === 0.75 ||
                    cycleFrac === 1.0 ||
                    cycleFrac === 1.25;
                  return (
                    <g key={`major-v-${cycleFrac}`}>
                      <line
                        x1={x}
                        y1={padTop}
                        x2={x}
                        y2={svgHeight - padBottom}
                        stroke={
                          isFullPeriod
                            ? 'rgba(53, 255, 146, 0.55)'
                            : isQuarter
                            ? 'rgba(255, 255, 255, 0.15)'
                            : 'rgba(255, 255, 255, 0.08)'
                        }
                        strokeWidth={isFullPeriod ? 1.5 : 1}
                        strokeDasharray={isFullPeriod ? '4 3' : '3 3'}
                      />
                      {/* Oscilloscope zero-axis tick marks */}
                      <line
                        x1={x}
                        y1={zeroY - 4}
                        x2={x}
                        y2={zeroY + 4}
                        stroke="rgba(244, 244, 245, 0.55)"
                        strokeWidth={1.2}
                      />
                      <text
                        x={x}
                        y={svgHeight - padBottom + 18}
                        textAnchor="middle"
                        className={`font-mono text-[10.5px] ${
                          isFullPeriod
                            ? 'fill-[#35ff92] font-bold'
                            : isQuarter
                            ? 'fill-[#f4f4f5]'
                            : 'fill-[#9ca3af]'
                        }`}
                      >
                        {tMs.toFixed(2)}
                      </text>
                      {isQuarter && (
                        <text
                          x={x}
                          y={svgHeight - padBottom + 33}
                          textAnchor="middle"
                          className={`font-mono text-[9.5px] ${
                            isFullPeriod ? 'fill-[#35ff92]' : 'fill-[#9ca3af]'
                          }`}
                        >
                          ({cycleFrac}T)
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Target Voltage Horizontal Line (if within ±amplitude) */}
                {!analysis.targetExceedsAmplitude && (
                  <g>
                    <line
                      x1={padLeft}
                      y1={mapY(analysis.vTarget)}
                      x2={svgWidth - padRight}
                      y2={mapY(analysis.vTarget)}
                      stroke="#35ff92"
                      strokeWidth={1.3}
                      strokeDasharray="5 4"
                    />
                    <rect
                      x={svgWidth - padRight - 134}
                      y={mapY(analysis.vTarget) - 18}
                      width={130}
                      height={16}
                      rx={4}
                      fill="#09090b"
                      stroke="rgba(53, 255, 146, 0.4)"
                    />
                    <text
                      x={svgWidth - padRight - 69}
                      y={mapY(analysis.vTarget) - 7}
                      textAnchor="middle"
                      className="fill-[#35ff92] font-mono text-[9.5px] font-bold"
                    >
                      V_target = {analysis.vTarget} V
                    </text>
                  </g>
                )}

                {/* Area Gradient under Phase-Shifted Wave */}
                <path d={shiftedAreaData} fill="url(#waveAreaGrad)" />

                {/* Reference Wave Curve (Dashed Gray) */}
                {showRefWave && (
                  <path
                    d={refPathData}
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeDasharray="7 5"
                    opacity={0.75}
                  />
                )}

                {/* Phase-Shifted Wave Curve (Solid Electric Blue) */}
                <path
                  d={shiftedPathData}
                  fill="none"
                  stroke="#2f6bff"
                  strokeWidth={3.2}
                />

                {/* Fixed Key Point Markers (v(0), v(10ms), V_target, Peak v_max) */}
                {showKeyMarkers && (
                  <g>
                    {/* v(0) */}
                    <circle
                      cx={mapX(0)}
                      cy={mapY(analysis.vAtZero)}
                      r={5}
                      fill="#f4f4f5"
                      stroke="#09090b"
                      strokeWidth={1.8}
                    />

                    {/* v(10 ms) if 10ms <= 1.25T */}
                    {10 <= maxTimeMs && (
                      <g>
                        <circle
                          cx={mapX(10)}
                          cy={mapY(analysis.vAt10ms)}
                          r={5}
                          fill="#6090ff"
                          stroke="#09090b"
                          strokeWidth={1.8}
                        />
                      </g>
                    )}

                    {/* t_max (First Peak) */}
                    {analysis.tAtMaxMs <= maxTimeMs && (
                      <g>
                        <circle
                          cx={mapX(analysis.tAtMaxMs)}
                          cy={mapY(analysis.amplitude)}
                          r={5.5}
                          fill="#f4f4f5"
                          stroke="#2f6bff"
                          strokeWidth={2.2}
                        />
                        <text
                          x={mapX(analysis.tAtMaxMs)}
                          y={mapY(analysis.amplitude) - 10}
                          textAnchor="middle"
                          className="fill-[#f4f4f5] font-mono text-[10px] font-bold"
                        >
                          Peak ({analysis.tAtMaxFormatted})
                        </text>
                      </g>
                    )}

                    {/* First V_target crossing */}
                    {analysis.tAtTargetMs !== null &&
                      analysis.tAtTargetMs <= maxTimeMs && (
                        <g>
                          <circle
                            cx={mapX(analysis.tAtTargetMs)}
                            cy={mapY(analysis.vTarget)}
                            r={5.5}
                            fill="#35ff92"
                            stroke="#09090b"
                            strokeWidth={1.8}
                          />
                        </g>
                      )}
                  </g>
                )}

                {/* ============================================================
                    INTERACTIVE HOVER / PIN CROSSHAIR & TOOLTIP OVERLAY
                   ============================================================ */}
                {activeProbe && (
                  <g pointerEvents="none">
                    {/* Vertical Time Crosshair Line */}
                    <line
                      x1={mapX(activeProbe.tMs)}
                      y1={padTop}
                      x2={mapX(activeProbe.tMs)}
                      y2={svgHeight - padBottom}
                      stroke="#35ff92"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />

                    {/* Horizontal Voltage Crosshair Line to Y-Axis */}
                    <line
                      x1={padLeft}
                      y1={mapY(activeProbe.vShifted)}
                      x2={mapX(activeProbe.tMs)}
                      y2={mapY(activeProbe.vShifted)}
                      stroke="rgba(53, 255, 146, 0.55)"
                      strokeWidth={1.2}
                      strokeDasharray="3 3"
                    />

                    {/* Reference Wave Intersection Dot */}
                    {showRefWave && (
                      <circle
                        cx={mapX(activeProbe.tMs)}
                        cy={mapY(activeProbe.vRef)}
                        r={4.5}
                        fill="#9ca3af"
                        stroke="#09090b"
                        strokeWidth={1.5}
                      />
                    )}

                    {/* Active Wave Intersection Dot with Outer Halo */}
                    <circle
                      cx={mapX(activeProbe.tMs)}
                      cy={mapY(activeProbe.vShifted)}
                      r={9}
                      fill="rgba(53, 255, 146, 0.22)"
                    />
                    <circle
                      cx={mapX(activeProbe.tMs)}
                      cy={mapY(activeProbe.vShifted)}
                      r={5.5}
                      fill="#35ff92"
                      stroke="#09090b"
                      strokeWidth={2}
                    />

                    {/* Floating HUD Tooltip Box inside SVG */}
                    {(() => {
                      const cursorX = mapX(activeProbe.tMs);
                      const cursorY = mapY(activeProbe.vShifted);
                      const boxW = 218;
                      const boxH = 88;
                      const flipLeft = cursorX + boxW + 24 > svgWidth - padRight;
                      const boxX = flipLeft ? cursorX - boxW - 14 : cursorX + 14;
                      const boxY = Math.max(
                        padTop + 8,
                        Math.min(svgHeight - padBottom - boxH - 8, cursorY - boxH / 2)
                      );

                      return (
                        <g>
                          <rect
                            x={boxX}
                            y={boxY}
                            width={boxW}
                            height={boxH}
                            rx={10}
                            fill="rgba(18, 18, 22, 0.94)"
                            stroke="rgba(255, 255, 255, 0.24)"
                            strokeWidth={1.2}
                          />
                          <text
                            x={boxX + 12}
                            y={boxY + 19}
                            className="fill-[#35ff92] font-mono text-[10.5px] font-bold"
                          >
                            t = {activeProbe.tMs.toFixed(2)} ms ({activeProbe.cycleFraction.toFixed(2)}T)
                          </text>
                          <text
                            x={boxX + 12}
                            y={boxY + 38}
                            className="fill-[#f4f4f5] font-mono text-[11.5px] font-bold"
                          >
                            v(t)     = {activeProbe.vShifted.toFixed(2)} V
                          </text>
                          <text
                            x={boxX + 12}
                            y={boxY + 55}
                            className="fill-[#9ca3af] font-mono text-[10.5px]"
                          >
                            v_ref(t) = {activeProbe.vRef.toFixed(2)} V
                          </text>
                          <text
                            x={boxX + 12}
                            y={boxY + 72}
                            className="fill-[#c4c9cf] font-mono text-[10px]"
                          >
                            ωt = {activeProbe.angleRad.toFixed(2)} rad ({activeProbe.angleDeg.toFixed(1)}°)
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}

                {/* Axis Titles */}
                <text
                  x={padLeft + 8}
                  y={padTop - 12}
                  className="fill-[#f4f4f5] font-mono text-[11.5px] font-semibold"
                >
                  Tegangan v(t) [Volt]
                </text>
                <text
                  x={svgWidth - padRight}
                  y={svgHeight - 6}
                  textAnchor="end"
                  className="fill-[#f4f4f5] font-mono text-[11.5px] font-semibold"
                >
                  Waktu t [milidetik / ms]
                </text>
              </svg>
            </div>

            {/* ==============================================================
                CUSTOM TIME INPUT BOX & INTERACTIVE TIME SCRUBBER BAR
               ============================================================== */}
            <div className="p-3 sm:p-4 rounded-xl bg-[#101013] border border-white/[0.14] space-y-3 sm:space-y-3.5 print:hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
                {/* Custom Time Value Input Box */}
                <div className="lg:col-span-5 flex flex-col sm:flex-row sm:items-center gap-2">
                  <label
                    htmlFor="custom-time-input"
                    className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.06em] text-[#f4f4f5] whitespace-nowrap"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#35ff92]" />
                    <span>Input Waktu t:</span>
                  </label>

                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      id="custom-time-input"
                      type="text"
                      value={customTimeInput}
                      onChange={(e) =>
                        handleCustomTimeChange(e.target.value, customTimeUnit)
                      }
                      placeholder="Contoh: 10 atau 7.45"
                      className="cafe-input w-full px-3 py-2 sm:py-1.5 text-base sm:text-sm font-mono tabular-nums rounded-xl"
                    />

                    {/* Unit Selector (ms / s) */}
                    <div className="inline-flex rounded-xl bg-[#18181c] p-0.5 border border-white/[0.14] shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCustomTimeChange(customTimeInput, 'ms')}
                        className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                          customTimeUnit === 'ms'
                            ? 'bg-[#f4f4f5] text-[#171515] font-bold'
                            : 'text-[#9ca3af] hover:text-[#f4f4f5]'
                        }`}
                      >
                        ms
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCustomTimeChange(customTimeInput, 's')}
                        className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                          customTimeUnit === 's'
                            ? 'bg-[#f4f4f5] text-[#171515] font-bold'
                            : 'text-[#9ca3af] hover:text-[#f4f4f5]'
                        }`}
                      >
                        s
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Custom Time Evaluation Result Box */}
                <div className="lg:col-span-7">
                  {customTimeEval.isValid && customTimeEval.probe ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#18181c] border border-white/[0.14] font-mono text-xs tabular-nums">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          <span className="text-[#9ca3af]">t = </span>
                          <strong className="text-[#f4f4f5]">
                            {customTimeEval.probe.tMs.toFixed(2)} ms
                          </strong>{' '}
                          <span className="text-[#9ca3af]">
                            ({customTimeEval.probe.tSec.toFixed(4)} s)
                          </span>
                        </span>
                        <span>
                          <span className="text-[#9ca3af]">v(t) = </span>
                          <strong
                            data-testid="custom-time-result"
                            className="text-sm text-[#35ff92]"
                          >
                            {customTimeEval.probe.vShifted.toFixed(2)} V
                          </strong>
                        </span>
                        <span>
                          <span className="text-[#9ca3af]">v_ref = </span>
                          <span className="text-[#c4c9cf]">
                            {customTimeEval.probe.vRef.toFixed(2)} V
                          </span>
                        </span>
                      </div>

                      <span className="text-[11px] text-[#9ca3af]">
                        {customTimeEval.inPlotRange
                          ? `● Ditampilkan di grafik (${customTimeEval.probe.cycleFraction.toFixed(2)}T)`
                          : `Di luar 1.25T (${customTimeEval.probe.cycleFraction.toFixed(2)}T)`}
                      </span>
                    </div>
                  ) : (
                    <div className="px-3.5 py-2 rounded-xl bg-[#18181c] border border-red-500/30 text-xs font-mono text-red-300">
                      {customTimeEval.error}
                    </div>
                  )}
                </div>
              </div>

              {/* Scrubber Slider & Quick Jump Buttons */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-white/[0.1]">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#9ca3af] whitespace-nowrap">
                    Geser Kursor:
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={maxTimeMs}
                    step={maxTimeMs / 500}
                    value={activeTimeMs ?? 0}
                    onChange={(e) => pinTimeAndSyncInput(Number(e.target.value))}
                    className="w-full accent-[#35ff92] cursor-pointer"
                    aria-label="Geser waktu t pada grafik"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-[#9ca3af] mr-1">Lompat ke:</span>
                  <button
                    type="button"
                    onClick={() => pinTimeAndSyncInput(0)}
                    className="px-2.5 py-1 rounded-full bg-[#18181c] hover:bg-[#222227] text-[#f4f4f5] border border-white/[0.14] cursor-pointer"
                  >
                    t = 0 ms
                  </button>
                  <button
                    type="button"
                    onClick={() => pinTimeAndSyncInput(10)}
                    className="px-2.5 py-1 rounded-full bg-[#18181c] hover:bg-[#222227] text-[#f4f4f5] border border-white/[0.14] cursor-pointer"
                  >
                    t = 10 ms
                  </button>
                  {analysis.tAtTargetMs !== null &&
                    analysis.tAtTargetMs <= maxTimeMs && (
                      <button
                        type="button"
                        onClick={() => pinTimeAndSyncInput(analysis.tAtTargetMs!)}
                        className="px-2.5 py-1 rounded-full bg-[#18181c] hover:bg-[#222227] text-[#35ff92] border border-[#35ff92]/30 cursor-pointer"
                      >
                        V_target ({analysis.tAtTargetFormatted})
                      </button>
                    )}
                  {analysis.tAtMaxMs <= maxTimeMs && (
                    <button
                      type="button"
                      onClick={() => pinTimeAndSyncInput(analysis.tAtMaxMs)}
                      className="px-2.5 py-1 rounded-full bg-[#18181c] hover:bg-[#222227] text-[#6090ff] border border-[#2f6bff]/40 cursor-pointer"
                    >
                      Peak ({analysis.tAtMaxFormatted})
                    </button>
                  )}
                  {pinnedTimeMs !== null && (
                    <button
                      type="button"
                      onClick={() => setPinnedTimeMs(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-950/40 hover:bg-red-950/70 text-red-300 border border-red-500/30 cursor-pointer"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Lepas Kunci</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Plot Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#9ca3af] px-1">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-5 h-0.5 border-b-2 border-dashed border-[#9ca3af] inline-block" />
                  <span>Referensi: A {analysis.waveType}(ωt)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#f4f4f5]">
                  <span className="w-5 h-0.5 bg-[#2f6bff] inline-block" />
                  <span>Simulasi: {analysis.equation}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="text-[#f4f4f5]">● v(0) &amp; Peak</span>
                <span className="text-[#6090ff]">● v(10 ms)</span>
                <span className="text-[#35ff92]">● V_target &amp; Kursor Aktif</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          BELOW CENTERPIECE: PARAMETER CONTROLS (LEFT) & ANALYTICAL SOLVER (RIGHT)
         ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left Column (5 cols): Parameter Controls */}
        <div className="lg:col-span-5 cafe-card rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.12] pb-3.5">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                [PARAMETER INPUT]
              </span>
              <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] mt-0.5 print:text-black">
                Parameter Gelombang Sinusoidal
              </h3>
            </div>
            <span className="px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.06em] rounded-full bg-[#222227] text-[#35ff92] border border-white/[0.14]">
              REAL-TIME
            </span>
          </div>

          {/* 0. No. / Ket. Soal & Besaran AC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="sim-question-label"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                No. / Ket. Soal
              </label>
              <input
                id="sim-question-label"
                type="text"
                value={params.questionLabel ?? 'PE 118 NO 7 H.256'}
                onChange={(e) =>
                  onChangeParams({
                    ...params,
                    questionLabel: e.target.value,
                  })
                }
                placeholder="PE 118 NO 7 H.256"
                className="cafe-input w-full px-3.5 py-2 text-base sm:text-sm font-mono rounded-xl"
              />
            </div>

            <div>
              <label
                htmlFor="sim-quantity-type"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                Besaran AC
              </label>
              <select
                id="sim-quantity-type"
                value={params.quantityType ?? 'v'}
                onChange={(e) =>
                  onChangeParams({
                    ...params,
                    quantityType: e.target.value as ACQuantityType,
                  })
                }
                className="cafe-input w-full px-3.5 py-2 text-base sm:text-sm font-mono rounded-xl"
              >
                <option value="i">Arus — i(t) [Ampere]</option>
                <option value="v">Tegangan — v(t) [Volt]</option>
              </select>
            </div>
          </div>

          {/* 1. Amplitudo A (Volt / Ampere) */}
          <div>
            <label
              htmlFor="sim-amplitude"
              className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
            >
              Amplitudo Puncak A ({analysis.unitSymbol === 'A' ? 'Ampere' : 'Volt'})
            </label>
            <input
              id="sim-amplitude"
              type="number"
              min="0.01"
              step="any"
              value={params.amplitude || ''}
              onChange={(e) =>
                onChangeParams({
                  ...params,
                  amplitude: Number(e.target.value),
                })
              }
              placeholder="340"
              className="cafe-input w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-xl"
            />
          </div>

          {/* 2. Kecepatan Sudut ω (rad/s) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="sim-omega"
                className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]"
              >
                Kecepatan Sudut ω (rad/s)
              </label>
              {analysis.isValid && (
                <span className="text-[11px] font-mono tabular-nums text-[#35ff92]">
                  {params.omegaInput} rad/s ≈ {analysis.omegaRad.toFixed(2)} rad/s
                </span>
              )}
            </div>
            <input
              id="sim-omega"
              type="text"
              value={params.omegaInput}
              onChange={(e) =>
                onChangeParams({
                  ...params,
                  omegaInput: e.target.value,
                })
              }
              placeholder="50π"
              className="cafe-input w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-xl"
            />
            <div className="flex flex-wrap gap-1.5 mt-2 print:hidden">
              {['50π', '100π', '60π', '120π', '200π'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeParams({ ...params, omegaInput: preset })}
                  className="px-2.5 py-0.5 text-[11px] font-mono rounded-full bg-[#101013] hover:bg-[#222227] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Bentuk Gelombang */}
          <div>
            <label
              htmlFor="sim-wavetype"
              className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
            >
              Bentuk Fungsi Gelombang
            </label>
            <select
              id="sim-wavetype"
              value={params.waveType}
              onChange={(e) =>
                onChangeParams({
                  ...params,
                  waveType: e.target.value as WaveFunctionType,
                })
              }
              className="cafe-input w-full px-3.5 py-2 text-sm font-mono rounded-xl"
            >
              <option value="sin">Sinus: v(t) = A sin(ωt ± φ)</option>
              <option value="cos">Cosinus: v(t) = A cos(ωt ± φ)</option>
            </select>
          </div>

          {/* 4. Sudut Beda Fase φ (rad) & Sign */}
          <div className="space-y-2.5 pt-2 border-t border-white/[0.12]">
            <label
              htmlFor="sim-phasesign"
              className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]"
            >
              Tanda &amp; Jenis Beda Fase (±φ)
            </label>
            <select
              id="sim-phasesign"
              value={params.phaseSign}
              onChange={(e) =>
                onChangeParams({
                  ...params,
                  phaseSign: e.target.value as PhaseSignType,
                })
              }
              className="cafe-input w-full px-3.5 py-2 text-sm font-mono rounded-xl"
            >
              <option value="0">In Phase (0) — Sefase (φ = 0)</option>
              <option value="+">Plus / Lead (+) — Mendahului (+φ)</option>
              <option value="-">Minus / Lag (-) — Tertinggal (-φ)</option>
            </select>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="sim-phi"
                  className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]"
                >
                  Besar Sudut Beda Fase φ (rad)
                </label>
                {analysis.isValid && (
                  <span className="text-[11px] font-mono tabular-nums text-[#f4f4f5]">
                    φ = {analysis.phiDegFormatted}
                  </span>
                )}
              </div>
              <input
                id="sim-phi"
                type="text"
                disabled={params.phaseSign === '0'}
                value={params.phaseSign === '0' ? '0' : params.phiInput}
                onChange={(e) =>
                  onChangeParams({
                    ...params,
                    phiInput: e.target.value,
                  })
                }
                placeholder="0.541"
                className="cafe-input w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-xl disabled:opacity-50"
              />
              <div className="flex flex-wrap gap-1.5 mt-2 print:hidden">
                {['0.541', '0.432', 'π/6', 'π/4', 'π/3'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      onChangeParams({
                        ...params,
                        phaseSign: params.phaseSign === '0' ? '-' : params.phaseSign,
                        phiInput: preset,
                      })
                    }
                    className="px-2.5 py-0.5 text-[11px] font-mono rounded-full bg-[#101013] hover:bg-[#222227] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer"
                  >
                    {preset} rad
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Waktu Uji t_uji (ms) [c] & Target Tegangan/Arus [d] */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.12]">
            <div>
              <label
                htmlFor="sim-tuji"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                Waktu Uji t_uji (ms) [Poin c]
              </label>
              <input
                id="sim-tuji"
                type="number"
                step="any"
                min="0"
                value={params.tUjiMs ?? 10}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCustomTimeInput(e.target.value);
                  setCustomTimeUnit('ms');
                  onChangeParams({
                    ...params,
                    tUjiMs: val,
                  });
                }}
                placeholder="8"
                className="cafe-input w-full px-3.5 py-2 text-base sm:text-sm font-mono tabular-nums rounded-xl"
              />
            </div>

            <div>
              <label
                htmlFor="sim-vtarget"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                Target {analysis.quantityType === 'i' ? 'i_target (A)' : 'v_target (V)'} [Poin d]
              </label>
              <input
                id="sim-vtarget"
                type="number"
                step="any"
                value={params.vTarget}
                onChange={(e) =>
                  onChangeParams({
                    ...params,
                    vTarget: Number(e.target.value),
                  })
                }
                placeholder="3"
                className="cafe-input w-full px-3.5 py-2 text-base sm:text-sm font-mono tabular-nums rounded-xl"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveSimulation}
            disabled={!analysis.isValid}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs sm:text-sm font-semibold bg-[#f4f4f5] hover:bg-white text-[#171515] disabled:opacity-40 transition-all active:scale-95 cursor-pointer print:hidden"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Save Hasil Percobaan ke Log Gelombang</span>
          </button>
        </div>

        {/* Right Column (7 cols): Analytical Problem Solver Box (Hasil Analisis Jawaban Soal) */}
        <div className="lg:col-span-7 cafe-card rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/[0.12] pb-3.5">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                [ANALYTICAL PROBLEM SOLVER]
              </span>
              <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] mt-0.5 print:text-black">
                Hasil Analisis Jawaban Soal (a s.d. e) &amp; Evaluasi Waktu Kustom
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#9ca3af]">
              TAP KARTU UNTUK LIHAT DI GRAFIK
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* (a) Parameter Dasar */}
            <div className="md:col-span-2 p-4 rounded-xl bg-[#101013] border border-white/[0.12] space-y-2.5">
              <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#9ca3af]">
                (a) Parameter Dasar Gelombang (T, f, dan φ dalam Derajat)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs tabular-nums">
                <div className="p-3 rounded-xl bg-[#18181c] border border-white/[0.12]">
                  <span className="text-[#9ca3af] block text-[10px] uppercase tracking-[0.06em] mb-0.5">
                    Periode (T = 2π / ω)
                  </span>
                  <span className="text-[#f4f4f5] font-bold text-sm">
                    {analysis.periodS.toFixed(4)} s ({analysis.periodMs.toFixed(2)} ms)
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#18181c] border border-white/[0.12]">
                  <span className="text-[#9ca3af] block text-[10px] uppercase tracking-[0.06em] mb-0.5">
                    Frekuensi (f = 1 / T)
                  </span>
                  <span className="text-[#35ff92] font-bold text-sm">
                    {analysis.frequencyHz.toFixed(2)} Hz
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#18181c] border border-white/[0.12]">
                  <span className="text-[#9ca3af] block text-[10px] uppercase tracking-[0.06em] mb-0.5">
                    Sudut Beda Fase (φ_deg)
                  </span>
                  <span
                    data-testid="solver-phi-deg"
                    className="text-[#f4f4f5] font-bold text-sm"
                  >
                    {analysis.phiDegFormatted} ({analysis.phiRadSigned.toFixed(3)} rad)
                  </span>
                </div>
              </div>
            </div>

            {/* (b) v saat t = 0 */}
            <button
              type="button"
              onClick={() => pinTimeAndSyncInput(0)}
              className="text-left p-4 rounded-xl bg-[#101013] hover:bg-[#141418] border border-white/[0.12] hover:border-white/[0.24] transition-colors cursor-pointer space-y-1"
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#9ca3af]">
                (b) Tegangan v saat t = 0 s
              </div>
              <div className="text-[11px] font-mono text-[#c4c9cf]">
                v(0) = {analysis.amplitude} {analysis.waveType}({analysis.phiRadSigned.toFixed(3)})
              </div>
              <div
                data-testid="solver-v0"
                className="text-base font-mono tabular-nums font-bold text-[#f4f4f5] pt-1"
              >
                {analysis.vAtZero.toFixed(2)} V
              </div>
            </button>

            {/* (c) v saat t = 10 ms */}
            <button
              type="button"
              onClick={() => pinTimeAndSyncInput(10)}
              className="text-left p-4 rounded-xl bg-[#101013] hover:bg-[#141418] border border-white/[0.12] hover:border-white/[0.24] transition-colors cursor-pointer space-y-1"
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#9ca3af]">
                (c) Tegangan v saat t = 10 ms (0.01 s)
              </div>
              <div className="text-[11px] font-mono text-[#c4c9cf]">
                v(0.01) = {analysis.amplitude} {analysis.waveType}(ω(0.01) ± φ)
              </div>
              <div
                data-testid="solver-v10ms"
                className="text-base font-mono tabular-nums font-bold text-[#f4f4f5] pt-1"
              >
                {analysis.vAt10ms.toFixed(2)} V
              </div>
            </button>

            {/* (d) t saat v = V_target pertama (t >= 0) */}
            <button
              type="button"
              onClick={() => {
                if (analysis.tAtTargetMs !== null) {
                  pinTimeAndSyncInput(analysis.tAtTargetMs);
                }
              }}
              className="text-left p-4 rounded-xl bg-[#101013] hover:bg-[#141418] border border-white/[0.12] hover:border-white/[0.24] transition-colors cursor-pointer space-y-1"
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#9ca3af]">
                (d) Waktu t pertama saat v = {analysis.vTarget} V (t ≥ 0)
              </div>
              <div className="text-[11px] font-mono text-[#c4c9cf]">
                {analysis.targetExceedsAmplitude
                  ? `|V_target| (${Math.abs(analysis.vTarget)} V) > A (${analysis.amplitude} V)`
                  : `θ₁=${analysis.theta1Rad?.toFixed(3)} rad, θ₂=${analysis.theta2Rad?.toFixed(3)} rad`}
              </div>
              <div
                data-testid="solver-ttarget"
                className={`text-sm sm:text-base font-mono tabular-nums font-bold pt-1 ${
                  analysis.targetExceedsAmplitude
                    ? 'text-red-400'
                    : 'text-[#35ff92]'
                }`}
              >
                {analysis.tAtTargetFormatted}
              </div>
            </button>

            {/* (e) t saat v Maksimum pertama (t >= 0) */}
            <button
              type="button"
              onClick={() => pinTimeAndSyncInput(analysis.tAtMaxMs)}
              className="text-left p-4 rounded-xl bg-[#101013] hover:bg-[#141418] border border-white/[0.12] hover:border-white/[0.24] transition-colors cursor-pointer space-y-1"
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#9ca3af]">
                (e) Waktu t pertama saat v Maksimum (+{analysis.amplitude} V)
              </div>
              <div className="text-[11px] font-mono text-[#c4c9cf]">
                t_max = ((π/2 - φ_signed) mod 2π) / ω
              </div>
              <div
                data-testid="solver-tmax"
                className="text-base font-mono tabular-nums font-bold text-[#f4f4f5] pt-1"
              >
                {analysis.tAtMaxFormatted}
              </div>
            </button>

            {/* (f) Detailed Custom Time Step-by-Step Result Card */}
            {customTimeEval.isValid && customTimeEval.probe && (
              <div className="md:col-span-2 p-4 rounded-xl bg-[#101013] border border-[#35ff92]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#35ff92]">
                    (f) Evaluasi Waktu Kustom: t = {customTimeEval.probe.tMs.toFixed(2)} ms ({customTimeEval.probe.tSec.toFixed(4)} s)
                  </span>
                  <span className="text-[11px] font-mono text-[#9ca3af]">
                    Siklus: {customTimeEval.probe.cycleFraction.toFixed(3)} T
                  </span>
                </div>
                <div className="text-xs font-mono text-[#c4c9cf]">
                  v({customTimeEval.probe.tSec.toFixed(4)}) = {analysis.amplitude}{' '}
                  {analysis.waveType}({analysis.omegaRad.toFixed(2)} ×{' '}
                  {customTimeEval.probe.tSec.toFixed(4)}{' '}
                  {analysis.phiRadSigned >= 0 ? '+' : '-'}{' '}
                  {Math.abs(analysis.phiRadSigned).toFixed(3)}) ={' '}
                  {analysis.amplitude} {analysis.waveType}(
                  {customTimeEval.probe.totalPhaseRad.toFixed(3)} rad)
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono tabular-nums">
                  <span className="text-base font-bold text-[#35ff92]">
                    v(t) = {customTimeEval.probe.vShifted.toFixed(2)} V
                  </span>
                  <span className="text-xs text-[#9ca3af]">
                    v_ref(t) = {customTimeEval.probe.vRef.toFixed(2)} V · Δv ={' '}
                    {customTimeEval.probe.deltaV >= 0 ? '+' : ''}
                    {customTimeEval.probe.deltaV.toFixed(2)} V
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unified Persistence Bar + Waveform Log Table */}
      <div className="space-y-4">
        <PersistenceToolbar
          student={student}
          angleLogs={angleLogs}
          waveformLogs={waveformLogs}
          arithmeticLogs={arithmeticLogs}
          onSaveTrial={analysis.isValid ? handleSaveSimulation : undefined}
          saveButtonLabel="Save Hasil Percobaan"
          onClearCurrentLog={onClearWaveformLogs}
          clearButtonLabel="Clear Log Gelombang"
        />

        <div className="cafe-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.12] flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-[0.08em] text-[#f4f4f5]">
              [TABEL LOG SIMULASI GELOMBANG SINUSOIDAL AC]
            </span>
            <span className="text-xs font-mono tabular-nums text-[#9ca3af]">
              {waveformLogs.length} BARIS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <caption className="sr-only">
                Tabel Log Simulasi Gelombang Sinusoidal AC
              </caption>
              <thead>
                <tr className="bg-[#101013] text-[#9ca3af] font-mono text-[11px] uppercase tracking-[0.06em] border-b border-white/[0.12]">
                  <th scope="col" className="py-3 px-3.5 text-center w-10">No</th>
                  <th scope="col" className="py-3 px-3.5">No. Soal</th>
                  <th scope="col" className="py-3 px-3.5">Besaran</th>
                  <th scope="col" className="py-3 px-3.5">Amplitudo (A)</th>
                  <th scope="col" className="py-3 px-3.5">ω (rad/s)</th>
                  <th scope="col" className="py-3 px-3.5">φ (rad/°)</th>
                  <th scope="col" className="py-3 px-3.5">Persamaan v(t)/i(t)</th>
                  <th scope="col" className="py-3 px-3.5">Jenis Fase</th>
                  <th scope="col" className="py-3 px-3.5 text-center print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {waveformLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-10 px-4 text-center text-[#9ca3af] font-mono text-xs"
                    >
                      Belum ada data simulasi gelombang disimpan. Klik tombol &quot;Save Hasil Percobaan&quot; untuk menambahkan baris.
                    </td>
                  </tr>
                ) : (
                  waveformLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3 px-3.5 font-mono tabular-nums text-center text-[#9ca3af]">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-xs text-[#f4f4f5]">
                        {log.questionLabel || 'Soal Praktikum'}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-xs text-[#c4c9cf]">
                        {log.quantityType === 'i' ? 'Arus (i)' : 'Tegangan (v)'}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums font-bold text-[#f4f4f5]">
                        {log.amplitude} {log.quantityType === 'i' ? 'A' : 'V'}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-[#c4c9cf]">
                        {log.omegaInput}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-[#f4f4f5]">
                        {log.phiFormatted}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-semibold text-[#35ff92]">
                        {log.equation}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-xs text-[#c4c9cf]">
                        {log.phaseStatus}
                      </td>
                      <td className="py-3 px-3.5 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => onDeleteWaveformLog(log.id)}
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
