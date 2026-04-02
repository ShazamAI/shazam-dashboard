/**
 * Standardized debounce intervals for WebSocket-driven data refreshes.
 *
 * Only useRealtimeSync should listen to WS events for global data refreshes.
 * Page-specific composables should NOT independently listen to WS for the
 * same data — they react to the reactive state that useRealtimeSync updates.
 */
export const DEBOUNCE = {
  /** Task data refresh after WS event (ms) */
  TASK_REFRESH: 500,
  /** Agent data refresh after WS event (ms) */
  AGENT_REFRESH: 1000,
  /** Metrics refresh — less urgent (ms) */
  METRICS_REFRESH: 2000,
} as const;
