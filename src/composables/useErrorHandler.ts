import { ref } from 'vue';
import { useToast } from './useToast';
import { normalizeError } from '@/api/utils';

/**
 * Shared composable for consistent API error handling.
 *
 * Provides a unified pattern: set a reactive error ref, show a toast,
 * and log to console — all in one call. Use `withErrorHandling` to wrap
 * async operations so callers don't need individual try/catch blocks.
 *
 * @param context - Label for console output (e.g. 'AgentsPage', 'useDashboard')
 */
export function useErrorHandler(context: string) {
  const toast = useToast();
  const error = ref<string | null>(null);

  /** Normalize, store, toast, and log an error in one call. */
  function handleError(err: unknown, fallback: string): string {
    const message = normalizeError(err, fallback);
    error.value = message;
    toast.error(message);
    console.error(`[${context}]`, err);
    return message;
  }

  function clearError() {
    error.value = null;
  }

  /**
   * Wrap an async operation with automatic error handling.
   * Clears any previous error, runs the operation, and catches failures.
   * Returns the result on success, or `null` on failure.
   */
  async function withErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string,
  ): Promise<T | null> {
    clearError();
    try {
      return await operation();
    } catch (err) {
      handleError(err, errorMessage);
      return null;
    }
  }

  return {
    error,
    handleError,
    clearError,
    withErrorHandling,
  };
}
