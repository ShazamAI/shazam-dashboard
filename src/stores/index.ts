/**
 * Pinia Store Index
 *
 * Re-exports all domain stores for convenient imports.
 *
 * Usage:
 *   import { useTaskStore } from '@/stores';
 *   const taskStore = useTaskStore();
 */

export { useTaskStore } from './tasks';
export { useAgentStore } from './agents';
export { useEventStore } from './events';
export { useMetricsStore } from './metrics';
