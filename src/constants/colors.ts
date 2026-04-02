export const DOMAIN_COLORS: Record<string, { dot: string; text: string; bg: string; hex: string }> = {
  dashboard: { dot: 'bg-violet-400', text: 'text-violet-400', bg: 'bg-violet-500/10', hex: '#a78bfa' },
  vscode: { dot: 'bg-sky-400', text: 'text-sky-400', bg: 'bg-sky-500/10', hex: '#38bdf8' },
  backend: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', hex: '#34d399' },
  frontend: { dot: 'bg-violet-400', text: 'text-violet-400', bg: 'bg-violet-500/10', hex: '#a78bfa' },
  infrastructure: { dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-500/10', hex: '#fb923c' },
  design: { dot: 'bg-pink-400', text: 'text-pink-400', bg: 'bg-pink-500/10', hex: '#f472b6' },
  research: { dot: 'bg-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-500/10', hex: '#22d3ee' },
  qa: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10', hex: '#fbbf24' },
  management: { dot: 'bg-shazam-400', text: 'text-shazam-400', bg: 'bg-shazam-500/10', hex: '#8b5cf6' },
};

export const DEFAULT_DOMAIN_COLOR = { dot: 'bg-gray-500', text: 'text-gray-400', bg: 'bg-gray-500/10', hex: '#6b7280' };

export function getDomainColor(name: string | null | undefined) {
  if (!name) return DEFAULT_DOMAIN_COLOR;
  return DOMAIN_COLORS[name.toLowerCase()] ?? DEFAULT_DOMAIN_COLOR;
}
