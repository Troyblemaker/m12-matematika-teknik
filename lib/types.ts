export type NavigationTab = 'tujuan' | 'konversi' | 'sinusoidal';

export interface StudentIdentity {
  nama: string;
  nim: string;
  kelas: string;
}

export type AngleConversionMode = 'Mode A' | 'Mode B' | 'Mode C';

export interface DMSComponents {
  sign: 1 | -1;
  degrees: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export interface AngleConversionResult {
  degValue: number;
  degFormatted: string;
  radDecValue: number;
  radDecFormatted: string;
  radPiFormatted: string;
  dms: DMSComponents;
}

export interface AngleLogEntry {
  id: string;
  timestamp: string;
  mode: AngleConversionMode;
  rawInput: string;
  degValue: number;
  degFormatted: string;
  radDecValue: number;
  radDecFormatted: string;
  radPiFormatted: string;
  dmsFormatted: string;
}

export type WaveFunctionType = 'sin' | 'cos';
export type PhaseSignType = '0' | '+' | '-';

export interface SinusoidalInputParams {
  amplitude: number;
  omegaInput: string;
  waveType: WaveFunctionType;
  phaseSign: PhaseSignType;
  phiInput: string;
  vTarget: number;
}

export interface SinusoidalAnalyticalResult {
  isValid: boolean;
  errorMessage?: string;
  amplitude: number;
  omegaInput: string;
  omegaRad: number;
  waveType: WaveFunctionType;
  phaseSign: PhaseSignType;
  phiInput: string;
  phiRadUnsigned: number;
  phiRadSigned: number;
  phiDegUnsigned: number;
  phiDegSigned: number;
  phiDegFormatted: string;
  vTarget: number;
  periodS: number;
  periodMs: number;
  frequencyHz: number;
  vAtZero: number;
  vAt10ms: number;
  targetExceedsAmplitude: boolean;
  tAtTargetMs: number | null;
  tAtTargetFormatted: string;
  theta1Rad: number | null;
  theta2Rad: number | null;
  tAtMaxMs: number;
  tAtMaxFormatted: string;
  equation: string;
  phaseStatusLabel: 'LEADING (MENDAHULUI)' | 'IN PHASE (SEFASE)' | 'LAGGING (TERTINGGAL)';
  phaseStatusBanner: string;
}

export interface WaveformPlotPoint {
  tMs: number;
  tSec: number;
  vRef: number;
  vShifted: number;
}

export interface WaveformLogEntry {
  id: string;
  timestamp: string;
  amplitude: number;
  omegaInput: string;
  omegaRad: number;
  waveType: WaveFunctionType;
  phaseSign: PhaseSignType;
  phiInput: string;
  phiRad: number;
  phiDeg: number;
  phiFormatted: string;
  vTarget: number;
  periodS: number;
  periodMs: number;
  frequencyHz: number;
  vAtZero: number;
  vAt10ms: number;
  tAtTargetFormatted: string;
  tAtMaxMs: number;
  equation: string;
  phaseStatus: string;
}

export interface ArithmeticLogEntry {
  id: string;
  timestamp: string;
  expression: string;
  result: string;
  notes: string;
}
