'use client';

import ExcelJS from 'exceljs';
import {
  AngleLogEntry,
  ArithmeticLogEntry,
  StudentIdentity,
  WaveformLogEntry,
} from './types';

function addIdentityHeaderBlock(
  sheet: ExcelJS.Worksheet,
  title: string,
  student: StudentIdentity,
  exportedAt: string
) {
  const titleRow = sheet.addRow([title]);
  titleRow.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };
  titleRow.height = 26;
  titleRow.alignment = { vertical: 'middle', horizontal: 'left' };

  sheet.addRow([]);

  const identityRows: [string, string][] = [
    ['Nama Mahasiswa', student.nama || '(Belum diisi)'],
    ['NIM', student.nim || '(Belum diisi)'],
    ['Kelas', student.kelas || '(Belum diisi)'],
    ['Waktu Ekspor', exportedAt],
  ];

  for (const [label, val] of identityRows) {
    const r = sheet.addRow([label, val]);
    r.getCell(1).font = { bold: true, color: { argb: 'FF1E293B' } };
    r.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    r.getCell(2).font = { bold: false, color: { argb: 'FF0F172A' } };
  }

  sheet.addRow([]);
}

function styleTableHeader(row: ExcelJS.Row, colCount: number) {
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0369A1' } },
      bottom: { style: 'thin', color: { argb: 'FF0369A1' } },
      left: { style: 'thin', color: { argb: 'FF0369A1' } },
      right: { style: 'thin', color: { argb: 'FF0369A1' } },
    };
  }
}

function styleDataRow(row: ExcelJS.Row, colCount: number, isEven: boolean) {
  row.height = 20;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'center' : 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  }
}

/**
 * Generates an Excel (.xlsx) workbook with 3 worksheets:
 * 1. Konversi_Sudut
 * 2. Gelombang_Sinusoidal
 * 3. Kalkulator_Dasar
 * Returns an ArrayBuffer ready for browser download.
 */
export async function buildPracticumWorkbookBuffer(params: {
  student: StudentIdentity;
  angleLogs: AngleLogEntry[];
  waveformLogs: WaveformLogEntry[];
  arithmeticLogs: ArithmeticLogEntry[];
}): Promise<ArrayBuffer> {
  const { student, angleLogs, waveformLogs, arithmeticLogs } = params;
  const exportedAt = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = student.nama || 'Matematika Teknik M12';
  workbook.created = new Date();

  // ==========================================================================
  // Sheet 1: Konversi_Sudut
  // ==========================================================================
  const sheetAngle = workbook.addWorksheet('Konversi_Sudut');
  addIdentityHeaderBlock(
    sheetAngle,
    'LAPORAN PRAKTIKUM M12 — TABEL 1: KONVERSI SATUAN SUDUT',
    student,
    exportedAt
  );
  sheetAngle.mergeCells('A1:H1');

  const angleHeaders = [
    'No',
    'Waktu',
    'Mode',
    'Input Awal',
    'Derajat Desimal (°)',
    'Radian Desimal (rad)',
    'Radian (π)',
    'DMS (° \' ")',
  ];
  const angleHeaderRow = sheetAngle.addRow(angleHeaders);
  styleTableHeader(angleHeaderRow, angleHeaders.length);

  angleLogs.forEach((entry, index) => {
    const r = sheetAngle.addRow([
      index + 1,
      entry.timestamp,
      entry.mode,
      entry.rawInput,
      entry.degFormatted,
      entry.radDecFormatted,
      entry.radPiFormatted,
      entry.dmsFormatted,
    ]);
    styleDataRow(r, angleHeaders.length, index % 2 === 1);
  });

  sheetAngle.columns = [
    { width: 8 },
    { width: 22 },
    { width: 14 },
    { width: 22 },
    { width: 20 },
    { width: 22 },
    { width: 20 },
    { width: 22 },
  ];

  // ==========================================================================
  // Sheet 2: Gelombang_Sinusoidal
  // ==========================================================================
  const sheetWave = workbook.addWorksheet('Gelombang_Sinusoidal');
  addIdentityHeaderBlock(
    sheetWave,
    'LAPORAN PRAKTIKUM M12 — TABEL 2: SIMULASI & ANALISIS GELOMBANG SINUSOIDAL AC',
    student,
    exportedAt
  );
  sheetWave.mergeCells('A1:M1');

  const waveHeaders = [
    'No',
    'Waktu',
    'Amplitudo A (V)',
    'ω Input (rad/s)',
    'ω Numerik (rad/s)',
    'Sudut Fase φ (rad / °)',
    'Persamaan Gelombang v(t)',
    'Jenis Fase',
    'Periode T (ms)',
    'Frekuensi f (Hz)',
    'v(0) (V)',
    'v(10 ms) (V)',
    't saat V_target / t_max (ms)',
  ];
  const waveHeaderRow = sheetWave.addRow(waveHeaders);
  styleTableHeader(waveHeaderRow, waveHeaders.length);

  waveformLogs.forEach((entry, index) => {
    const r = sheetWave.addRow([
      index + 1,
      entry.timestamp,
      entry.amplitude,
      entry.omegaInput,
      Number(entry.omegaRad.toFixed(4)),
      entry.phiFormatted,
      entry.equation,
      entry.phaseStatus,
      Number(entry.periodMs.toFixed(2)),
      Number(entry.frequencyHz.toFixed(2)),
      Number(entry.vAtZero.toFixed(2)),
      Number(entry.vAt10ms.toFixed(2)),
      `V_target(${entry.vTarget}V): ${entry.tAtTargetFormatted} | t_max: ${entry.tAtMaxMs.toFixed(2)} ms`,
    ]);
    styleDataRow(r, waveHeaders.length, index % 2 === 1);
  });

  sheetWave.columns = [
    { width: 8 },
    { width: 20 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 22 },
    { width: 32 },
    { width: 24 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 38 },
  ];

  // ==========================================================================
  // Sheet 3: Kalkulator_Dasar
  // ==========================================================================
  const sheetCalc = workbook.addWorksheet('Kalkulator_Dasar');
  addIdentityHeaderBlock(
    sheetCalc,
    'LAPORAN PRAKTIKUM M12 — TABEL 3: KALKULATOR ARITMATIKA PRESISI (DECIMAL.JS)',
    student,
    exportedAt
  );
  sheetCalc.mergeCells('A1:E1');

  const calcHeaders = [
    'No',
    'Waktu',
    'Ekspresi Matematika',
    'Hasil Presisi (Decimal.js)',
    'Catatan',
  ];
  const calcHeaderRow = sheetCalc.addRow(calcHeaders);
  styleTableHeader(calcHeaderRow, calcHeaders.length);

  arithmeticLogs.forEach((entry, index) => {
    const r = sheetCalc.addRow([
      index + 1,
      entry.timestamp,
      entry.expression,
      entry.result,
      entry.notes || 'Perhitungan Presisi Decimal.js',
    ]);
    styleDataRow(r, calcHeaders.length, index % 2 === 1);
  });

  sheetCalc.columns = [
    { width: 8 },
    { width: 22 },
    { width: 36 },
    { width: 28 },
    { width: 30 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/**
 * Triggers a browser download of the generated .xlsx file
 */
export async function downloadPracticumExcel(params: {
  student: StudentIdentity;
  angleLogs: AngleLogEntry[];
  waveformLogs: WaveformLogEntry[];
  arithmeticLogs: ArithmeticLogEntry[];
}): Promise<void> {
  const buffer = await buildPracticumWorkbookBuffer(params);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safeNim = (params.student.nim || 'Mahasiswa').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeKelas = (params.student.kelas || 'M12').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Praktikum_M12_${safeKelas}_${safeNim}.xlsx`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
