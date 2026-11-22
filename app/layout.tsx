import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:
    'Matematika Teknik (M12) — Angle Conversion, Basic Calculator & Sinusoidal Waveform Simulator',
  description:
    'Aplikasi Praktikum Matematika Teknik (M12): Kalkulator Presisi Decimal.js, Konversi Sudut (Derajat Desimal, Radian π, DMS), dan Simulator Gelombang Sinusoidal AC dengan Ekspor Excel (.xlsx).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-black text-[#f4f4f5] antialiased selection:bg-[#2f6bff] selection:text-white">
        {children}
      </body>
    </html>
  );
}
