import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Matematika Teknik (M12) — Angle Conversion, Scientific Calculator & Sinusoidal Simulator',
    short_name: 'M12 Matematika Teknik',
    description:
      'Aplikasi Praktikum Matematika Teknik (M12): Scientific Calculator Presisi 50-Digit Decimal.js, Konversi Sudut (Derajat, Radian π, DMS), dan Simulator Osiloskop Gelombang Sinusoidal AC.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    lang: 'id-ID',
    orientation: 'any',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
