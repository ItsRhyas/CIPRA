import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ci: {
          bg: '#F6F7F9',
          surface: '#FFFFFF',
          text: '#131417',
          muted: '#556270',
          accent: '#1E3A5F',
          rule: '#DDE1E6',
          'rule-strong': '#C4CAD4',
          'accent-hover': '#162D4A',
          'accent-subtle': '#EEF1F5',
          danger: '#DC4A4A',
          'danger-bg': '#FEF2F2',
          warning: '#B45309',
          'warning-bg': '#FFFBEB',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        precise: '-0.011em',
      },
    },
  },
  plugins: [],
};

export default config;
