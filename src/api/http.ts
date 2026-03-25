// In Tauri (production), connect directly to daemon. In dev, use Vite proxy.
const isTauri = '__TAURI__' in window;
const BASE_URL = isTauri ? 'http://127.0.0.1:4040/api' : '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
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

  const response = await fetch(fullUrl, config);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');

    // Try to extract error message from JSON response
    try {
      const errorJson = JSON.parse(errorText) as Record<string, unknown>;
      if (typeof errorJson.error === 'string') {
        throw new Error(errorJson.error);
      }
      if (typeof errorJson.message === 'string') {
        throw new Error(errorJson.message);
      }
    } catch (e) {
      if (e instanceof Error && e.message !== errorText) {
        throw e;
      }
    }

    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const text = await response.text();

  if (!text || text.trim() === '') {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

// Re-export shared utilities for backward compatibility
export { extractKey, ensureArray, extractList, normalizeError } from './utils';

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body });
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body });
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
