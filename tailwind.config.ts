import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Satoshi',
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"Roboto Mono"',
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        cafe: {
          bg: '#000000',
          surface: '#0c0c0e',
          elevated: '#141417',
          pill: '#1c1c1e',
          ink: '#171515',
          fg: '#f4f4f5',
          body: '#b4bcbd',
          meta: '#8a8f90',
          blue: '#2f6bff',
          mint: '#35ff92',
        },
      },
    },
  },
  plugins: [],
};

export default config;
