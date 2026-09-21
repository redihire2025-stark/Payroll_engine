import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12151C',
        bg: '#F5F6F8',
        surface: '#FFFFFF',
        border: {
          DEFAULT: '#E3E6EA',
          soft: '#ECEEF1',
        },
        text: {
          DEFAULT: '#171B23',
          muted: '#5B6472',
          faint: '#8B93A1',
        },
        accent: {
          DEFAULT: '#0B5D45',
          soft: '#E3F0EC',
          strong: '#08402F',
        },
        success: { DEFAULT: '#1F7A4D', soft: '#E4F3EA' },
        warning: { DEFAULT: '#A6690A', soft: '#FBEDD9' },
        danger: { DEFAULT: '#B23A34', soft: '#FBE7E5' },
        info: { DEFAULT: '#2B5F8A', soft: '#E7EFF6' },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,23,31,0.06), 0 1px 0 rgba(20,23,31,0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
