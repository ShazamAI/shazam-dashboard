/**
 * Shared API response utilities.
 *
 * Centralizes response extraction, array normalization, and error handling
 * so all services use the same patterns.
 */

// ─── Response extraction ─────────────────────────────────

/**
 * Extract a named key from a wrapped response object.
 * Backend returns `{ "companies": [...] }`, `{ "tasks": [...] }`, etc.
 * Mock API returns `{ "data": [...] }`.
 *
 * Priority: domainKey → "data" fallback → raw response.
 */
export function extractKey<T>(response: unknown, key: string): T {
  if (response !== null && typeof response === 'object' && !Array.isArray(response)) {
    const obj = response as Record<string, unknown>;
    if (key in obj) return obj[key] as T;
    if ('data' in obj) return obj.data as T;
  }
  return response as T;
}

/**
 * Ensures value is an array. Returns [] for null, undefined, or non-array values.
 * Use after extractKey to safely iterate over backend responses.
 */
export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Extract + ensureArray in one call. Common pattern for list endpoints.
 *
 * @example
 * const tasks = extractList<BackendTask>(response, 'tasks');
 */
export function extractList<T>(response: unknown, key: string): T[] {
  return ensureArray<T>(extractKey<T[]>(response, key));
}

// ─── Error normalization ─────────────────────────────────

/**
 * Normalize any caught error into a human-readable message string.
 * Provides consistent error messages across all services and pages.
 */
export function normalizeError(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

// ─── Type-safe field extraction ──────────────────────────

/**
 * Safely extract a typed field from an unknown object.
 * Returns the defaultValue when the field is missing or the wrong type.
 */
export function field<T>(obj: Record<string, unknown>, key: string, defaultValue: T): T {
  const val = obj[key];
  if (val === undefined || val === null) return defaultValue;
  if (typeof defaultValue === 'string' && typeof val === 'string') return val as T;
  if (typeof defaultValue === 'number' && typeof val === 'number') return val as T;
  if (typeof defaultValue === 'boolean' && typeof val === 'boolean') return val as T;
  return defaultValue;
}
