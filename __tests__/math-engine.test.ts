import { describe, expect, it } from 'vitest';
import {
  convertFromDegrees,
  convertFromDMS,
  convertFromRadians,
  evaluateArithmetic,
  extractDMS,
  formatRadPi,
  parseSymbolicPi,
  solveSinusoidal,
} from '@/lib/math-engine';

describe('M12 Math Engine — Exact Arithmetic (Decimal.js)', () => {
  it('eliminates IEEE 754 floating-point drift for 0.1 + 0.2', () => {
    const res = evaluateArithmetic('0.1 + 0.2');
    expect(res.isValid).toBe(true);
    expect(res.formattedResult).toBe('0.3');
    expect(res.numericValue).toBe(0.3);
  });

  it('evaluates parentheses, multiplication (×), division (÷), and π constants', () => {
    const res1 = evaluateArithmetic('(120 + 220) × 0.5 - 20 ÷ 4');
    expect(res1.isValid).toBe(true);
    expect(res1.formattedResult).toBe('165');

    const resPi = evaluateArithmetic('3 * π / 4');
    expect(resPi.isValid).toBe(true);
    expect(resPi.numericValue).toBeCloseTo((3 * Math.PI) / 4, 10);
  });

  it('handles division by zero gracefully', () => {
    const res = evaluateArithmetic('10 / (5 - 5)');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Division by Zero');
  });
});

describe('M12 Math Engine — Hub-and-Spoke Angle Conversion', () => {
  it('converts Mode A sample: 50.145° accurately', () => {
    const result = convertFromDegrees(50.145);
    expect(result.degFormatted).toBe('50.1450°');
    expect(result.radDecFormatted).toBe('0.8752 rad');
    expect(result.radPiFormatted).toBe('0.2786π rad');
    expect(result.dms.formatted).toBe('50° 8\' 42.00"');
  });

  it('accepts comma decimal separator in Mode A ("50,145")', () => {
    const result = convertFromDegrees('50,145');
    expect(result.degFormatted).toBe('50.1450°');
    expect(result.radPiFormatted).toBe('0.2786π rad');
    expect(result.dms.formatted).toBe('50° 8\' 42.00"');
  });

  it('converts Mode B sample: 3π/4 rad accurately with exact rational π fraction', () => {
    const result = convertFromRadians('3π/4');
    expect(result.degValue).toBeCloseTo(135, 8);
    expect(result.degFormatted).toBe('135.0000°');
    expect(result.radDecFormatted).toBe('2.3562 rad');
    expect(result.radPiFormatted).toBe('3π/4 rad');
    expect(result.dms.formatted).toBe('135° 0\' 0.00"');
  });

  it('supports various symbolic π strings in Mode B (pi/6, -pi/3, 2*pi)', () => {
    expect(convertFromRadians('pi/6').radPiFormatted).toBe('π/6 rad');
    expect(convertFromRadians('pi/6').degFormatted).toBe('30.0000°');
    expect(convertFromRadians('-pi/6').radPiFormatted).toBe('-π/6 rad');
    expect(convertFromRadians('-pi/3').degFormatted).toBe('-60.0000°');
    expect(convertFromRadians('2*pi').radPiFormatted).toBe('2π rad');
    expect(convertFromRadians('2*pi').degFormatted).toBe('360.0000°');
  });

  it('converts Mode C sample: 45° 55\' 7.92" accurately', () => {
    const result = convertFromDMS(45, 55, 7.92);
    expect(result.degFormatted).toBe('45.9189°');
    expect(result.radDecFormatted).toBe('0.8014 rad');
    expect(result.radPiFormatted).toBe('0.2551π rad');
    expect(result.dms.formatted).toBe('45° 55\' 7.92"');
  });

  it('handles negative angles and 60-second rollover in DMS extraction', () => {
    const neg = extractDMS(-50.145);
    expect(neg.sign).toBe(-1);
    expect(neg.formatted).toBe('-50° 8\' 42.00"');

    // Rollover test: 10 + 59/60 + 59.999/3600 should roll over to 11° 0' 0.00"
    const rollover = extractDMS(10 + 59 / 60 + 59.999 / 3600);
    expect(rollover.degrees).toBe(11);
    expect(rollover.minutes).toBe(0);
    expect(rollover.seconds).toBe(0);
    expect(rollover.formatted).toBe('11° 0\' 0.00"');

    // Rational vs decimal formatRadPi
    expect(formatRadPi(30)).toBe('π/6 rad');
    expect(formatRadPi(50.145)).toBe('0.2786π rad');
  });
});

describe('M12 Math Engine — Sinusoidal Waveform Analytical Solver', () => {
  it('solves Reference Problem 1: v(t) = 340 sin(50πt - 0.541) with V_target = 200 V', () => {
    const res = solveSinusoidal({
      amplitude: 340,
      omegaInput: '50π',
      waveType: 'sin',
      phaseSign: '-',
      phiInput: '0.541',
      vTarget: 200,
    });

    expect(res.isValid).toBe(true);
    expect(res.periodS).toBeCloseTo(0.04, 6);
    expect(res.periodMs).toBeCloseTo(40.0, 4);
    expect(res.frequencyHz).toBeCloseTo(25.0, 4);
    expect(res.phiDegUnsigned).toBeCloseTo(31.0, 2);
    expect(res.phiDegFormatted).toBe('31.00°');
    expect(res.vAtZero).toBeCloseTo(-175.1, 2);
    expect(res.vAt10ms).toBeCloseTo(291.45, 2);
    expect(res.targetExceedsAmplitude).toBe(false);
    expect(res.tAtTargetMs).not.toBeNull();
    expect(res.tAtTargetMs!).toBeCloseTo(7.45, 2);
    expect(res.tAtTargetFormatted).toBe('7.45 ms');
    expect(res.tAtMaxMs).toBeCloseTo(13.44, 2);
    expect(res.tAtMaxFormatted).toBe('13.44 ms');
    expect(res.phaseStatusLabel).toBe('LAGGING (TERTINGGAL)');
  });

  it('solves Reference Problem 2: v(t) = 5 sin(100πt - 0.432) yielding t_max = 6.38 ms and guards |V_target| > A', () => {
    const res = solveSinusoidal({
      amplitude: 5,
      omegaInput: '100π',
      waveType: 'sin',
      phaseSign: '-',
      phiInput: '0.432',
      vTarget: 200,
    });

    expect(res.isValid).toBe(true);
    expect(res.omegaRad).toBeCloseTo(100 * Math.PI, 5);
    expect(res.periodS).toBeCloseTo(0.02, 6);
    expect(res.periodMs).toBeCloseTo(20.0, 4);
    expect(res.frequencyHz).toBeCloseTo(50.0, 4);
    expect(res.phiDegUnsigned).toBeCloseTo(24.75, 2);
    expect(res.phiDegFormatted).toBe('24.75°');
    expect(res.vAtZero).toBeCloseTo(-2.09, 2);
    expect(res.vAt10ms).toBeCloseTo(2.09, 2);
    expect(res.targetExceedsAmplitude).toBe(true);
    expect(res.tAtTargetMs).toBeNull();
    expect(res.tAtTargetFormatted).toBe('Melebihi Amplitudo (|V_target| > A)');
    expect(res.tAtMaxMs).toBeCloseTo(6.38, 2);
    expect(res.tAtMaxFormatted).toBe('6.38 ms');
  });

  it('parses symbolic π angular velocity and phase angles cleanly', () => {
    expect(parseSymbolicPi('100π')).toBeCloseTo(314.159265, 5);
    expect(parseSymbolicPi('50pi')).toBeCloseTo(157.079633, 5);
  });
});

describe('M12 ExcelJS Workbook Generation', () => {
  it('generates a formatted 3-sheet .xlsx buffer', async () => {
    const { buildPracticumWorkbookBuffer } = await import('@/lib/excel-exporter');
    const ExcelJS = (await import('exceljs')).default;

    const samplePayload = {
      student: {
        nama: 'M.Roihan',
        nim: '3.32.26.2.20',
        kelas: 'EK-1C',
      },
      angleLogs: [
        {
          id: 'a1',
          timestamp: '14:45:00',
          mode: 'Mode A' as const,
          rawInput: '50.145°',
          degValue: 50.145,
          degFormatted: '50.1450°',
          radDecValue: 0.8752,
          radDecFormatted: '0.8752 rad',
          radPiFormatted: '0.2786π rad',
          dmsFormatted: '50° 8\' 42.00"',
        },
      ],
      waveformLogs: [
        {
          id: 'w1',
          timestamp: '14:46:00',
          amplitude: 340,
          omegaInput: '50π',
          omegaRad: 157.0796,
          waveType: 'sin' as const,
          phaseSign: '-' as const,
          phiInput: '0.541',
          phiRad: -0.541,
          phiDeg: -31.0,
          phiFormatted: '-0.541 rad (-31.00°)',
          vTarget: 200,
          periodS: 0.04,
          periodMs: 40.0,
          frequencyHz: 25.0,
          vAtZero: -175.1,
          vAt10ms: 291.45,
          tAtTargetFormatted: '7.45 ms',
          tAtMaxMs: 13.44,
          equation: 'v(t) = 340 sin(50πt - 0.541) V',
          phaseStatus: 'LAGGING (TERTINGGAL) -31.00°',
        },
      ],
      arithmeticLogs: [
        {
          id: 'c1',
          timestamp: '14:47:00',
          expression: '0.1 + 0.2',
          result: '0.3',
          notes: 'Uji IEEE 754',
        },
      ],
    };

    const buffer = await buildPracticumWorkbookBuffer(samplePayload);
    expect(buffer.byteLength).toBeGreaterThan(1000);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const sheetNames = wb.worksheets.map((ws) => ws.name);
    expect(sheetNames).toEqual([
      'Konversi_Sudut',
      'Gelombang_Sinusoidal',
      'Kalkulator_Dasar',
    ]);
  }, 15000);
});

