/**
 * Format an ISO date string to a short readable format.
 * Returns '\u2014' for null/undefined/invalid values.
 */
export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '\u2014';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '\u2014';
  }
}

/**
 * Format an ISO date string as a human-readable relative time (e.g. "just now", "5m ago", "3h ago").
 * Falls back to formatRelativeDate for dates older than 24 hours.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '\u2014';
    const diff = Date.now() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return formatRelativeDate(iso);
  } catch {
    return '\u2014';
  }
}

/**
 * Format a result value into a displayable string.
 * Handles null, error tuples, binary data markers, and objects.
 */
export function formatResult(result: string | null | undefined): string {
  if (result === null || result === undefined) return '';
  if (typeof result === 'string') {
    // Check for error tuple pattern like {:error, "message"}
    const errorMatch = result.match(/^\{:error,\s*"(.+)"\}$/);
    if (errorMatch) return `Error: ${errorMatch[1]}`;
    // Check for binary/non-printable content markers
    if (result.startsWith('<<') && result.endsWith('>>')) return '[binary data]';
    return result;
  }
  return String(result);
}

/**
 * Format an ISO date string with year included.
 */
export function formatFullDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '\u2014';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '\u2014';
  }
}

/**
 * Format an ISO timestamp to HH:MM:SS (24h).
 */
export function formatTimelineTime(ts: string): string {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '--:--';
  }
}

/**
 * Return Tailwind classes for a plan status badge.
 */
export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'draft': return 'bg-gray-700 text-gray-300';
    case 'active': return 'bg-green-500/20 text-green-400';
    case 'completed': return 'bg-blue-500/20 text-blue-400';
    default: return 'bg-gray-700 text-gray-400';
  }
}

/**
 * Format seconds into a human-readable uptime string (e.g. "3h 12m").
 */
export function formatUptime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
