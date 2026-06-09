/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── BRAND (Hybrid: Figma teal + MVP gold) ──────────────────
        'brand':       '#00C896',   // Figma teal primary — CTAs, active nav, logo
        'brand-hover': '#00A87E',   // Darker teal for hover states
        'brand-dark':  '#0D1B2A',   // Figma sidebar dark — premium feel
        'brand-gold':  '#D4A017',   // MVP gold — Egyptian cultural accent
        'brand-gold-hover': '#B8870B',
        'surface':     '#F5F4F0',   // Figma warm off-white — reduces eye strain

        // ── STATUS COLORS (all from Figma spec) ────────────────────
        status: {
          available:   '#06D6A0',   // Bright teal-green — capacity exists
          discharging: '#FFD166',   // Amber — becoming available ~30min
          occupied:    '#EF233C',   // Rich red — no capacity, do not route
          cleaning:    '#4CC9F0',   // Light blue — clinically standard
          reserved:    '#7B2FBE',   // Purple — committed, not yet occupied
          maintenance: '#8D99AE',   // Grey — temporarily out of service
        },

        // ── STATUS BACKGROUNDS (light tints for bed cards) ─────────
        'status-bg': {
          available:   '#F0FFF9',
          discharging: '#FFFDF0',
          occupied:    '#FFF5F5',
          cleaning:    '#F0FAFF',
          reserved:    '#F8F0FF',
          maintenance: '#F7F8FA',
        },

        // ── UI SURFACES (from Figma spec) ──────────────────────────
        'surface-raised':   '#F8F9FA',
        'surface-overlay':  '#F0F2F5',
        'border-default':   '#E4E8EE',
        'border-strong':    '#C9D0DA',

        // ── TEXT HIERARCHY ─────────────────────────────────────────
        'text-primary':   '#0D1B2A',
        'text-secondary': '#4A5568',
        'text-tertiary':  '#8896AB',

        // ── SEMANTIC ALERTS ────────────────────────────────────────
        'alert-critical': '#EF233C',
        'alert-warning':  '#FFD166',
        'alert-info':     '#00B4D8',
        'alert-success':  '#06D6A0',
      },

      fontFamily: {
        sans:   ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'sans-serif'],
        mono:   ['Roboto Mono', 'monospace'],  // ← for bed IDs + numbers
      },

      borderRadius: {
        card: '12px',
        btn:  '8px',
        pill: '9999px',
      },

      spacing: {
        'sidebar': '240px',  // fixed sidebar width
      },

      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1)',
        modal:   '0 24px 64px rgba(0,0,0,0.18)',
      },

      animation: {
        'pulse-brand': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },

      keyframes: {
        slideInRight: {
          '0%':   { transform: 'translateX(320px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}