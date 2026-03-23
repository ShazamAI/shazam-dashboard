import { get } from './http';
import { extractList } from './utils';
import type { ShazamEvent } from '@/types';

export async function fetchRecentEvents(): Promise<ShazamEvent[]> {
  try {
    const response = await get<unknown>('/events/recent');
    return extractList<ShazamEvent>(response, 'events');
  } catch {
    // Endpoint may not exist yet — return empty array gracefully
    return [];
  }
}
