import { ref, computed } from 'vue';
import { get, post } from '@/api/http';
import { normalizeError } from '@/api/utils';
import { formatUptime } from '@/utils/formatters';

export interface HealthData {
  memory_mb: number;
  uptime_seconds: number;
  active_sessions: number;
  circuit_breaker_tripped: boolean;
}

/**
 * Composable for system health indicators.
 * Handles fetching health data, formatting, and circuit breaker actions.
 */
export function useHealth() {
  const health = ref<HealthData | null>(null);
  const healthLoading = ref(true);
  const healthError = ref<string | null>(null);

  const formattedUptime = computed(() => {
    if (!health.value) return '--';
    return formatUptime(health.value.uptime_seconds);
  });

  async function fetchHealth() {
    try {
      const data = await get<Record<string, unknown>>('/health');
      if (!data || typeof data !== 'object') {
        healthError.value = 'Invalid health data received';
        health.value = null;
        return;
      }
      healthError.value = null;
      health.value = {
        memory_mb: typeof data.memory_mb === 'number' ? data.memory_mb : 0,
        uptime_seconds: typeof data.uptime_seconds === 'number' ? data.uptime_seconds : 0,
        active_sessions: typeof data.active_sessions === 'number'
          ? data.active_sessions
          : (data.sessions && typeof data.sessions === 'object' ? Object.keys(data.sessions as object).length : 0),
        circuit_breaker_tripped: typeof data.circuit_breaker_tripped === 'boolean' ? data.circuit_breaker_tripped : false,
      };
    } catch (err) {
      healthError.value = normalizeError(err, 'Failed to fetch health');
      console.warn('[useHealth] fetchHealth failed:', err);
      health.value = null;
    } finally {
      healthLoading.value = false;
    }
  }

  async function resetCircuitBreaker() {
    try {
      await post('/ralph-loop/reset-circuit-breaker', {});
      if (health.value) health.value.circuit_breaker_tripped = false;
    } catch (err) {
      console.warn('[useHealth] resetCircuitBreaker failed:', err);
    }
  }

  return {
    health,
    healthLoading,
    healthError,
    formattedUptime,
    fetchHealth,
    resetCircuitBreaker,
  };
}
