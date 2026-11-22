'use client';

import React, { useEffect, useState } from 'react';
import HeaderIdentityBar from '@/components/HeaderIdentityBar';
import PrintReportSheet from '@/components/PrintReportSheet';
import Tab1LearningAndCalc from '@/components/Tab1LearningAndCalc';
import Tab2AngleConverter from '@/components/Tab2AngleConverter';
import Tab3SinusoidalSimulator from '@/components/Tab3SinusoidalSimulator';
import {
  AngleLogEntry,
  ArithmeticLogEntry,
  NavigationTab,
  SinusoidalInputParams,
  StudentIdentity,
  WaveformLogEntry,
} from '@/lib/types';

const STORAGE_KEYS = {
  STUDENT: 'm12_student_identity_v1',
  ANGLE_LOGS: 'm12_angle_logs_v1',
  WAVEFORM_LOGS: 'm12_waveform_logs_v1',
  ARITHMETIC_LOGS: 'm12_arithmetic_logs_v1',
};

const DEFAULT_STUDENT: StudentIdentity = {
  nama: '',
  nim: '',
  kelas: '',
};

const DEFAULT_SINUSOIDAL_PARAMS: SinusoidalInputParams = {
  amplitude: 340,
  omegaInput: '50π',
  waveType: 'sin',
  phaseSign: '-',
  phiInput: '0.541',
  vTarget: 200,
};

export default function M12DashboardPage() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('tujuan');
  const [student, setStudent] = useState<StudentIdentity>(DEFAULT_STUDENT);
  const [angleLogs, setAngleLogs] = useState<AngleLogEntry[]>([]);
  const [waveformLogs, setWaveformLogs] = useState<WaveformLogEntry[]>([]);
  const [arithmeticLogs, setArithmeticLogs] = useState<ArithmeticLogEntry[]>([]);
  const [sinusoidalParams, setSinusoidalParams] = useState<SinusoidalInputParams>(
    DEFAULT_SINUSOIDAL_PARAMS
  );
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate persisted state from localStorage on mount
  useEffect(() => {
    try {
      const savedStudent = localStorage.getItem(STORAGE_KEYS.STUDENT);
      if (savedStudent) {
        const parsed = JSON.parse(savedStudent) as StudentIdentity;
        if (parsed.kelas === 'TRIL 2C' && !parsed.nama && !parsed.nim) {
          parsed.kelas = '';
        }
        setStudent(parsed);
      }

      const savedAngle = localStorage.getItem(STORAGE_KEYS.ANGLE_LOGS);
      if (savedAngle) {
        setAngleLogs(JSON.parse(savedAngle) as AngleLogEntry[]);
      }

      const savedWaveform = localStorage.getItem(STORAGE_KEYS.WAVEFORM_LOGS);
      if (savedWaveform) {
        setWaveformLogs(JSON.parse(savedWaveform) as WaveformLogEntry[]);
      }

      const savedArithmetic = localStorage.getItem(STORAGE_KEYS.ARITHMETIC_LOGS);
      if (savedArithmetic) {
        setArithmeticLogs(JSON.parse(savedArithmetic) as ArithmeticLogEntry[]);
      }
    } catch {
      // Ignore corrupt localStorage entries
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist student identity to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENT, JSON.stringify(student));
    } catch {
      // Ignore quota errors
    }
  }, [student, isHydrated]);

  // Persist angle logs to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ANGLE_LOGS, JSON.stringify(angleLogs));
    } catch {
      // Ignore quota errors
    }
  }, [angleLogs, isHydrated]);

  // Persist waveform logs to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.WAVEFORM_LOGS, JSON.stringify(waveformLogs));
    } catch {
      // Ignore quota errors
    }
  }, [waveformLogs, isHydrated]);

  // Persist arithmetic logs to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEYS.ARITHMETIC_LOGS,
        JSON.stringify(arithmeticLogs)
      );
    } catch {
      // Ignore quota errors
    }
  }, [arithmeticLogs, isHydrated]);

  // Handlers for Arithmetic Logs
  const handleAddArithmeticLog = (entry: ArithmeticLogEntry) => {
    setArithmeticLogs((prev) => [...prev, entry]);
  };
  const handleDeleteArithmeticLog = (id: string) => {
    setArithmeticLogs((prev) => prev.filter((item) => item.id !== id));
  };
  const handleClearArithmeticLogs = () => {
    setArithmeticLogs([]);
  };

  // Handlers for Angle Logs
  const handleAddAngleLog = (entry: AngleLogEntry) => {
    setAngleLogs((prev) => [...prev, entry]);
  };
  const handleDeleteAngleLog = (id: string) => {
    setAngleLogs((prev) => prev.filter((item) => item.id !== id));
  };
  const handleClearAngleLogs = () => {
    setAngleLogs([]);
  };

  // Handlers for Waveform Logs
  const handleAddWaveformLog = (entry: WaveformLogEntry) => {
    setWaveformLogs((prev) => [...prev, entry]);
  };
  const handleDeleteWaveformLog = (id: string) => {
    setWaveformLogs((prev) => prev.filter((item) => item.id !== id));
  };
  const handleClearWaveformLogs = () => {
    setWaveformLogs([]);
  };

  // One-click sample loader from Tab 1 to Tab 3 Simulator
  const handleLoadSampleToSimulator = (sample: SinusoidalInputParams) => {
    setSinusoidalParams(sample);
    setActiveTab('sinusoidal');
  };

  return (
    <>
      {/* Dedicated Single-Page Compact A4 Print/PDF Report Sheet (Per Active Tab) */}
      <PrintReportSheet
        activeTab={activeTab}
        student={student}
        sinusoidalParams={sinusoidalParams}
        angleLogs={angleLogs}
        waveformLogs={waveformLogs}
        arithmeticLogs={arithmeticLogs}
      />

      {/* Interactive Dark Screen Dashboard */}
      <div className="screen-only-dashboard min-h-screen flex flex-col bg-black text-[#f4f4f5]">
        <HeaderIdentityBar
          student={student}
          onUpdateStudent={setStudent}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          counts={{
            arithmetic: arithmeticLogs.length,
            angle: angleLogs.length,
            waveform: waveformLogs.length,
          }}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          {activeTab === 'tujuan' && (
            <Tab1LearningAndCalc
              student={student}
              angleLogs={angleLogs}
              waveformLogs={waveformLogs}
              arithmeticLogs={arithmeticLogs}
              onAddArithmeticLog={handleAddArithmeticLog}
              onDeleteArithmeticLog={handleDeleteArithmeticLog}
              onClearArithmeticLogs={handleClearArithmeticLogs}
              onLoadSampleToSimulator={handleLoadSampleToSimulator}
            />
          )}

          {activeTab === 'konversi' && (
            <Tab2AngleConverter
              student={student}
              angleLogs={angleLogs}
              waveformLogs={waveformLogs}
              arithmeticLogs={arithmeticLogs}
              onAddAngleLog={handleAddAngleLog}
              onDeleteAngleLog={handleDeleteAngleLog}
              onClearAngleLogs={handleClearAngleLogs}
            />
          )}

          {activeTab === 'sinusoidal' && (
            <Tab3SinusoidalSimulator
              student={student}
              params={sinusoidalParams}
              onChangeParams={setSinusoidalParams}
              angleLogs={angleLogs}
              waveformLogs={waveformLogs}
              arithmeticLogs={arithmeticLogs}
              onAddWaveformLog={handleAddWaveformLog}
              onDeleteWaveformLog={handleDeleteWaveformLog}
              onClearWaveformLogs={handleClearWaveformLogs}
            />
          )}
        </main>

        <footer className="border-t border-white/[0.08] bg-black py-5 px-4 sm:px-6 lg:px-8 print:hidden">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[#8a8f90]">
            <span>[M12] MATEMATIKA TEKNIK — ANGLE CONVERSION &amp; SINUSOIDAL SIMULATOR</span>
            <span>CLIENT-SIDE DECIMAL.JS · EXCELJS (.XLSX) · LOCALSTORAGE</span>
          </div>
        </footer>
      </div>
    </>
  );
}
