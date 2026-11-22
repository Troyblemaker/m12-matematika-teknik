'use client';

import React, { useState } from 'react';
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Compass,
  Hash,
  User,
  Users,
} from 'lucide-react';
import { NavigationTab, StudentIdentity } from '@/lib/types';

interface HeaderIdentityBarProps {
  student: StudentIdentity;
  onUpdateStudent: (updated: StudentIdentity) => void;
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  counts: {
    arithmetic: number;
    angle: number;
    waveform: number;
  };
}

export default function HeaderIdentityBar({
  student,
  onUpdateStudent,
  activeTab,
  onSelectTab,
  counts,
}: HeaderIdentityBarProps) {
  const [mobileIdentityOpen, setMobileIdentityOpen] = useState(false);

  const isIdentityComplete =
    student.nama.trim().length > 0 &&
    student.nim.trim().length > 0 &&
    student.kelas.trim().length > 0;

  const summaryName = student.nama.trim() || 'M.Roihan';
  const summaryNim = student.nim.trim() || '3.32.26.2.20';
  const summaryKelas = student.kelas.trim() || 'EK-1C';

  return (
    <header className="border-b border-white/[0.12] bg-[#0a0a0c]/95 backdrop-blur-xl relative md:sticky md:top-0 z-30 print:static print:bg-white print:border-zinc-300">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 space-y-3.5 sm:space-y-4">
        {/* Top Editorial Title Bar */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sinusoidal App Icon */}
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#101013] border border-white/[0.16] flex items-center justify-center shrink-0 shadow-md"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 64 64"
                fill="none"
                className="w-6 h-6 sm:w-7 sm:h-7"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="headerSineGrad"
                    x1="6"
                    y1="12"
                    x2="58"
                    y2="52"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#35ff92" />
                    <stop offset="50%" stopColor="#2f6bff" />
                    <stop offset="100%" stopColor="#35ff92" />
                  </linearGradient>
                </defs>
                <line
                  x1="6"
                  y1="32"
                  x2="58"
                  y2="32"
                  stroke="#ffffff"
                  strokeOpacity="0.22"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
                <path
                  d="M 6 32 C 13 8, 25 8, 32 32 C 39 56, 51 56, 58 32"
                  stroke="url(#headerSineGrad)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="19" cy="14" r="3.2" fill="#35ff92" />
                <circle cx="45" cy="50" r="3.2" fill="#2f6bff" />
              </svg>
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] sm:text-xs font-bold tracking-[0.08em] uppercase text-[#f4f4f5]">
                  [M12]
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.08em] uppercase text-[#9ca3af] truncate">
                  MATEMATIKA TEKNIK · PRAKTIKUM INTERAKTIF
                </span>
              </div>
              <h1 className="text-sm sm:text-xl lg:text-2xl font-bold text-[#f4f4f5] tracking-[-0.02em] leading-snug print:text-black">
                Matematika Teknik (M12) — Angle Conversion, Scientific Calculator &amp; Sinusoidal Simulator
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 shrink-0 print:hidden">
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-[0.06em] uppercase border ${
                isIdentityComplete
                  ? 'bg-[#18181c] text-[#f4f4f5] border-white/[0.16]'
                  : 'bg-[#18181c] text-[#b4bcbd] border-white/[0.12]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isIdentityComplete ? 'bg-[#35ff92]' : 'bg-[#2f6bff] animate-pulse'
                }`}
              />
              {isIdentityComplete ? 'Identitas Tersimpan' : 'Lengkapi Identitas'}
            </span>
          </div>
        </div>

        {/* Persistent Student Identity Bar (Collapsible on Mobile, Always Open on sm+) */}
        <div className="cafe-card rounded-2xl p-3 sm:p-4 print:bg-zinc-50 print:border-zinc-300">
          {/* Mobile Compact Toggle Bar */}
          <button
            type="button"
            onClick={() => setMobileIdentityOpen((prev) => !prev)}
            className="w-full flex sm:hidden items-center justify-between gap-2 text-left cursor-pointer"
            aria-expanded={mobileIdentityOpen}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isIdentityComplete ? 'bg-[#35ff92]' : 'bg-[#2f6bff]'
                  }`}
                />
                <span className="text-[10px] font-mono tracking-[0.08em] uppercase text-[#9ca3af]">
                  [IDENTITAS PRAKTIKUM]
                </span>
              </div>
              <div className="text-xs font-mono text-[#f4f4f5] truncate mt-0.5">
                {summaryName} · {summaryNim} · {summaryKelas}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#222227] border border-white/[0.14] text-[10px] font-mono text-[#c4c9cf] shrink-0">
              <span>{mobileIdentityOpen ? 'Tutup' : 'Edit'}</span>
              {mobileIdentityOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {/* Desktop Header Row */}
          <div className="hidden sm:flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono tracking-[0.08em] uppercase text-[#9ca3af] print:text-zinc-700">
              [IDENTITAS PRAKTIKUM MAHASISWA]
            </span>
            <span className="text-[10px] font-mono tracking-[0.06em] uppercase text-[#9ca3af]">
              AUTO-PERSIST · LOCALSTORAGE
            </span>
          </div>

          <div
            className={`${
              mobileIdentityOpen ? 'grid mt-3 pt-3 border-t border-white/[0.1]' : 'hidden'
            } sm:grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 sm:mt-0 sm:pt-0 sm:border-0`}
          >
            {/* Nama Input */}
            <div>
              <label
                htmlFor="student-nama"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1 print:text-zinc-600"
              >
                Nama Mahasiswa
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-nama"
                  type="text"
                  value={student.nama}
                  onChange={(e) =>
                    onUpdateStudent({ ...student, nama: e.target.value })
                  }
                  placeholder="M.Roihan"
                  className="cafe-input w-full pl-9 pr-3.5 py-2 text-base sm:text-sm rounded-xl placeholder-[#9ca3af]/50 print:bg-white print:text-black print:border-zinc-400"
                />
              </div>
            </div>

            {/* NIM Input */}
            <div>
              <label
                htmlFor="student-nim"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1 print:text-zinc-600"
              >
                NIM
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-nim"
                  type="text"
                  value={student.nim}
                  onChange={(e) =>
                    onUpdateStudent({ ...student, nim: e.target.value })
                  }
                  placeholder="3.32.26.2.20"
                  className="cafe-input w-full pl-9 pr-3.5 py-2 text-base sm:text-sm font-mono tabular-nums rounded-xl placeholder-[#9ca3af]/50 print:bg-white print:text-black print:border-zinc-400"
                />
              </div>
            </div>

            {/* Kelas Input */}
            <div>
              <label
                htmlFor="student-kelas"
                className="block text-[10px] font-mono uppercase tracking-[0.08em] text-[#9ca3af] mb-1 print:text-zinc-600"
              >
                Kelas
              </label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-kelas"
                  type="text"
                  value={student.kelas}
                  onChange={(e) =>
                    onUpdateStudent({ ...student, kelas: e.target.value })
                  }
                  placeholder="EK-1C"
                  className="cafe-input w-full pl-9 pr-3.5 py-2 text-base sm:text-sm font-mono rounded-xl placeholder-[#9ca3af]/50 print:bg-white print:text-black print:border-zinc-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Pill Tabs — Compact 3-Column Horizontal Bar on Mobile & Desktop */}
        <nav
          aria-label="Navigasi Modul Praktikum"
          className="grid grid-cols-3 gap-1.5 sm:gap-2.5 print:hidden"
        >
          <button
            type="button"
            onClick={() => onSelectTab('tujuan')}
            className={`flex items-center justify-center sm:justify-between px-2.5 sm:px-5 py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer border min-h-[42px] ${
              activeTab === 'tujuan'
                ? 'bg-[#f4f4f5] text-[#171515] border-[#f4f4f5] font-semibold shadow-lg'
                : 'bg-[#18181c] text-[#b4bcbd] border-white/[0.14] hover:bg-[#222227] hover:text-[#f4f4f5] hover:border-white/[0.22]'
            }`}
          >
            <span className="flex items-center gap-1.5 sm:gap-2 truncate">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden truncate">1. Tujuan</span>
              <span className="hidden sm:inline truncate">1. Tujuan Pembelajaran</span>
            </span>
            {counts.arithmetic > 0 && (
              <span
                className={`hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono tabular-nums rounded-full ${
                  activeTab === 'tujuan'
                    ? 'bg-[#171515] text-[#f4f4f5]'
                    : 'bg-white/[0.12] text-[#f4f4f5]'
                }`}
              >
                {counts.arithmetic}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('konversi')}
            className={`flex items-center justify-center sm:justify-between px-2.5 sm:px-5 py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer border min-h-[42px] ${
              activeTab === 'konversi'
                ? 'bg-[#f4f4f5] text-[#171515] border-[#f4f4f5] font-semibold shadow-lg'
                : 'bg-[#18181c] text-[#b4bcbd] border-white/[0.14] hover:bg-[#222227] hover:text-[#f4f4f5] hover:border-white/[0.22]'
            }`}
          >
            <span className="flex items-center gap-1.5 sm:gap-2 truncate">
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden truncate">2. Sudut</span>
              <span className="hidden sm:inline truncate">2. Konversi Sudut</span>
            </span>
            <span
              className={`ml-1 sm:ml-0 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-mono tabular-nums rounded-full shrink-0 ${
                activeTab === 'konversi'
                  ? 'bg-[#171515] text-[#f4f4f5]'
                  : 'bg-white/[0.12] text-[#f4f4f5]'
              }`}
            >
              {counts.angle}/12
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('sinusoidal')}
            className={`flex items-center justify-center sm:justify-between px-2.5 sm:px-5 py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer border min-h-[42px] ${
              activeTab === 'sinusoidal'
                ? 'bg-[#f4f4f5] text-[#171515] border-[#f4f4f5] font-semibold shadow-lg'
                : 'bg-[#18181c] text-[#b4bcbd] border-white/[0.14] hover:bg-[#222227] hover:text-[#f4f4f5] hover:border-white/[0.22]'
            }`}
          >
            <span className="flex items-center gap-1.5 sm:gap-2 truncate">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden truncate">3. Sinus</span>
              <span className="hidden sm:inline truncate">3. Sinusoidal Form</span>
            </span>
            {counts.waveform > 0 && (
              <span
                className={`hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono tabular-nums rounded-full ${
                  activeTab === 'sinusoidal'
                    ? 'bg-[#171515] text-[#f4f4f5]'
                    : 'bg-white/[0.12] text-[#f4f4f5]'
                }`}
              >
                {counts.waveform}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
