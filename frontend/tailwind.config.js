/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        quantum: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
          950: '#1e3a5f',
        },
        // Cyan accent sampled from the hero photograph's hologram glow. Used
        // for the landing page's highlights so the UI and the image read as
        // one palette rather than a photo with a UI bolted on top.
        glow: {
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        // Background ramp, darkest first. `ink-950` is the page background the
        // hero gradient fades into.
        ink: {
          950: '#0a0a1a',
          900: '#0d0d20',
          850: '#101026',
          800: '#12122a',
          700: '#1a1a3e',
          600: '#252550',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        // Hero particles drift on CSS keyframes rather than per-element JS
        // animation — 20 elements animating on the compositor costs far less
        // than 20 independent rAF loops.
        float: 'float 7s ease-in-out infinite',
        'float-slow': 'float 11s ease-in-out infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
        'scroll-cue': 'scroll-cue 2.2s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(92, 124, 250, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(92, 124, 250, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -14px, 0)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '0.9' },
        },
        'scroll-cue': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.35' },
          '50%': { transform: 'translateY(6px)', opacity: '0.85' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 12px -2px rgba(34, 211, 238, 0.35)',
        'glow-md': '0 0 28px -6px rgba(34, 211, 238, 0.45)',
        'glow-lg': '0 0 60px -12px rgba(34, 211, 238, 0.5)',
      },
    },
  },
  plugins: [],
}
