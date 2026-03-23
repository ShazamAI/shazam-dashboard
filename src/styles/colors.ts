/**
 * Shazam Design System — Centralized Color Utilities
 *
 * Single source of truth for all status and domain color mappings.
 * Import these in components instead of defining ad-hoc color maps.
 *
 * Pattern: background uses /10 opacity, text uses -400 shade, border uses /20 opacity.
 * Active states use animate-pulse on the dot indicator.
 */

import type { AgentStatus, TaskStatus } from '@/types';

// ═══════════════════════════════════════════════════════════
// AGENT STATUS COLORS
// ═══════════════════════════════════════════════════════════

export interface StatusColorConfig {
  /** Tailwind class for the status dot indicator */
  dot: string;
  /** Tailwind classes for a badge (bg + text + border) */
  badge: string;
  /** Human-readable label */
  label: string;
  /** Tailwind class for text-only usage */
  text: string;
}

const AGENT_STATUS_COLORS: Record<AgentStatus, StatusColorConfig> = {
  idle: {
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    label: 'Idle',
    text: 'text-emerald-400',
  },
  busy: {
    dot: 'bg-amber-400 animate-pulse',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    label: 'Working',
    text: 'text-amber-400',
  },
  working: {
    dot: 'bg-amber-400 animate-pulse',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    label: 'Working',
    text: 'text-amber-400',
  },
  executing: {
    dot: 'bg-cyan-400 animate-pulse',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    label: 'Executing',
    text: 'text-cyan-400',
  },
  waiting: {
    dot: 'bg-yellow-400 animate-pulse',
    badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    label: 'Waiting',
    text: 'text-yellow-400',
  },
  paused: {
    dot: 'bg-gray-500',
    badge: 'bg-gray-500/10 text-gray-500 border-gray-600/20',
    label: 'Paused',
    text: 'text-gray-500',
  },
  error: {
    dot: 'bg-red-500 animate-pulse',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    label: 'Error',
    text: 'text-red-400',
  },
  offline: {
    dot: 'bg-gray-600',
    badge: 'bg-gray-800/50 text-gray-600 border-gray-700/20',
    label: 'Offline',
    text: 'text-gray-600',
  },
};

const FALLBACK_STATUS: StatusColorConfig = {
  dot: 'bg-gray-500',
  badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  label: 'Unknown',
  text: 'text-gray-400',
};

/** Get status color config for any agent status string */
export function getAgentStatusColor(status: string): StatusColorConfig {
  return AGENT_STATUS_COLORS[status as AgentStatus] ?? FALLBACK_STATUS;
}

// ═══════════════════════════════════════════════════════════
// TASK STATUS COLORS
// ═══════════════════════════════════════════════════════════

const TASK_STATUS_COLORS: Record<TaskStatus, StatusColorConfig> = {
  pending: {
    dot: 'bg-yellow-400',
    badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    label: 'Pending',
    text: 'text-yellow-400',
  },
  in_progress: {
    dot: 'bg-blue-400 animate-pulse',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    label: 'In Progress',
    text: 'text-blue-400',
  },
  completed: {
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    label: 'Completed',
    text: 'text-emerald-400',
  },
  failed: {
    dot: 'bg-red-500',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    label: 'Failed',
    text: 'text-red-400',
  },
  awaiting_approval: {
    dot: 'bg-purple-400',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    label: 'Awaiting Approval',
    text: 'text-purple-400',
  },
  paused: {
    dot: 'bg-gray-500',
    badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    label: 'Paused',
    text: 'text-gray-400',
  },
};

/** Get status color config for any task status string */
export function getTaskStatusColor(status: string): StatusColorConfig {
  return TASK_STATUS_COLORS[status as TaskStatus] ?? FALLBACK_STATUS;
}

// ═══════════════════════════════════════════════════════════
// DOMAIN / WORKSPACE COLORS
// ═══════════════════════════════════════════════════════════

export interface DomainColorConfig {
  /** Left border accent */
  border: string;
  /** Background tint (10% opacity) */
  bg: string;
  /** Text color */
  text: string;
  /** Dot indicator */
  dot: string;
  /** Glow shadow for hover */
  glow: string;
}

const DOMAIN_COLORS: Record<string, DomainColorConfig> = {
  dashboard:      { border: 'border-l-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400', glow: 'shadow-violet-500/20' },
  frontend:       { border: 'border-l-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400', glow: 'shadow-violet-500/20' },
  vscode:         { border: 'border-l-sky-500',    bg: 'bg-sky-500/10',    text: 'text-sky-400',    dot: 'bg-sky-400',    glow: 'shadow-sky-500/20' },
  backend:        { border: 'border-l-emerald-500',bg: 'bg-emerald-500/10',text: 'text-emerald-400',dot: 'bg-emerald-400',glow: 'shadow-emerald-500/20' },
  infrastructure: { border: 'border-l-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400', glow: 'shadow-orange-500/20' },
  design:         { border: 'border-l-pink-500',   bg: 'bg-pink-500/10',   text: 'text-pink-400',   dot: 'bg-pink-400',   glow: 'shadow-pink-500/20' },
  research:       { border: 'border-l-cyan-500',   bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   dot: 'bg-cyan-400',   glow: 'shadow-cyan-500/20' },
  qa:             { border: 'border-l-amber-500',  bg: 'bg-amber-500/10',  text: 'text-amber-400',  dot: 'bg-amber-400',  glow: 'shadow-amber-500/20' },
  management:     { border: 'border-l-shazam-500', bg: 'bg-shazam-500/10', text: 'text-shazam-400', dot: 'bg-shazam-400', glow: 'shadow-shazam-500/20' },
};

const FALLBACK_DOMAIN: DomainColorConfig = {
  border: 'border-l-gray-600',
  bg: 'bg-gray-500/10',
  text: 'text-gray-400',
  dot: 'bg-gray-500',
  glow: 'shadow-gray-500/10',
};

/** Get domain color config for a workspace/domain name */
export function getDomainColor(domain: string | null | undefined): DomainColorConfig {
  if (!domain) return FALLBACK_DOMAIN;
  return DOMAIN_COLORS[domain.toLowerCase().trim()] ?? FALLBACK_DOMAIN;
}

/** Get workspace tab color classes (bg + text) */
export function getWorkspaceTabColor(workspace: string): string {
  const config = getDomainColor(workspace);
  return `${config.bg} ${config.text}`;
}

// ═══════════════════════════════════════════════════════════
// EVENT TYPE COLORS
// ═══════════════════════════════════════════════════════════

/** Get badge class for event feed items */
export function getEventBadgeColor(type: string): string {
  switch (type) {
    case 'agent_text_delta':
    case 'agent_text_complete':
    case 'agent_output':
      return 'bg-shazam-500/10 text-shazam-400';
    case 'tool_use':
    case 'tool_result':
      return 'bg-amber-500/10 text-amber-400';
    case 'task_status_change':
    case 'task_started':
    case 'task_created':
    case 'task_completed':
    case 'circuit_breaker_reset':
      return 'bg-emerald-500/10 text-emerald-400';
    case 'task_failed':
    case 'circuit_breaker_tripped':
      return 'bg-red-500/10 text-red-400';
    case 'agent_status_change':
      return 'bg-cyan-500/10 text-cyan-400';
    case 'metrics_update':
      return 'bg-purple-500/10 text-purple-400';
    case 'system':
    default:
      return 'bg-gray-500/10 text-gray-400';
  }
}

// ═══════════════════════════════════════════════════════════
// CONNECTION STATUS
// ═══════════════════════════════════════════════════════════

/** Connection indicator classes */
export const CONNECTION_COLORS = {
  connected: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'Connected',
  },
  disconnected: {
    dot: 'bg-red-500 animate-pulse',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    label: 'Reconnecting...',
  },
} as const;

// ═══════════════════════════════════════════════════════════
// BUDGET BAR COLORS
// ═══════════════════════════════════════════════════════════

/** Budget usage bar fill color based on percentage */
export function getBudgetBarColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

/** Budget usage text color based on percentage */
export function getBudgetTextColor(pct: number): string {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 70) return 'text-amber-400';
  return 'text-gray-400';
}
