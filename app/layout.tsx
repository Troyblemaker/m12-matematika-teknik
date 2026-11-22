import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  title:
    'Matematika Teknik (M12) — Angle Conversion, Scientific Calculator & Sinusoidal Waveform Simulator',
  description:
    'Aplikasi Praktikum Matematika Teknik (M12): Scientific Calculator Presisi Decimal.js, Konversi Sudut (Derajat Desimal, Radian π, DMS), dan Simulator Gelombang Sinusoidal AC dengan Ekspor Excel (.xlsx).',
  applicationName: 'M12 Matematika Teknik Simulator',
  authors: [{ name: 'M.Roihan', url: 'https://m12-matematika-teknik.vercel.app' }],
  keywords: [
    'Matematika Teknik',
    'M12',
    'Konversi Sudut',
    'Radian',
    'DMS',
    'Gelombang Sinusoidal AC',
    'Scientific Calculator',
    'Decimal.js',
  ],
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    title:
      'Matematika Teknik (M12) — Angle Conversion, Scientific Calculator & Sinusoidal Simulator',
    description:
      'Laboratorium Virtual Praktikum Matematika Teknik (M12): Kalkulator Ilmiah 50-Digit, Konversi Satuan Sudut, dan Osiloskop Interaktif Gelombang Sinusoidal AC.',
    type: 'website',
    locale: 'id_ID',
    siteName: 'Matematika Teknik (M12)',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Matematika Teknik (M12) — Interactive Engineering Math Lab',
    description:
      'Kalkulator Ilmiah Presisi Decimal.js, Konversi Sudut (° ↔ rad ↔ DMS), dan Simulator Osiloskop Gelombang Sinusoidal AC.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-black text-[#f4f4f5] antialiased selection:bg-[#2f6bff] selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#35ff92] focus:text-[#171515] focus:font-mono focus:text-xs focus:font-bold focus:shadow-lg"
        >
          Lewati ke Konten Utama
        </a>
        {children}
      </body>
    </html>
  );
}
