'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Crosshair,
  FileText,
  Lock,
  Plus,
  PlusCircle,
  RotateCcw,
  Target,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  buildDefaultSubProblems,
  evaluateWaveAt,
  generateWaveformPoints,
  solveSinusoidal,
  solveSubProblems,
} from '@/lib/math-engine';
import {
  ACQuantityType,
  AngleLogEntry,
  ArithmeticLogEntry,
  PhaseSignType,
  SinusoidalInputParams,
  StudentIdentity,
  SubProblemItem,
  SubProblemType,
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

const SUBPROBLEM_TYPE_OPTIONS: { value: SubProblemType; label: string }[] = [
  { value: 'params', label: 'Parameter Dasar (T, f, φ)' },
  { value: 'value_at_time', label: 'Nilai saat waktu t tertentu (ms)' },
  { value: 'time_at_value', label: 'Waktu pertama saat mencapai target (V/A)' },
  { value: 'time_at_max', label: 'Waktu pertama Maksimum (+A)' },
  { value: 'time_at_min', label: 'Waktu pertama Minimum (-A)' },
  { value: 'time_at_zero', label: 'Waktu pertama Zero Crossing (0)' },
];

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

  const activeSubProblems = useMemo<SubProblemItem[]>(
    () =>
      params.subProblems && params.subProblems.length > 0
        ? params.subProblems
        : buildDefaultSubProblems(params),
    [params]
  );

  const solvedSubProblems = useMemo(
    () => solveSubProblems(analysis, activeSubProblems),
    [analysis, activeSubProblems]
  );

  // Determine graph time horizon: at least 1.25 cycles, or expand smoothly if any sub-problem asks for a larger t
  const maxTimeMs = useMemo(() => {
    if (!analysis.isValid || analysis.periodMs <= 0) return 50;
    const baseMax = 1.25 * analysis.periodMs;
    const maxPointT = solvedSubProblems.reduce((acc, sp) => {
      if (sp.plotPoint && sp.plotPoint.tMs > acc) {
        return sp.plotPoint.tMs;
      }
      return acc;
    }, 0);
    if (maxPointT > baseMax && maxPointT <= analysis.periodMs * 3.5) {
      return maxPointT * 1.1;
    }
    return baseMax;
  }, [analysis, solvedSubProblems]);

  const plotPoints = useMemo(
    () => generateWaveformPoints(analysis, 360, maxTimeMs),
    [analysis, maxTimeMs]
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

  const varName = analysis.quantityType === 'i' ? 'i' : 'v';
  const unitSymbol = analysis.unitSymbol;
  const qtyName = analysis.quantityName;

  // Sub-problem CRUD helpers
  const updateSubProblems = (nextList: SubProblemItem[]) => {
    // Also keep tUjiMs and vTarget synced with the first non-zero value_at_time / time_at_value for backward compatibility
    const firstNonZeroTime = nextList.find(
      (s) => s.type === 'value_at_time' && (s.timeValueMs ?? 0) > 0
    );
    const firstTarget = nextList.find((s) => s.type === 'time_at_value');
    onChangeParams({
      ...params,
      subProblems: nextList,
      tUjiMs: firstNonZeroTime?.timeValueMs ?? params.tUjiMs,
      vTarget: firstTarget?.targetValue ?? params.vTarget,
    });
  };

  const handleUpdateSubProblem = (
    id: string,
    patch: Partial<SubProblemItem>
  ) => {
    const nextList = activeSubProblems.map((sp) => {
      if (sp.id !== id) return sp;
      const updated = { ...sp, ...patch };
      // Initialize sensible defaults when switching type
      if (patch.type === 'value_at_time' && updated.timeValueMs === undefined) {
        updated.timeValueMs = 5;
      }
      if (patch.type === 'time_at_value' && updated.targetValue === undefined) {
        updated.targetValue = Number((analysis.amplitude * 0.5).toFixed(2));
      }
      return updated;
    });
    updateSubProblems(nextList);
  };

  const handleAddSubProblem = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const nextChar =
      letters[activeSubProblems.length] || `q${activeSubProblems.length + 1}`;
    const defaultTime = Number((analysis.periodMs * 0.35).toFixed(2)) || 5;
    const newItem: SubProblemItem = {
      id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: nextChar,
      prompt: `${qtyName} ${varName} saat t = ${defaultTime} ms`,
      type: 'value_at_time',
      timeValueMs: defaultTime,
    };
    updateSubProblems([...activeSubProblems, newItem]);
  };

  const handleDeleteSubProblem = (id: string) => {
    if (activeSubProblems.length <= 1) return;
    updateSubProblems(activeSubProblems.filter((sp) => sp.id !== id));
  };

  const handleResetSubProblems = () => {
    updateSubProblems(buildDefaultSubProblems(params));
  };

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
  const padRight = 40;
  const padTop = 38;
  const padBottom = 64;
  const innerW = svgWidth - padLeft - padRight;
  const innerH = svgHeight - padTop - padBottom;

  const yLimit = analysis.isValid ? 1.24 * analysis.amplitude : 10;

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

  // Plottable sub-problems sorted by time for clean badge staggering
  const plottableSubProblems = useMemo(() => {
    const list = solvedSubProblems
      .filter((sp) => sp.plotPoint !== null && sp.plotPoint.tMs >= 0 && sp.plotPoint.tMs <= maxTimeMs)
      .map((sp) => ({
        ...sp,
        x: mapX(sp.plotPoint!.tMs),
        y: mapY(sp.plotPoint!.yVal),
      }))
      .sort((a, b) => a.x - b.x);

    // Assign vertical stagger tiers (0, 1, 2) for X-axis pills so neighboring badges never overlap
    const placed: { x: number; tier: number }[] = [];
    return list.map((sp) => {
      let tier = 0;
      for (const prev of placed) {
        if (Math.abs(sp.x - prev.x) < 92 && prev.tier === tier) {
          tier = (tier + 1) % 3;
        }
      }
      placed.push({ x: sp.x, tier });
      return { ...sp, xBadgeTier: tier };
    });
  }, [solvedSubProblems, maxTimeMs, yLimit]);

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

  // Grid ticks scaled cleanly to maxTimeMs
  const majorTimeTicks = useMemo(() => {
    if (!analysis.isValid || analysis.periodMs <= 0) return [];
    const totalCycles = maxTimeMs / analysis.periodMs;
    const stepFrac = totalCycles > 2 ? 0.25 : 0.125;
    const arr: { frac: number; tMs: number }[] = [];
    for (let f = 0; f <= totalCycles + 0.001; f += stepFrac) {
      arr.push({ frac: Number(f.toFixed(3)), tMs: f * analysis.periodMs });
    }
    return arr;
  }, [analysis, maxTimeMs]);

  const majorVoltageFactors = [-1.0, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* Header & Quick Sample Presets */}
      <div className="cafe-card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-2xl">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
            [03 · AC SINUSOIDAL WAVEFORM SIMULATOR &amp; SUB-PROBLEM SOLVER]
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-[#f4f4f5] tracking-[-0.02em] print:text-black">
            3. AC Sinusoidal Waveform Simulator &amp; Editor Sub-Soal (a, b, c, d, e...)
          </h2>
          <p className="text-xs sm:text-sm text-[#c4c9cf] print:text-zinc-600">
            Masukkan nomor soal, detail soal, dan daftar sub-soal (a, b, c, d, e...) — setiap titik jawaban langsung diplot pada grafik osiloskop dan laporan PDF.
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
                problemDetails:
                  'Diketahui arus AC i(t) = 5 sin(100πt - 0,432) A. Tentukan (a) periode, frekuensi, sudut fase, (b) arus saat t = 0, (c) arus saat t = 8 ms, (d) waktu pertama saat i = 3 A, dan (e) waktu pertama mencapai nilai maksimum.',
                quantityType: 'i',
                amplitude: 5,
                omegaInput: '100π',
                waveType: 'sin',
                phaseSign: '-',
                phiInput: '0.432',
                tUjiMs: 8,
                vTarget: 3,
                subProblems: [
                  { id: 'sp-a', label: 'a', prompt: 'Periode (T), Frekuensi (f), dan Sudut Fase (φ)', type: 'params' },
                  { id: 'sp-b', label: 'b', prompt: 'Arus i saat t = 0 ms', type: 'value_at_time', timeValueMs: 0 },
                  { id: 'sp-c', label: 'c', prompt: 'Arus i saat t = 8 ms', type: 'value_at_time', timeValueMs: 8 },
                  { id: 'sp-d', label: 'd', prompt: 'Waktu t pertama saat i = 3 A', type: 'time_at_value', targetValue: 3 },
                  { id: 'sp-e', label: 'e', prompt: 'Waktu t pertama saat i Maksimum (+5 A)', type: 'time_at_max' },
                ],
              });
            }}
            className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-mono bg-[#222227] hover:bg-[#2c2c33] text-[#f4f4f5] border border-white/[0.16] transition-colors cursor-pointer text-center"
          >
            PE 118 NO 7: 5 sin(100πt - 0.432) A
          </button>
          <button
            type="button"
            onClick={() => {
              setPinnedTimeMs(null);
              setCustomTimeInput('5');
              setCustomTimeUnit('ms');
              onChangeParams({
                questionLabel: 'Problem 10 H.255',
                problemDetails:
                  'Diketahui arus AC i(t) = 30 sin(100πt + 0,35) A. Tentukan parameter gelombang, arus saat t = 0 & t = 5 ms, serta waktu mencapai 15 A dan maksimum.',
                quantityType: 'i',
                amplitude: 30,
                omegaInput: '100π',
                waveType: 'sin',
                phaseSign: '+',
                phiInput: '0.35',
                tUjiMs: 5,
                vTarget: 15,
                subProblems: [
                  { id: 'p10-a', label: 'a', prompt: 'Periode (T), Frekuensi (f), dan Sudut Fase (φ)', type: 'params' },
                  { id: 'p10-b', label: 'b', prompt: 'Arus i saat t = 0 ms', type: 'value_at_time', timeValueMs: 0 },
                  { id: 'p10-c', label: 'c', prompt: 'Arus i saat t = 5 ms', type: 'value_at_time', timeValueMs: 5 },
                  { id: 'p10-d', label: 'd', prompt: 'Waktu t pertama saat i = 15 A', type: 'time_at_value', targetValue: 15 },
                  { id: 'p10-e', label: 'e', prompt: 'Waktu t pertama saat i Maksimum (+30 A)', type: 'time_at_max' },
                ],
              });
            }}
            className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-mono bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer text-center"
          >
            Problem 10: 30 sin(100πt + 0.35) A
          </button>
          <button
            type="button"
            onClick={() => {
              setPinnedTimeMs(null);
              setCustomTimeInput('10');
              setCustomTimeUnit('ms');
              onChangeParams({
                questionLabel: 'Problem 12 H.255',
                problemDetails:
                  'Diketahui tegangan AC v(t) = 340 sin(50πt - 0,541) V. Tentukan parameter gelombang, tegangan saat t = 0 & t = 10 ms, serta waktu pertama mencapai 200 V dan puncak +340 V.',
                quantityType: 'v',
                amplitude: 340,
                omegaInput: '50π',
                waveType: 'sin',
                phaseSign: '-',
                phiInput: '0.541',
                tUjiMs: 10,
                vTarget: 200,
                subProblems: [
                  { id: 'p12-a', label: 'a', prompt: 'Periode (T), Frekuensi (f), dan Sudut Fase (φ)', type: 'params' },
                  { id: 'p12-b', label: 'b', prompt: 'Tegangan v saat t = 0 ms', type: 'value_at_time', timeValueMs: 0 },
                  { id: 'p12-c', label: 'c', prompt: 'Tegangan v saat t = 10 ms', type: 'value_at_time', timeValueMs: 10 },
                  { id: 'p12-d', label: 'd', prompt: 'Waktu t pertama saat v = 200 V', type: 'time_at_value', targetValue: 200 },
                  { id: 'p12-e', label: 'e', prompt: 'Waktu t pertama saat v Maksimum (+340 V)', type: 'time_at_max' },
                ],
              });
            }}
            className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-mono bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer text-center"
          >
            Problem 12: 340 sin(50πt - 0.541) V
          </button>
        </div>
      </div>

      {/* ====================================================================
          CENTERPIECE: FULL-WIDTH INTERACTIVE OSCILLOSCOPE GRAPH
         ==================================================================== */}
      <div className="cafe-card rounded-2xl p-3.5 sm:p-6 space-y-4 sm:space-y-5">
        {/* Top Bar: Problem Badge, Equation Badge & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/[0.12] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#2f6bff]/20 text-[#93c5fd] border border-[#2f6bff]/40">
                {analysis.questionLabel || 'SOAL PRAKTIKUM'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#101013] text-[#35ff92] border border-white/[0.14]">
                {analysis.equation}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#f4f4f5] tracking-[-0.015em] print:text-black">
              Grafik Osiloskop Interaktif — Plot Semua Titik Sub-Soal ({activeSubProblems.map((s) => s.label).join(', ')})
            </h3>
            {params.problemDetails && (
              <p className="text-xs text-[#9ca3af] max-w-3xl leading-relaxed">
                {params.problemDetails}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              {showKeyMarkers ? '● Titik Sub-Soal: ON' : '○ Titik Sub-Soal: OFF'}
            </button>

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

        {/* Live Telemetry Readout Bar */}
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
                  ? `${activeProbe.tMs.toFixed(3)} ms (${activeProbe.cycleFraction.toFixed(2)}T)`
                  : 'Sentuh/Hover...'}
              </div>
            </div>

            <div className="px-2.5 py-2 rounded-lg bg-[#18181c] border border-white/[0.1]">
              <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                SIMULASI {varName}(t)
              </span>
              <div className="text-xs sm:text-sm font-bold text-[#22d3ee] mt-0.5 truncate">
                {activeProbe
                  ? `${activeProbe.vShifted.toFixed(3)} ${unitSymbol}`
                  : `${analysis.vAtZero.toFixed(3)} ${unitSymbol} (t=0)`}
              </div>
            </div>

            <div className="px-2.5 py-2 rounded-lg bg-[#18181c] border border-white/[0.1]">
              <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                ACUAN {varName}_ref
              </span>
              <div className="text-xs sm:text-sm font-bold text-[#c4c9cf] mt-0.5 truncate">
                {activeProbe
                  ? `${activeProbe.vRef.toFixed(3)} ${unitSymbol}`
                  : `0.000 ${unitSymbol} (t=0)`}
              </div>
            </div>

            <div className="px-2.5 py-2 rounded-lg bg-[#18181c] border border-white/[0.1]">
              <span className="text-[10px] uppercase tracking-[0.06em] text-[#9ca3af] block">
                SELISIH Δ{varName}
              </span>
              <div className="text-xs sm:text-sm font-bold text-[#6090ff] mt-0.5 truncate">
                {activeProbe
                  ? `${activeProbe.deltaV >= 0 ? '+' : ''}${activeProbe.deltaV.toFixed(3)} ${unitSymbol}`
                  : `${analysis.vAtZero >= 0 ? '+' : ''}${analysis.vAtZero.toFixed(3)} ${unitSymbol}`}
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
            {/* Main Interactive SVG Oscilloscope Canvas (PDF-style high-contrast dark oscilloscope) */}
            <div className="w-full rounded-2xl bg-[#0b111e] border border-white/[0.16] p-1.5 sm:p-3 shadow-inner">
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
                aria-label="Grafik Osiloskop Interaktif Gelombang Sinusoidal dengan Plot Sub-Soal"
              >
                <defs>
                  <linearGradient id="waveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.20" />
                    <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.03" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.20" />
                  </linearGradient>
                </defs>

                {/* Plot Background Frame */}
                <rect
                  x={padLeft}
                  y={padTop}
                  width={innerW}
                  height={innerH}
                  fill="#070c17"
                  stroke="rgba(148, 163, 184, 0.22)"
                  strokeWidth={1}
                />

                {/* Major Horizontal Gridlines (-A to +A) */}
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
                            ? 'rgba(226, 232, 240, 0.5)'
                            : isPeak
                            ? 'rgba(148, 163, 184, 0.22)'
                            : 'rgba(148, 163, 184, 0.11)'
                        }
                        strokeWidth={isZeroAxis ? 1.6 : 1}
                        strokeDasharray={isZeroAxis ? undefined : '4 4'}
                      />
                      <text
                        x={padLeft - 10}
                        y={y + 4}
                        textAnchor="end"
                        className={`font-mono text-[11px] ${
                          isZeroAxis || isPeak
                            ? 'fill-[#f8fafc] font-bold'
                            : 'fill-[#94a3b8]'
                        }`}
                      >
                        {val.toFixed(1)} {unitSymbol}
                      </text>
                    </g>
                  );
                })}

                {/* Major Vertical Time Gridlines */}
                {majorTimeTicks.map((tk) => {
                  const x = mapX(tk.tMs);
                  const isFullPeriod = Math.abs(tk.frac - 1.0) < 0.01;
                  const isQuarter =
                    Math.abs((tk.frac * 4) - Math.round(tk.frac * 4)) < 0.01;
                  return (
                    <g key={`major-v-${tk.frac}`}>
                      <line
                        x1={x}
                        y1={padTop}
                        x2={x}
                        y2={svgHeight - padBottom}
                        stroke={
                          isFullPeriod
                            ? 'rgba(53, 255, 146, 0.5)'
                            : isQuarter
                            ? 'rgba(148, 163, 184, 0.2)'
                            : 'rgba(148, 163, 184, 0.09)'
                        }
                        strokeWidth={isFullPeriod ? 1.5 : 1}
                        strokeDasharray="3 3"
                      />
                      <line
                        x1={x}
                        y1={zeroY - 4}
                        x2={x}
                        y2={zeroY + 4}
                        stroke="rgba(226, 232, 240, 0.55)"
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
                            ? 'fill-[#e2e8f0]'
                            : 'fill-[#94a3b8]'
                        }`}
                      >
                        {tk.tMs.toFixed(1)}
                      </text>
                      {isQuarter && (
                        <text
                          x={x}
                          y={svgHeight - padBottom + 32}
                          textAnchor="middle"
                          className={`font-mono text-[9.5px] ${
                            isFullPeriod ? 'fill-[#35ff92]' : 'fill-[#64748b]'
                          }`}
                        >
                          ({tk.frac}T)
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Area Gradient under Phase-Shifted Wave */}
                <path d={shiftedAreaData} fill="url(#waveAreaGrad)" />

                {/* Reference Wave Curve (Dashed Gray) */}
                {showRefWave && (
                  <path
                    d={refPathData}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="7 5"
                    opacity={0.75}
                  />
                )}

                {/* Phase-Shifted Wave Curve (Solid Cyan like PDF) */}
                <path
                  d={shiftedPathData}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={3.2}
                />

                {/* ============================================================
                    DYNAMIC SUB-PROBLEM MARKERS & DASHED PROJECTION LINES
                   ============================================================ */}
                {showKeyMarkers &&
                  plottableSubProblems.map((sp) => {
                    const pt = sp.plotPoint!;
                    const badgeW = 86;
                    const badgeH = 20;
                    const badgeY =
                      sp.y > zeroY
                        ? zeroY - 26 - sp.xBadgeTier * 22
                        : zeroY + 8 + sp.xBadgeTier * 22;
                    const clampedBadgeX = Math.max(
                      padLeft + 4,
                      Math.min(svgWidth - padRight - badgeW - 4, sp.x - badgeW / 2)
                    );

                    return (
                      <g key={sp.item.id}>
                        {/* Horizontal dashed projection line from Y-axis to curve point */}
                        <line
                          x1={padLeft}
                          y1={sp.y}
                          x2={sp.x}
                          y2={sp.y}
                          stroke={sp.color}
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          opacity={0.85}
                        />
                        {/* Vertical dashed projection line from curve point to X-axis */}
                        <line
                          x1={sp.x}
                          y1={sp.y}
                          x2={sp.x}
                          y2={zeroY}
                          stroke={sp.color}
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          opacity={0.85}
                        />
                        {/* Glowing outer halo + crisp marker dot */}
                        <circle
                          cx={sp.x}
                          cy={sp.y}
                          r={8.5}
                          fill={sp.color}
                          opacity={0.22}
                        />
                        <circle
                          cx={sp.x}
                          cy={sp.y}
                          r={5.2}
                          fill={sp.color}
                          stroke="#070c17"
                          strokeWidth={2}
                        />
                        {/* Sub-problem letter badge directly above/below the dot */}
                        <circle
                          cx={sp.x}
                          cy={sp.y > padTop + 26 ? sp.y - 17 : sp.y + 17}
                          r={9.5}
                          fill="#0b111e"
                          stroke={sp.color}
                          strokeWidth={1.5}
                        />
                        <text
                          x={sp.x}
                          y={sp.y > padTop + 26 ? sp.y - 13.5 : sp.y + 20.5}
                          textAnchor="middle"
                          fill={sp.color}
                          className="font-mono text-[10.5px] font-bold"
                        >
                          {sp.item.label}
                        </text>

                        {/* Axis Time / Value Callout Pill */}
                        <rect
                          x={clampedBadgeX}
                          y={badgeY}
                          width={badgeW}
                          height={badgeH}
                          rx={5}
                          fill="rgba(11, 17, 30, 0.92)"
                          stroke={sp.color}
                          strokeWidth={1.2}
                        />
                        <text
                          x={clampedBadgeX + badgeW / 2}
                          y={badgeY + 13.5}
                          textAnchor="middle"
                          fill={sp.color}
                          className="font-mono text-[10px] font-bold"
                        >
                          ({sp.item.label}) {pt.tMs === 0 ? `${pt.yVal.toFixed(2)}${unitSymbol}` : `${pt.tMs.toFixed(2)}ms`}
                        </text>
                      </g>
                    );
                  })}

                {/* Interactive Hover / Pin Crosshair Overlay */}
                {activeProbe && (
                  <g pointerEvents="none">
                    <line
                      x1={mapX(activeProbe.tMs)}
                      y1={padTop}
                      x2={mapX(activeProbe.tMs)}
                      y2={svgHeight - padBottom}
                      stroke="#35ff92"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={padLeft}
                      y1={mapY(activeProbe.vShifted)}
                      x2={mapX(activeProbe.tMs)}
                      y2={mapY(activeProbe.vShifted)}
                      stroke="rgba(53, 255, 146, 0.55)"
                      strokeWidth={1.2}
                      strokeDasharray="3 3"
                    />
                    {showRefWave && (
                      <circle
                        cx={mapX(activeProbe.tMs)}
                        cy={mapY(activeProbe.vRef)}
                        r={4.5}
                        fill="#94a3b8"
                        stroke="#070c17"
                        strokeWidth={1.5}
                      />
                    )}
                    <circle
                      cx={mapX(activeProbe.tMs)}
                      cy={mapY(activeProbe.vShifted)}
                      r={9}
                      fill="rgba(53, 255, 146, 0.25)"
                    />
                    <circle
                      cx={mapX(activeProbe.tMs)}
                      cy={mapY(activeProbe.vShifted)}
                      r={5.5}
                      fill="#35ff92"
                      stroke="#070c17"
                      strokeWidth={2}
                    />
                    {(() => {
                      const cursorX = mapX(activeProbe.tMs);
                      const cursorY = mapY(activeProbe.vShifted);
                      const boxW = 224;
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
                            fill="rgba(11, 17, 30, 0.96)"
                            stroke="rgba(53, 255, 146, 0.45)"
                            strokeWidth={1.2}
                          />
                          <text
                            x={boxX + 12}
                            y={boxY + 19}
                            className="fill-[#35ff92] font-mono text-[10.5px] font-bold"
                          >
                            t = {activeProbe.tMs.toFixed(3)} ms ({activeProbe.cycleFraction.toFixed(2)}T)
                          </text>
                          <text
                            x={boxX + 12}
                            y={boxY + 38}
                            className="fill-[#f8fafc] font-mono text-[11.5px] font-bold"
                          >
                            {varName}(t)     = {activeProbe.vShifted.toFixed(3)} {unitSymbol}
                          </text>
                          <text
                            x={boxX + 12}
                            y={boxY + 55}
                            className="fill-[#94a3b8] font-mono text-[10.5px]"
                          >
                            {varName}_ref(t) = {activeProbe.vRef.toFixed(3)} {unitSymbol}
                          </text>
                          <text
                            x={boxX + 12}
                            y={boxY + 72}
                            className="fill-[#cbd5e1] font-mono text-[10px]"
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
                  className="fill-[#f8fafc] font-mono text-[12px] font-bold"
                >
                  {qtyName} {varName}(t) [{unitSymbol}]
                </text>
                <text
                  x={svgWidth - padRight}
                  y={svgHeight - 8}
                  textAnchor="end"
                  className="fill-[#f8fafc] font-mono text-[12px] font-bold"
                >
                  Waktu t [milidetik / ms]
                </text>
              </svg>
            </div>

            {/* Color-Coded Sub-Problem Key-Point Chips directly below the Graph */}
            {plottableSubProblems.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                  Titik Sub-Soal di Grafik:
                </span>
                {plottableSubProblems.map((sp) => (
                  <button
                    key={sp.item.id}
                    type="button"
                    onClick={() => pinTimeAndSyncInput(sp.plotPoint!.tMs)}
                    style={{ borderColor: `${sp.color}66` }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#101013] hover:bg-[#1c1c22] border text-xs font-mono transition-colors cursor-pointer"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: sp.color }}
                    />
                    <span className="font-bold text-[#f4f4f5]">
                      ({sp.item.label})
                    </span>
                    <span className="text-[#c4c9cf]">{sp.answerText}</span>
                    <span className="text-[10px] text-[#9ca3af]">
                      @ {sp.plotPoint!.tMs.toFixed(2)}ms
                    </span>
                  </button>
                ))}
                {pinnedTimeMs !== null && (
                  <button
                    type="button"
                    onClick={() => setPinnedTimeMs(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-red-950/40 hover:bg-red-950/70 text-red-300 border border-red-500/30 text-xs font-mono cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Lepas Kunci</span>
                  </button>
                )}
              </div>
            )}

            {/* Custom Time Input Box & Scrubber */}
            <div className="p-3 sm:p-4 rounded-xl bg-[#101013] border border-white/[0.14] space-y-3 print:hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                <div className="lg:col-span-5 flex flex-col sm:flex-row sm:items-center gap-2">
                  <label
                    htmlFor="custom-time-input"
                    className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.06em] text-[#f4f4f5] whitespace-nowrap"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#35ff92]" />
                    <span>Uji Waktu Bebas t:</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      id="custom-time-input"
                      type="text"
                      inputMode="decimal"
                      value={customTimeInput}
                      onChange={(e) =>
                        handleCustomTimeChange(e.target.value, customTimeUnit)
                      }
                      placeholder="Contoh: 8 atau 3.423"
                      className="cafe-input w-full px-3 py-2 sm:py-1.5 text-base sm:text-sm font-mono tabular-nums rounded-xl"
                    />
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

                <div className="lg:col-span-7">
                  {customTimeEval.isValid && customTimeEval.probe ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#18181c] border border-white/[0.14] font-mono text-xs tabular-nums">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          <span className="text-[#9ca3af]">t = </span>
                          <strong className="text-[#f4f4f5]">
                            {customTimeEval.probe.tMs.toFixed(3)} ms
                          </strong>
                        </span>
                        <span>
                          <span className="text-[#9ca3af]">{varName}(t) = </span>
                          <strong
                            data-testid="custom-time-result"
                            className="text-sm text-[#35ff92]"
                          >
                            {customTimeEval.probe.vShifted.toFixed(3)} {unitSymbol}
                          </strong>
                        </span>
                        <span>
                          <span className="text-[#9ca3af]">{varName}_ref = </span>
                          <span className="text-[#c4c9cf]">
                            {customTimeEval.probe.vRef.toFixed(3)} {unitSymbol}
                          </span>
                        </span>
                      </div>
                      <span className="text-[11px] text-[#9ca3af]">
                        {customTimeEval.probe.cycleFraction.toFixed(2)}T
                      </span>
                    </div>
                  ) : (
                    <div className="px-3.5 py-2 rounded-xl bg-[#18181c] border border-red-500/30 text-xs font-mono text-red-300">
                      {customTimeEval.error}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.1]">
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
                  className="w-full accent-[#22d3ee] cursor-pointer"
                  aria-label="Geser waktu t pada grafik"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          BELOW GRAPH:
          LEFT (5 cols) = PROBLEM NUMBER, DETAILS & WAVEFORM PARAMETERS
          RIGHT (7 cols) = DYNAMIC SUB-PROBLEMS BUILDER (a, b, c, d, e...) & LIVE ANSWERS
         ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left Column (5 cols): Problem Number, Details & Wave Parameters */}
        <div className="lg:col-span-5 cafe-card rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.12] pb-3.5">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                [IDENTITAS SOAL &amp; PARAMETER GELOMBANG]
              </span>
              <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] mt-0.5 print:text-black">
                Detail Soal &amp; Persamaan Sinusoidal
              </h3>
            </div>
            <FileText className="w-4 h-4 text-[#22d3ee]" />
          </div>

          {/* Problem Number & Details Input Boxes */}
          <div className="space-y-3 p-3.5 rounded-xl bg-[#101013] border border-white/[0.14]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sim-question-label"
                  className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
                >
                  Nomor Soal (Problem No.)
                </label>
                <input
                  id="sim-question-label"
                  type="text"
                  value={params.questionLabel ?? ''}
                  onChange={(e) =>
                    onChangeParams({
                      ...params,
                      questionLabel: e.target.value,
                    })
                  }
                  placeholder="PE 118 NO 7 H.256"
                  className="cafe-input w-full px-3 py-2 text-base sm:text-sm font-mono rounded-xl"
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
                  value={params.quantityType ?? 'i'}
                  onChange={(e) =>
                    onChangeParams({
                      ...params,
                      quantityType: e.target.value as ACQuantityType,
                    })
                  }
                  className="cafe-input w-full px-3 py-2 text-base sm:text-sm font-mono rounded-xl"
                >
                  <option value="i">Arus — i(t) [Ampere]</option>
                  <option value="v">Tegangan — v(t) [Volt]</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="sim-problem-details"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                Keterangan / Detail Soal
              </label>
              <textarea
                id="sim-problem-details"
                rows={2}
                value={params.problemDetails ?? ''}
                onChange={(e) =>
                  onChangeParams({
                    ...params,
                    problemDetails: e.target.value,
                  })
                }
                placeholder="Tulis keterangan soal, misal: Diketahui arus AC i(t) = 5 sin(100πt - 0,432) A..."
                className="cafe-input w-full px-3 py-2 text-xs sm:text-sm rounded-xl resize-y"
              />
            </div>
          </div>

          {/* Amplitudo & Omega */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="sim-amplitude"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                Amplitudo A ({unitSymbol === 'A' ? 'Ampere' : 'Volt'})
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
                placeholder="5"
                className="cafe-input w-full px-3.5 py-2 text-base sm:text-sm font-mono tabular-nums rounded-xl"
              />
            </div>

            <div>
              <label
                htmlFor="sim-omega"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                ω (rad/s) [notasi π]
              </label>
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
                placeholder="100π"
                className="cafe-input w-full px-3.5 py-2 text-base sm:text-sm font-mono tabular-nums rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 print:hidden">
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
            {analysis.isValid && (
              <span className="text-[11px] font-mono tabular-nums text-[#35ff92]">
                {analysis.omegaRad.toFixed(2)} rad/s | f = {analysis.frequencyHz.toFixed(2)} Hz
              </span>
            )}
          </div>

          {/* Wave Function Type */}
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
              className="cafe-input w-full px-3.5 py-2 text-base sm:text-sm font-mono rounded-xl"
            >
              <option value="sin">Sinus: {varName}(t) = A sin(ωt ± φ)</option>
              <option value="cos">Cosinus: {varName}(t) = A cos(ωt ± φ)</option>
            </select>
          </div>

          {/* Phase Sign & Phi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.12]">
            <div>
              <label
                htmlFor="sim-phasesign"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1.5"
              >
                Tanda Beda Fase (±φ)
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
                className="cafe-input w-full px-3 py-2 text-base sm:text-sm font-mono rounded-xl"
              >
                <option value="0">In Phase (0)</option>
                <option value="+">Plus / Lead (+)</option>
                <option value="-">Minus / Lag (-)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="sim-phi"
                  className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]"
                >
                  Sudut Fase |φ| (rad)
                </label>
                {analysis.isValid && (
                  <span className="text-[10px] font-mono tabular-nums text-[#35ff92]">
                    {analysis.phiDegFormatted}
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
                placeholder="0.432"
                className="cafe-input w-full px-3 py-2 text-base sm:text-sm font-mono tabular-nums rounded-xl disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 print:hidden">
            {['0.432', '0.541', '0.35', 'π/6', 'π/4'].map((preset) => (
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

        {/* Right Column (7 cols): DYNAMIC SUB-PROBLEM BUILDER & LIVE SOLVER */}
        <div className="lg:col-span-7 cafe-card rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/[0.12] pb-3.5">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#9ca3af]">
                [EDITOR SUB-SOAL &amp; HASIL ANALISIS]
              </span>
              <h3 className="text-base font-bold text-[#f4f4f5] tracking-[-0.015em] mt-0.5 print:text-black">
                Daftar Sub-Soal ({activeSubProblems.length} Pertanyaan) — Otomatis Diplot ke Grafik
              </h3>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handleResetSubProblems}
                title="Reset ke default (a–e)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-[#222227] hover:bg-[#2c2c33] text-[#c4c9cf] hover:text-[#f4f4f5] border border-white/[0.14] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset (a–e)</span>
              </button>
              <button
                type="button"
                onClick={handleAddSubProblem}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#35ff92] hover:bg-[#4bff9f] text-[#171515] transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Sub-Soal</span>
              </button>
            </div>
          </div>

          {/* Dynamic List of Sub-Problem Editor + Live Solution Cards */}
          <div className="space-y-3">
            {solvedSubProblems.map((sp) => (
              <div
                key={sp.item.id}
                style={{ borderLeftColor: sp.color }}
                className="p-3.5 rounded-xl bg-[#101013] border border-white/[0.12] border-l-4 space-y-2.5"
              >
                {/* Row 1: Label, Type Selector, Dynamic Numeric Input, Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Label Input (e.g. a, b, c, d, e) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-mono text-xs text-[#9ca3af]">(</span>
                    <input
                      type="text"
                      value={sp.item.label}
                      onChange={(e) =>
                        handleUpdateSubProblem(sp.item.id, {
                          label: e.target.value.slice(0, 4),
                        })
                      }
                      aria-label={`Label sub-soal ${sp.item.label}`}
                      className="cafe-input w-10 px-1.5 py-1 text-center font-mono text-xs font-bold rounded-lg"
                      style={{ color: sp.color }}
                    />
                    <span className="font-mono text-xs text-[#9ca3af]">)</span>
                  </div>

                  {/* Type Dropdown */}
                  <select
                    value={sp.item.type}
                    onChange={(e) =>
                      handleUpdateSubProblem(sp.item.id, {
                        type: e.target.value as SubProblemType,
                      })
                    }
                    aria-label={`Tipe pertanyaan sub-soal ${sp.item.label}`}
                    className="cafe-input flex-1 min-w-[190px] px-2.5 py-1.5 text-xs font-mono rounded-lg"
                  >
                    {SUBPROBLEM_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Contextual Parameter Input: Time (ms) OR Target Value (V/A) */}
                  {sp.item.type === 'value_at_time' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-mono text-[#9ca3af]">t =</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={sp.item.timeValueMs ?? 0}
                        onChange={(e) =>
                          handleUpdateSubProblem(sp.item.id, {
                            timeValueMs: Number(e.target.value),
                          })
                        }
                        aria-label={`Nilai waktu t untuk sub-soal ${sp.item.label}`}
                        className="cafe-input w-20 px-2 py-1 text-xs font-mono tabular-nums rounded-lg"
                      />
                      <span className="text-[11px] font-mono text-[#9ca3af]">ms</span>
                    </div>
                  )}

                  {sp.item.type === 'time_at_value' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-mono text-[#9ca3af]">
                        {varName} =
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={sp.item.targetValue ?? 0}
                        onChange={(e) =>
                          handleUpdateSubProblem(sp.item.id, {
                            targetValue: Number(e.target.value),
                          })
                        }
                        aria-label={`Nilai target untuk sub-soal ${sp.item.label}`}
                        className="cafe-input w-20 px-2 py-1 text-xs font-mono tabular-nums rounded-lg"
                      />
                      <span className="text-[11px] font-mono text-[#9ca3af]">
                        {unitSymbol}
                      </span>
                    </div>
                  )}

                  {/* Quick Jump to Graph & Delete Buttons */}
                  <div className="flex items-center gap-1 ml-auto print:hidden">
                    {sp.plotPoint && (
                      <button
                        type="button"
                        onClick={() => pinTimeAndSyncInput(sp.plotPoint!.tMs)}
                        title="Sorot titik ini di grafik osiloskop"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#18181c] hover:bg-[#222227] border border-white/[0.14] text-[11px] font-mono text-[#f4f4f5] cursor-pointer"
                      >
                        <Target className="w-3 h-3" style={{ color: sp.color }} />
                        <span className="hidden sm:inline">Plot</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteSubProblem(sp.item.id)}
                      disabled={activeSubProblems.length <= 1}
                      title="Hapus sub-soal"
                      className="p-1.5 rounded-lg text-[#9ca3af] hover:text-red-400 hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Custom Prompt Text Input */}
                <input
                  type="text"
                  value={sp.item.prompt}
                  onChange={(e) =>
                    handleUpdateSubProblem(sp.item.id, {
                      prompt: e.target.value,
                    })
                  }
                  placeholder="Tulis teks pertanyaan sub-soal (misal: Nilai arus saat t = 8 ms)"
                  aria-label={`Deskripsi pertanyaan sub-soal ${sp.item.label}`}
                  className="cafe-input w-full px-3 py-1.5 text-xs rounded-lg placeholder-[#9ca3af]/40"
                />

                {/* Row 3: Live Computed Result & Formula Preview */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-3 py-2 rounded-lg bg-[#18181c] border border-white/[0.08] font-mono">
                  <span className="text-[11px] text-[#9ca3af] truncate">
                    {sp.formulaLine}
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-bold tabular-nums shrink-0 ${
                      sp.isError ? 'text-red-400' : ''
                    }`}
                    style={!sp.isError ? { color: sp.color } : undefined}
                  >
                    = {sp.answerText}
                  </span>
                </div>
              </div>
            ))}
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
