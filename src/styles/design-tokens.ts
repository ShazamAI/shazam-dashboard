/**
 * Shazam.dev Design Tokens v2.0
 *
 * Comprehensive design system for a billion-dollar startup aesthetic.
 * Dark-first, gold-amber brand, premium micro-interactions.
 *
 * Usage: Import tokens for programmatic access. For Tailwind utilities,
 * see tailwind.config.js which mirrors these values.
 *
 * Font: Inter (body) / JetBrains Mono (code)
 */

// ═════════════════════════════════════════════════════════
// 1. BRAND IDENTITY
// ═════════════════════════════════════════════════════════

export const brand = {
  /** Primary brand gold — hero borders, hover accents, focus rings */
  primary: '#ffca1d',
  /** Lighter variant — badges, link hover, accent highlights */
  primaryLight: '#ffd60a',
  /** Amber/secondary — gradient endpoints, button gradients */
  amber: '#f59e0b',
} as const;

/** Brand gradient — buttons, logo text, step numbers, timeline */
export const brandGradient = 'linear-gradient(135deg, #ffca1d, #f59e0b)';

/** Soft brand gradient — card backgrounds, subtle accents */
export const brandGradientSoft = 'linear-gradient(135deg, rgba(255,202,29,0.15), rgba(245,158,11,0.1))';

// ═════════════════════════════════════════════════════════
// 2. COLOR SCALES
// ═════════════════════════════════════════════════════════

/** Shazam gold scale — bg-shazam-{step}, text-shazam-{step} */
export const shazam = {
  50: '#fffbeb',
  100: '#fff3c4',
  200: '#ffe588',
  300: '#ffd54f',
  400: '#ffca1d',   // ← PRIMARY
  500: '#f5b800',
  600: '#d99e00',
  700: '#b37d00',
  800: '#8c6200',
  900: '#6b4a00',
} as const;

// ═════════════════════════════════════════════════════════
// 3. SURFACE SYSTEM — Layered elevation
// ═════════════════════════════════════════════════════════

export const surface = {
  /** Page body, base layer */
  DEFAULT: '#0a0a0f',
  /** Cards, panels — elevation 1 */
  card: '#12121a',
  /** Card hover, dropdowns — elevation 2 */
  cardHover: '#1a1a24',
  /** Modals, popovers — elevation 3 */
  raised: '#1e1e2a',
  /** Floating overlays — elevation 4 */
  overlay: '#24243a',
} as const;

// ═════════════════════════════════════════════════════════
// 4. NEUTRAL SCALE — Text hierarchy, borders
// ═════════════════════════════════════════════════════════

export const zinc = {
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',   // Primary body text
  500: '#71717a',   // Subdued labels
  600: '#52525b',   // Muted text
  700: '#3f3f46',   // Borders (subtle), input borders
  800: '#27272a',   // Borders (default), dividers
  900: '#18181b',   // Deep backgrounds
  950: '#09090b',   // Near-black
} as const;

// ═════════════════════════════════════════════════════════
// 5. SEMANTIC COLORS — Status, alerts, actions
// ═════════════════════════════════════════════════════════

export const semantic = {
  success: {
    light: '#4ade80',
    DEFAULT: '#10b981',
    dark: '#34d399',
  },
  warning: {
    light: '#fbbf24',
    DEFAULT: '#f59e0b',
    dark: '#eab308',
  },
  error: {
    light: '#f87171',
    DEFAULT: '#ef4444',
    dark: '#dc2626',
  },
  info: {
    light: '#60a5fa',
    DEFAULT: '#3b82f6',
  },
  purple: {
    light: '#c084fc',
    DEFAULT: '#a855f7',
  },
  cyan: {
    light: '#22d3ee',
    DEFAULT: '#06b6d4',
  },
} as const;

// ═════════════════════════════════════════════════════════
// 6. DOMAIN COLORS — Workspace/team identification
// ═════════════════════════════════════════════════════════

export const domainColors = {
  dashboard:      { base: '#8b5cf6', light: '#a78bfa', faint: 'rgba(139,92,246,0.1)' },
  vscode:         { base: '#0ea5e9', light: '#38bdf8', faint: 'rgba(14,165,233,0.1)' },
  backend:        { base: '#10b981', light: '#34d399', faint: 'rgba(16,185,129,0.1)' },
  frontend:       { base: '#8b5cf6', light: '#a78bfa', faint: 'rgba(139,92,246,0.1)' },
  infrastructure: { base: '#f97316', light: '#fb923c', faint: 'rgba(249,115,22,0.1)' },
  design:         { base: '#ec4899', light: '#f472b6', faint: 'rgba(236,72,153,0.1)' },
  research:       { base: '#06b6d4', light: '#22d3ee', faint: 'rgba(6,182,212,0.1)' },
  qa:             { base: '#f59e0b', light: '#fbbf24', faint: 'rgba(245,158,11,0.1)' },
  management:     { base: '#ffca1d', light: '#ffd54f', faint: 'rgba(255,202,29,0.1)' },
} as const;

// ═════════════════════════════════════════════════════════
// 7. ALPHA VARIANTS — Semi-transparent overlays
// ═════════════════════════════════════════════════════════

export const alpha = {
  primary: {
    5: '#ffca1d0d',
    10: '#ffca1d1a',
    12: '#ffca1d1f',
    20: '#ffca1d33',
    30: '#ffca1d4d',
    40: '#ffca1d66',
  },
  zinc800: {
    30: '#27272a4d',
    50: '#27272a80',
    60: '#27272a99',
    80: '#27272acc',
  },
  black: {
    10: '#0000001a',
    25: '#00000040',
    50: '#00000080',
    60: '#00000099',
    80: '#000000cc',
  },
} as const;

// ═════════════════════════════════════════════════════════
// 8. ELEVATION SYSTEM — Shadow + blur combinations
// ═════════════════════════════════════════════════════════

export const elevation = {
  /** Flat elements, no shadow */
  0: 'none',
  /** Subtle lift — cards at rest */
  1: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
  /** Moderate — cards on hover */
  2: '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)',
  /** High — dropdowns, popovers */
  3: '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.3)',
  /** Highest — modals, dialogs */
  4: '0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.4)',
} as const;

// ═════════════════════════════════════════════════════════
// 9. MOTION SYSTEM — Timing, easing, duration
// ═════════════════════════════════════════════════════════

export const motion = {
  /** Easing functions */
  easing: {
    /** Standard ease for most transitions */
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** Entrance — decelerate into position */
    enter: 'cubic-bezier(0.22, 1, 0.36, 1)',
    /** Exit — accelerate out */
    exit: 'cubic-bezier(0.55, 0, 1, 0.45)',
    /** Overshoot — playful, bouncy feel */
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  /** Duration scale */
  duration: {
    /** Instant feedback — color changes, opacity */
    instant: '100ms',
    /** Fast — hover states, toggles */
    fast: '150ms',
    /** Normal — most transitions */
    normal: '250ms',
    /** Moderate — expand/collapse, slide */
    moderate: '350ms',
    /** Slow — page transitions, complex animations */
    slow: '500ms',
    /** Very slow — hero animations, onboarding */
    verySlow: '800ms',
  },

  /** Stagger delay between sequential items */
  stagger: {
    fast: '30ms',
    normal: '50ms',
    slow: '80ms',
  },
} as const;

// ═════════════════════════════════════════════════════════
// 10. TYPOGRAPHY SCALE
// ═════════════════════════════════════════════════════════

export const typography = {
  /** Font families */
  family: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, Fira Code, SF Mono, Menlo, monospace',
  },
  /** Font sizes with line heights */
  size: {
    '2xs': { size: '0.625rem', lineHeight: '0.875rem' },   // 10px
    xs:    { size: '0.75rem',  lineHeight: '1rem' },         // 12px
    sm:    { size: '0.875rem', lineHeight: '1.25rem' },      // 14px
    base:  { size: '1rem',     lineHeight: '1.5rem' },       // 16px
    lg:    { size: '1.125rem', lineHeight: '1.75rem' },      // 18px
    xl:    { size: '1.25rem',  lineHeight: '1.75rem' },      // 20px
    '2xl': { size: '1.5rem',   lineHeight: '2rem' },         // 24px
    '3xl': { size: '1.875rem', lineHeight: '2.25rem' },      // 30px
  },
  /** Font weights */
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  /** Letter spacing */
  tracking: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ═════════════════════════════════════════════════════════
// 11. SPACING SCALE
// ═════════════════════════════════════════════════════════

export const spacing = {
  /** Component internal padding */
  component: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
  },
  /** Section spacing */
  section: {
    sm: '1rem',       // 16px
    md: '1.5rem',     // 24px
    lg: '2rem',       // 32px
    xl: '3rem',       // 48px
  },
  /** Card padding (responsive) */
  card: {
    mobile: '0.75rem',
    tablet: '1rem',
    desktop: '1.5rem',
  },
} as const;

// ═════════════════════════════════════════════════════════
// 12. BORDER RADIUS SCALE
// ═════════════════════════════════════════════════════════

export const radius = {
  none: '0',
  sm: '0.25rem',     // 4px — tags, small elements
  md: '0.5rem',      // 8px — inputs, buttons
  lg: '0.75rem',     // 12px — cards, panels
  xl: '1rem',        // 16px — modal, large cards
  '2xl': '1.5rem',   // 24px — hero cards
  full: '9999px',    // pills, dots
} as const;

// ═════════════════════════════════════════════════════════
// 13. COMPONENT COLOR MAP — Quick implementation reference
// ═════════════════════════════════════════════════════════

/**
 * LAYOUT
 *   Page background:        bg-surface (#0a0a0f)
 *   Sidebar:                bg-gray-900
 *   Header:                 bg-gray-900/85 + backdrop-blur-xl
 *   Card:                   bg-surface-card + border-gray-800
 *   Card hover:             bg-surface-card-hover + shadow-card-hover
 *   Modal backdrop:         bg-black/60 + backdrop-blur-sm
 *
 * NAVIGATION
 *   Default:                text-gray-400
 *   Hover:                  text-gray-100 + bg-gray-800
 *   Active:                 text-shazam-400 + bg-shazam-700/20
 *   Logo:                   bg-shazam-500 + text-gray-950
 *
 * BUTTONS
 *   Primary:                bg-shazam-500 → hover: bg-shazam-400 + shadow-glow-sm
 *   Secondary:              border-gray-700 → hover: bg-gray-800
 *   Danger:                 bg-red-600/20 → hover: bg-red-600/30
 *   Ghost:                  transparent → hover: bg-gray-800
 *   Success:                bg-emerald-600/20 → hover: bg-emerald-600/30
 *
 * FORMS
 *   Input:                  bg-gray-800 + border-gray-700
 *   Focus:                  border-shazam-500 + ring-1 ring-shazam-500
 *   Placeholder:            text-gray-500
 *
 * TEXT HIERARCHY
 *   Display (h1):           text-white + font-bold + tracking-tight
 *   Title (h2):             text-white + font-bold
 *   Subtitle:               text-gray-400
 *   Body:                   text-gray-400
 *   Label:                  text-gray-500 + uppercase + tracking-wider + text-2xs
 *   Caption:                text-gray-600
 *   Link:                   text-shazam-400 → hover: text-shazam-300
 *
 * STATUS (Agent)
 *   Idle:       dot=emerald-400     badge=emerald-500/10  glow=glow-success
 *   Working:    dot=amber-400(p)    badge=amber-500/10    glow=glow-warning
 *   Executing:  dot=cyan-400(p)     badge=cyan-500/10     glow=glow-cyan
 *   Waiting:    dot=yellow-400(p)   badge=yellow-500/10   glow=glow-warning
 *   Paused:     dot=gray-500        badge=gray-500/10
 *   Error:      dot=red-500(p)      badge=red-500/10      glow=glow-error
 *   Offline:    dot=gray-600        badge=gray-800/50
 *
 * STATUS (Task)
 *   Pending:    text=yellow-400   bg=yellow-500/10
 *   InProgress: text=blue-400     bg=blue-500/10
 *   Completed:  text=emerald-400  bg=emerald-500/10
 *   Failed:     text=red-400      bg=red-500/10
 *   Awaiting:   text=purple-400   bg=purple-500/10
 *   Paused:     text=gray-400     bg=gray-500/10
 *
 * SPECIAL EFFECTS
 *   Hero glow:       bg-hero-glow
 *   Dot grid:        bg-dot-grid bg-dot-grid (size)
 *   Glass card:      bg-glass + backdrop-blur-xl + border-white/5
 *   Brand gradient:  bg-brand-gradient
 *   Shimmer:         animate-shimmer + bg-[length:200%] bg-gradient
 */
