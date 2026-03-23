/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ─── Colors ────────────────────────────────────────────
      colors: {
        // Shazam.dev brand palette — golden-amber, anchored on #ffca1d
        shazam: {
          50: '#fffbeb',
          100: '#fff3c4',
          200: '#ffe588',
          300: '#ffd54f',
          400: '#ffca1d',
          500: '#f5b800',
          600: '#d99e00',
          700: '#b37d00',
          800: '#8c6200',
          900: '#6b4a00',
        },
        // Dark theme surfaces — layered elevation system
        surface: {
          DEFAULT: '#0a0a0f',
          card: '#12121a',
          'card-hover': '#1a1a24',
          raised: '#1e1e2a',
          overlay: '#24243a',
        },
        // Domain accent colors — workspace identification
        domain: {
          dashboard: '#8b5cf6',  // violet-500
          vscode: '#0ea5e9',     // sky-500
          backend: '#10b981',    // emerald-500
          frontend: '#8b5cf6',   // violet-500
          infrastructure: '#f97316', // orange-500
          design: '#ec4899',     // pink-500
          research: '#06b6d4',   // cyan-500
          qa: '#f59e0b',         // amber-500
          management: '#ffca1d', // shazam-400
        },
      },

      // ─── Typography ────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],  // 10px
      },
      letterSpacing: {
        'widest-plus': '0.15em',
      },

      // ─── Spacing ───────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',  // 18px — between 4 (16px) and 5 (20px)
        '13': '3.25rem',    // 52px
        '15': '3.75rem',    // 60px
        '18': '4.5rem',     // 72px — sidebar width compact
        '68': '17rem',      // 272px — sidebar width expanded
        '76': '19rem',      // 304px
        '84': '21rem',      // 336px
        '88': '22rem',      // 352px
      },

      // ─── Border Radius ────────────────────────────────────
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      // ─── Box Shadows — Elevation system ────────────────────
      boxShadow: {
        // Elevation levels
        'elevation-1': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'elevation-2': '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)',
        'elevation-3': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.3)',
        'elevation-4': '0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.4)',
        // Brand glow effects
        'glow-sm': '0 0 10px rgba(255,202,29,0.15)',
        'glow-md': '0 0 20px rgba(255,202,29,0.2), 0 0 40px rgba(255,202,29,0.1)',
        'glow-lg': '0 0 30px rgba(255,202,29,0.25), 0 0 60px rgba(255,202,29,0.15)',
        'glow-xl': '0 0 40px rgba(255,202,29,0.3), 0 0 80px rgba(255,202,29,0.2), 0 0 120px rgba(255,202,29,0.1)',
        // Status glows
        'glow-success': '0 0 15px rgba(16,185,129,0.3)',
        'glow-warning': '0 0 15px rgba(245,158,11,0.3)',
        'glow-error': '0 0 15px rgba(239,68,68,0.3)',
        'glow-info': '0 0 15px rgba(59,130,246,0.3)',
        'glow-purple': '0 0 15px rgba(168,85,247,0.3)',
        'glow-cyan': '0 0 15px rgba(6,182,212,0.3)',
        // Card shadows
        'card': '0 0 0 1px rgba(39,39,42,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        'card-hover': '0 0 0 1px rgba(63,63,70,0.5), 0 8px 25px rgba(0,0,0,0.4), 0 0 15px rgba(255,202,29,0.05)',
        // Inner glow for active elements
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05)',
        'inner-glow-brand': 'inset 0 1px 0 rgba(255,202,29,0.1)',
      },

      // ─── Animations — Named keyframe animations ───────────
      animation: {
        // Entrance animations
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in-down': 'fade-in-down 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in-left': 'fade-in-left 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in-right': 'fade-in-right 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-bottom': 'slide-in-bottom 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        // Exit animations
        'fade-out': 'fade-out 0.2s ease-in',
        'scale-out': 'scale-out 0.2s ease-in',
        // Micro-interactions
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-soft': 'pulse-soft 3s infinite ease-in-out',
        'pulse-ring': 'pulse-ring 1.5s infinite ease-out',
        'float': 'float 6s infinite ease-in-out',
        'glow-pulse': 'glow-pulse 2s infinite ease-in-out',
        'spin-slow': 'spin 3s linear infinite',
        // Data-specific
        'progress-fill': 'progress-fill 1s cubic-bezier(0.22, 1, 0.36, 1)',
        'count-up': 'count-up 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        'bar-grow': 'bar-grow 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
        // Stagger-ready (use animation-delay with these)
        'stagger-fade-in': 'fade-in-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards',
      },
      keyframes: {
        // Entrance
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in-right': {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-bottom': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Exit
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'scale-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        // Micro-interactions
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(255,202,29,0.15)' },
          '50%': { boxShadow: '0 0 25px rgba(255,202,29,0.3), 0 0 50px rgba(255,202,29,0.15)' },
        },
        // Data
        'progress-fill': {
          '0%': { width: '0%' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'bar-grow': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },

      // ─── Transitions ──────────────────────────────────────
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'bounce-out': 'cubic-bezier(0.55, 0, 1, 0.45)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // ─── Backdrop Blur ─────────────────────────────────────
      backdropBlur: {
        xs: '2px',
      },

      // ─── Background Image (Gradients) ─────────────────────
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #ffca1d, #f59e0b)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(255,202,29,0.15), rgba(245,158,11,0.1))',
        'surface-gradient': 'linear-gradient(180deg, #12121a, #0a0a0f)',
        'hero-glow': 'radial-gradient(circle at 50% 0%, rgba(255,202,29,0.12) 0%, transparent 60%)',
        'dot-grid': 'radial-gradient(circle at 1px 1px, #27272a 1px, transparent 0)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
      },
      backgroundSize: {
        'dot-grid': '24px 24px',
        'dot-grid-lg': '32px 32px',
      },
    },
  },
  plugins: [],
};
