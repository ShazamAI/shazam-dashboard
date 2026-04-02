import type { ShazamEvent } from '@/types';

/** Safely extract event data as a record */
export function getEventData(event: ShazamEvent): Record<string, unknown> {
  if (!event.data || typeof event.data !== 'object') return {};
  return event.data as Record<string, unknown>;
}

/** Get a string field from event data with fallback */
export function getDataString(event: ShazamEvent, key: string, fallback = ''): string {
  const data = getEventData(event);
  const val = data[key];
  return typeof val === 'string' ? val : fallback;
}

/** Get a number field from event data with fallback */
export function getDataNumber(event: ShazamEvent, key: string, fallback = 0): number {
  const data = getEventData(event);
  const val = data[key];
  return typeof val === 'number' ? val : fallback;
}

/** Get raw event data as string or record, handling both formats */
export function getEventDataOrString(event: ShazamEvent): Record<string, unknown> | string | null {
  if (typeof event.data === 'string') return event.data;
  if (event.data && typeof event.data === 'object') return event.data as Record<string, unknown>;
  return null;
}

/** Check if event data is a record (not null, not array, is object) */
export function isRecord(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/** Check if event is agent text delta */
export function isTextDelta(event: ShazamEvent): boolean {
  return event.type === 'agent_text_delta';
}

/** Check if event is task status change */
export function isTaskEvent(event: ShazamEvent): boolean {
  return ['task_status_change', 'task_created', 'task_completed', 'task_started', 'task_failed'].includes(event.type);
}

/** Check if event is tool use */
export function isToolEvent(event: ShazamEvent): boolean {
  return event.type === 'tool_use' || event.type === 'tool_result';
}

/** Check if event is circuit breaker */
export function isCircuitBreakerEvent(event: ShazamEvent): boolean {
  return event.type === 'circuit_breaker_tripped' || event.type === 'circuit_breaker_reset';
}
