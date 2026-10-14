/** @type {import('tailwindcss').Config} */

/*
 * Design tokens for QuantumIQ — see DESIGN.md for the reasoning behind every
 * value here. The short version: this is a lab instrument, so the palette is
 * sampled from the dilution-refrigerator photograph (copper and gold on warm
 * black), copper is the only accent, and there are no gradients.
 *
 * Anything added here must be a token with a stated role. The previous theme
 * grew a `glow` ramp, three glow shadows and six decorative keyframes that
 * nothing could justify; that is the failure mode this comment exists to
 * prevent.
 *
 * On tonal range: the first pass of this palette spanned only 15 levels from
 * the page background to the brightest surface, and every section shared one
 * ground, so the whole interface read as a single flat black. The surfaces
 * below are deliberately further apart. The fix for "it looks too dark" is
 * range, not a second hue.
 */

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Ground: warm blacks and graphite ──────────────────────────
        // Warm, not neutral. The photograph's background is a warm black and
        // a neutral #0a0a0a next to it reads blue by comparison.
        // The page ground, plus the two variants that give the page vertical
        // rhythm: `lift` is the field an instrument is mounted on, `deep` is
        // the ground beneath everything (the footer).
        void: {
          DEFAULT: '#080706',
          lift: '#0C0B09',
          deep: '#0A0908',
        },
        panel: {
          DEFAULT: '#16130F', // faceplate ground
          raised: '#1F1A14', // keycaps, inputs, header rows
          sunk: '#0A0908', // readout wells, circuit canvas, bar troughs
        },
        rule: {
          DEFAULT: '#2B251D', // the default 1px hairline
          strong: '#3E342A', // a visible seam between two parts
        },

        // ── Accent: copper. The only accent in the system. ────────────
        copper: {
          100: '#F7E0C4',
          200: '#EFC79C',
          300: '#E2A871',
          400: '#D28E4E', // primary
          500: '#B2702F',
          600: '#8A531F',
          700: '#5E3814',
          900: '#2A1A0C',
        },

        // ── Steel: the nickel tubing. Secondary neutral. ──────────────
        steel: {
          200: '#D6D0C6',
          400: '#9D968A',
          600: '#60594F',
        },

        // ── Text ──────────────────────────────────────────────────────
        ink: {
          primary: '#F0EAE1',
          secondary: '#ABA399',
          // Lifted alongside the surfaces: at the old #857D73 the 11px
          // nameplate labels fell to 4.26:1 on the raised panel, under AA.
          tertiary: '#938B80',
          // Below AA by design — decorative marks only, never load-bearing
          // text. See DESIGN.md §3.
          faint: '#645D54',
        },

        // ── Signal: the refrigerator's red crown. ─────────────────────
        // Destructive actions and failures only.
        signal: {
          DEFAULT: '#C4382B',
          dim: '#7E2A21',
        },
      },

      fontFamily: {
        // Display: a precise grotesk with mechanical terminals.
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        // Body: built for technical documentation.
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        // Readouts only — ket notation, coordinates, gate names, counters.
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      fontSize: {
        // name:          [size,      { lineHeight, letterSpacing }]
        'display': ['3.5rem', { lineHeight: '1', letterSpacing: '-0.03em' }],
        'display-sm': ['2.375rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        'h2': ['1.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'h3': ['1.125rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'body': ['0.9375rem', { lineHeight: '1.6' }],
        'small': ['0.8125rem', { lineHeight: '1.5' }],
        'micro': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.14em' }],
        'readout': ['0.8125rem', { lineHeight: '1.4' }],
        'readout-sm': ['0.6875rem', { lineHeight: '1.3' }],
      },

      spacing: {
        // The 4px base is Tailwind's own; these are the named additions the
        // layout needs. Panel geometry is shared with the circuit grid, which
        // positions gates absolutely and must agree with the CSS.
        'row': '3.25rem', // 52px — one qubit wire's height
        'col': '3.25rem', // 52px — one circuit time step's width
        'gutter': '3.5rem', // 56px — the qubit-label gutter
      },

      borderRadius: {
        // Machined aluminium. Nothing here is rounder than 4px.
        panel: '3px',
        key: '4px',
        tight: '2px',
      },

      transitionTimingFunction: {
        // The one curve: fast departure, long settle. An instrument needle.
        instrument: 'cubic-bezier(0.2, 0, 0, 1)',
      },

      transitionDuration: {
        key: '90ms', // keypress — mechanical, near-instant
        state: '180ms', // hover, focus, selection
        move: '420ms', // a value moving because the physics moved
        enter: '560ms', // content entering on first view
      },

      boxShadow: {
        // The only shadows in the system: a keycap's lit top edge, and the
        // inset it gets when pressed. No spread, no glow.
        key: 'inset 0 1px 0 0 rgba(247, 224, 196, 0.07)',
        'key-pressed': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.5)',
      },

      maxWidth: {
        // The console's measure. Wide enough for the circuit, the readouts and
        // the tutor side by side without the tutor becoming a column of
        // two-word lines.
        console: '82rem',
        prose: '38rem',
      },

      animation: {
        // Exactly one, and it is a loading state rather than decoration: the
        // sweep across a panel waiting on the backend.
        sweep: 'sweep 1.6s cubic-bezier(0.2, 0, 0, 1) infinite',
      },

      keyframes: {
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
    },
  },
  plugins: [],
}
