import { ref, readonly } from 'vue';

const LOG_PREFIX = '[useApi]';

export function useApi<T>(fetcher: () => Promise<T>) {
  const data = ref<T | null>(null) as { value: T | null };
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function execute(): Promise<T | null> {
    console.log(`%c${LOG_PREFIX} execute() — isLoading: false → true`, 'color: #fb923c; font-weight: bold');
    isLoading.value = true;
    error.value = null;
    try {
      const result = await fetcher();
      console.log(`%c${LOG_PREFIX} execute() SUCCESS — data received`, 'color: #fb923c; font-weight: bold', {
        resultType: typeof result,
        isArray: Array.isArray(result),
        length: Array.isArray(result) ? result.length : undefined,
      });
      data.value = result;
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error(`${LOG_PREFIX} execute() FAILED —`, error.value);
      return null;
    } finally {
      console.log(`%c${LOG_PREFIX} execute() — isLoading: true → false`, 'color: #fb923c; font-weight: bold');
      isLoading.value = false;
    }
  }

  return {
    data: readonly(data),
    isLoading: readonly(isLoading),
    error: readonly(error),
    execute,
  };
}
