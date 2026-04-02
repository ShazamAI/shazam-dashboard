/**
 * Runtime API response validation helpers.
 *
 * These log warnings when backend responses don't match expected shapes,
 * enabling early detection of contract changes. They never throw —
 * instead they return safe fallback values (graceful degradation).
 */

export function validateArray<T>(data: unknown, context: string): T[] {
  if (!Array.isArray(data)) {
    console.warn(`[API] Expected array for ${context}, got ${typeof data}`);
    return [];
  }
  return data as T[];
}

export function validateObject<T>(data: unknown, context: string): T | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.warn(`[API] Expected object for ${context}, got ${typeof data}`);
    return null;
  }
  return data as T;
}

export function validateString(data: unknown, field: string, fallback = ''): string {
  if (typeof data !== 'string') {
    if (data !== null && data !== undefined) {
      console.warn(`[API] Expected string for ${field}, got ${typeof data}`);
    }
    return fallback;
  }
  return data;
}

export function validateNumber(data: unknown, field: string, fallback = 0): number {
  if (typeof data !== 'number' || isNaN(data)) {
    if (data !== null && data !== undefined) {
      console.warn(`[API] Expected number for ${field}, got ${typeof data}`);
    }
    return fallback;
  }
  return data;
}

/** Validate task status against known values */
const VALID_TASK_STATUSES = new Set([
  'pending', 'in_progress', 'completed', 'failed', 'awaiting_approval', 'paused',
]);

export function validateTaskStatus(status: unknown): string {
  if (typeof status === 'string' && VALID_TASK_STATUSES.has(status)) {
    return status;
  }
  console.warn(`[API] Unknown task status: "${status}", defaulting to "pending"`);
  return 'pending';
}

/** Validate agent status against known values */
const VALID_AGENT_STATUSES = new Set([
  'idle', 'busy', 'working', 'executing', 'waiting', 'paused', 'error', 'offline',
]);

export function validateAgentStatus(status: unknown): string {
  if (typeof status === 'string') {
    const lower = status.toLowerCase().trim();
    if (VALID_AGENT_STATUSES.has(lower)) return lower;
  }
  return 'idle';
}
