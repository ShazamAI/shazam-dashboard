import { ref, readonly, shallowReadonly, onUnmounted, type Ref, type DeepReadonly } from 'vue';
import { normalizeError } from '@/api/utils';

/** Standard timeout for initial page loads (ms) */
export const LOAD_TIMEOUT_MS = 8_000;

/** Standard debounce for event-driven refreshes (ms) */
export const REFRESH_DEBOUNCE_MS = 400;

/** Standard polling interval (ms) */
export const POLL_INTERVAL_MS = 10_000;

// ─── Types ───────────────────────────────────────────────

export interface AsyncState<T> {
  /** The loaded data (null until first successful load).
   *  Shallow readonly — the ref is read-only but T's internal properties remain mutable
   *  to avoid DeepReadonly conflicts with types that have mutable arrays/records. */
  data: Readonly<Ref<T | null>>;
  /** Whether the initial load is in progress */
  isLoading: DeepReadonly<Ref<boolean>>;
  /** Current error message, null when no error */
  error: DeepReadonly<Ref<string | null>>;
  /** Execute the async function (initial load or retry) */
  execute: () => Promise<void>;
  /** Silently refresh without touching isLoading */
  refresh: () => Promise<void>;
}

// ─── Composable ──────────────────────────────────────────

/**
 * Standardized async state management for page-level data loading.
 *
 * Handles: loading state, error capture, timeout guard, retry, silent refresh.
 *
 * @param fetcher — Async function that returns the data
 * @param options — Configuration overrides
 *
 * @example
 * ```ts
 * const { data: config, isLoading, error, execute } = useAsyncState(
 *   () => fetchConfig(),
 *   { fallbackError: 'Failed to load configuration' }
 * );
 * onMounted(execute);
 * ```
 *
 * @example With immediate + polling
 * ```ts
 * const { data, isLoading, error, refresh } = useAsyncState(
 *   () => fetchSessionPool(),
 *   { immediate: true, pollInterval: POLL_INTERVAL_MS }
 * );
 * ```
 */
export function useAsyncState<T>(
  fetcher: () => Promise<T>,
  options: {
    /** Error message when fetcher throws something that isn't an Error */
    fallbackError?: string;
    /** Timeout in ms before force-ending the loading state (default: 8000) */
    timeout?: number;
    /** Auto-execute on creation (default: false — call execute() in onMounted) */
    immediate?: boolean;
    /** Poll interval in ms. Set to enable automatic background refresh. */
    pollInterval?: number;
  } = {},
): AsyncState<T> {
  const {
    fallbackError = 'An unexpected error occurred',
    timeout = LOAD_TIMEOUT_MS,
    immediate = false,
    pollInterval,
  } = options;

  const data = ref<T | null>(null) as Ref<T | null>;
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function clearTimers() {
    if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; }
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  /** Full load — shows loading spinner, resets error, enforces timeout. */
  async function execute(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    // Safety timeout guard
    timeoutTimer = setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false;
        error.value = 'Loading timed out — backend may be unavailable';
      }
    }, timeout);

    try {
      data.value = await fetcher();
    } catch (err) {
      error.value = normalizeError(err, fallbackError);
    } finally {
      if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; }
      isLoading.value = false;
    }

    // Start polling after first execute (if configured)
    if (pollInterval && !pollTimer) {
      pollTimer = setInterval(() => refresh(), pollInterval);
    }
  }

  /** Silent refresh — does NOT touch isLoading or clear existing error on start.
   *  Only updates data on success; clears error on success. */
  async function refresh(): Promise<void> {
    try {
      data.value = await fetcher();
      error.value = null; // Clear any previous error on successful refresh
    } catch {
      // Silent failure — keep existing data and error state
    }
  }

  if (immediate) {
    // Schedule execution after current microtask (same as onMounted timing)
    void execute();
  }

  onUnmounted(clearTimers);

  return {
    data: shallowReadonly(data) as Readonly<Ref<T | null>>,
    isLoading: readonly(isLoading),
    error: readonly(error),
    execute,
    refresh,
  };
}

// ─── Debounce helper ─────────────────────────────────────

/**
 * Creates a debounced version of a refresh function.
 * Prevents rapid re-fetches when multiple WebSocket events arrive at once.
 *
 * @returns [debouncedFn, cleanup] — call cleanup in onUnmounted
 *
 * @example
 * ```ts
 * const [debouncedRefresh, cleanupDebounce] = useDebouncedRefresh(
 *   () => refreshTasks(),
 * );
 * ws.on('task_completed', debouncedRefresh);
 * onUnmounted(cleanupDebounce);
 * ```
 */
export function useDebouncedRefresh(
  fn: () => Promise<void>,
  delay: number = REFRESH_DEBOUNCE_MS,
): [() => void, () => void] {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  function debounced() {
    if (timer) clearTimeout(timer);
    if (running) return;

    timer = setTimeout(async () => {
      running = true;
      try {
        await fn();
      } finally {
        running = false;
      }
    }, delay);
  }

  function cleanup() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  return [debounced, cleanup];
}
