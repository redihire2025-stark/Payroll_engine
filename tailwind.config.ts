import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1E2A33',
        bg: '#F6F8F8',
        surface: '#FFFFFF',
        border: {
          DEFAULT: '#E2E8E7',
          soft: '#ECF1F0',
        },
        text: {
          DEFAULT: '#1B2422',
          muted: '#5C6D69',
          faint: '#8B9C98',
        },
        accent: {
          DEFAULT: '#0D9488',
          soft: '#DDF5F1',
          strong: '#0B7A70',
        },
        success: { DEFAULT: '#15803D', soft: '#DEF7E6' },
        warning: { DEFAULT: '#B7791F', soft: '#FCEFD9' },
        danger: { DEFAULT: '#C0392E', soft: '#FBE8E5' },
        info: { DEFAULT: '#2563A6', soft: '#E5F0FA' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 2px 10px rgba(15,40,35,0.06), 0 1px 2px rgba(15,40,35,0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config;
