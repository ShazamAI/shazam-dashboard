// Detect Tauri environment
const isTauri = typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
const BASE_URL = isTauri ? 'http://127.0.0.1:4040/api' : '/api';

// Eagerly load Tauri fetch plugin
let tauriFetchReady: Promise<typeof globalThis.fetch> | null = null;
if (isTauri) {
  tauriFetchReady = import('@tauri-apps/plugin-http').then((mod) => mod.fetch as typeof globalThis.fetch);
}

async function getFetch(): Promise<typeof globalThis.fetch> {
  if (tauriFetchReady) {
    return tauriFetchReady;
  }
  return globalThis.fetch;
}

const DEFAULT_TIMEOUT = 15_000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
}

function parseErrorBody(text: string): string {
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    if (typeof json.error === 'string') return json.error;
    if (typeof json.message === 'string') return json.message;
    if (json.error && typeof json.error === 'object') {
      const nested = json.error as Record<string, unknown>;
      if (typeof nested.message === 'string') return nested.message;
    }
  } catch {
    // not JSON — return raw text
  }
  return text;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, signal, timeout = DEFAULT_TIMEOUT } = options;
  const fullUrl = `${BASE_URL}${path}`;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const fetchFn = await getFetch();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Exponential backoff before retry (not on first attempt)
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** (attempt - 1), 4000)));
    }

    // Create per-attempt timeout controller, merged with caller signal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeoutId);
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    config.signal = controller.signal;

    try {
      const response = await fetchFn(fullUrl, config);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const message = parseErrorBody(errorText) || `HTTP ${response.status}`;

        if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
          lastError = new Error(`HTTP ${response.status}: ${message}`);
          continue;
        }

        throw new Error(`HTTP ${response.status}: ${message}`);
      }

      const text = await response.text();

      if (!text || text.trim() === '') {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } catch (e) {
      clearTimeout(timeoutId);

      // Don't retry aborts from the caller
      if (signal?.aborted) {
        throw e;
      }

      // Timeout — treat as retryable
      if (e instanceof DOMException && e.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeout}ms`);
        if (attempt < MAX_RETRIES) continue;
        throw lastError;
      }

      // Network errors are retryable
      if (e instanceof TypeError && attempt < MAX_RETRIES) {
        lastError = e;
        continue;
      }

      throw e;
    }
  }

  throw lastError ?? new Error('Request failed');
}

// Re-export shared utilities for backward compatibility
export { extractKey, ensureArray, extractList, normalizeError } from './utils';

export function get<T>(path: string, options?: { signal?: AbortSignal; timeout?: number }): Promise<T> {
  return request<T>(path, options);
}

export function post<T>(path: string, body?: unknown, options?: { signal?: AbortSignal; timeout?: number }): Promise<T> {
  return request<T>(path, { method: 'POST', body, ...options });
}

export function put<T>(path: string, body?: unknown, options?: { signal?: AbortSignal; timeout?: number }): Promise<T> {
  return request<T>(path, { method: 'PUT', body, ...options });
}

export function del<T>(path: string, options?: { signal?: AbortSignal; timeout?: number }): Promise<T> {
  return request<T>(path, { method: 'DELETE', ...options });
}
