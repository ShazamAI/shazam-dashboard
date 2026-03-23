import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ShazamEvent, FeedItem } from '@/types';

const MAX_FEED_ITEMS = 500;
const COST_PER_1K_TOKENS = 0.003;

let feedIdCounter = 0;
function nextId(): string {
  return `feed-${++feedIdCounter}-${Date.now()}`;
}

/**
 * Event Store — manages the real-time event feed and cost tracking.
 *
 * Processes WebSocket events into displayable feed items.
 * Handles text streaming aggregation for agent output.
 */
export const useEventStore = defineStore('events', () => {
  // ─── State ──────────────────────────────────────────

  const feedItems = ref<FeedItem[]>([]);
  const streamingBuffers = ref<Map<string, string>>(new Map());
  const totalCost = ref(0);
  const recentEvents = ref<ShazamEvent[]>([]);

  // ─── Getters ────────────────────────────────────────

  const feedCount = computed(() => feedItems.value.length);

  const formattedCost = computed(() =>
    totalCost.value < 0.01 ? '<$0.01' : `$${totalCost.value.toFixed(2)}`
  );

  // ─── Actions ────────────────────────────────────────

  function processEvent(event: ShazamEvent): void {
    if (event.type === 'heartbeat') return;

    // Track recent events
    recentEvents.value = [...recentEvents.value.slice(-99), event];

    if (event.type === 'agent_text_delta') {
      handleStreamingDelta(event);
      return;
    }

    if (event.type === 'agent_text_complete' || event.type === 'agent_output') {
      finalizeStream(event);
      return;
    }

    // Standard event → add to feed
    feedItems.value.push({
      id: nextId(),
      type: event.type,
      agent: event.agent,
      content: formatEventContent(event),
      timestamp: event.timestamp,
      isStreaming: false,
      taskId: event.task_id,
      meta: (event.data as Record<string, unknown>) ?? {},
    });

    if (feedItems.value.length > MAX_FEED_ITEMS) {
      feedItems.value = feedItems.value.slice(-MAX_FEED_ITEMS);
    }
  }

  function updateTotalCost(tokens: number): void {
    totalCost.value = (tokens / 1000) * COST_PER_1K_TOKENS;
  }

  function clearFeed(): void {
    feedItems.value = [];
    streamingBuffers.value.clear();
  }

  // ─── Private helpers ────────────────────────────────

  function getStreamKey(event: ShazamEvent): string {
    return `${event.agent ?? 'unknown'}-${event.task_id ?? 'none'}`;
  }

  function handleStreamingDelta(event: ShazamEvent): void {
    const key = getStreamKey(event);
    const deltaText = formatEventContent(event);
    const updated = (streamingBuffers.value.get(key) ?? '') + deltaText;
    streamingBuffers.value.set(key, updated);

    const existing = feedItems.value.find(
      (item) => item.isStreaming && item.agent === event.agent && item.taskId === event.task_id
    );

    if (existing) {
      existing.content = updated;
      existing.timestamp = event.timestamp;
    } else {
      feedItems.value.push({
        id: nextId(),
        type: event.type,
        agent: event.agent,
        content: updated,
        timestamp: event.timestamp,
        isStreaming: true,
        taskId: event.task_id,
        meta: {},
      });
    }
  }

  function finalizeStream(event: ShazamEvent): void {
    const key = getStreamKey(event);
    streamingBuffers.value.delete(key);

    const streamingItem = feedItems.value.find(
      (item) => item.isStreaming && item.agent === event.agent && item.taskId === event.task_id
    );

    if (streamingItem) {
      streamingItem.content = formatEventContent(event);
      streamingItem.isStreaming = false;
      streamingItem.type = event.type;
      streamingItem.timestamp = event.timestamp;
      return;
    }

    // No existing stream — add as regular item
    feedItems.value.push({
      id: nextId(),
      type: event.type,
      agent: event.agent,
      content: formatEventContent(event),
      timestamp: event.timestamp,
      isStreaming: false,
      taskId: event.task_id,
      meta: (event.data as Record<string, unknown>) ?? {},
    });
  }

  function formatEventContent(event: ShazamEvent): string {
    const data = event.data as Record<string, unknown> | string | null;
    switch (event.type) {
      case 'agent_text_delta':
        return typeof data === 'string' ? data : (data as Record<string, unknown>)?.text as string ?? '';
      case 'agent_text_complete':
      case 'agent_output':
        return typeof data === 'string'
          ? data
          : (data as Record<string, unknown>)?.text as string
            ?? (data as Record<string, unknown>)?.output as string ?? '[complete]';
      case 'tool_use':
      case 'tool_result': {
        const d = data as Record<string, unknown> | null;
        const toolName = d?.tool_name ?? d?.name ?? 'unknown';
        const input = d?.input ?? d?.result;
        const inputSummary = input
          ? JSON.stringify(input).slice(0, 120) + (JSON.stringify(input).length > 120 ? '...' : '')
          : '';
        return `Tool: ${toolName}${inputSummary ? ` — ${inputSummary}` : ''}`;
      }
      case 'task_status_change': {
        const d = data as Record<string, unknown> | null;
        return `Task ${d?.task_id ?? event.task_id ?? ''}: ${d?.from ?? '?'} → ${d?.to ?? d?.status ?? '?'}${d?.title ? ` (${d.title})` : ''}`;
      }
      case 'task_completed': {
        const d = data as Record<string, unknown> | null;
        return `Task ${d?.task_id ?? event.task_id ?? ''} completed${d?.title ? ` — ${d.title}` : ''}`;
      }
      case 'task_started': {
        const d = data as Record<string, unknown> | null;
        return `Task ${d?.task_id ?? event.task_id ?? ''} started${d?.title ? ` — ${d.title}` : ''}${d?.assigned_to ? ` (${d.assigned_to})` : ''}`;
      }
      case 'task_failed': {
        const d = data as Record<string, unknown> | null;
        return `Task ${d?.task_id ?? event.task_id ?? ''} FAILED${d?.error ? ` — ${d.error}` : ''}`;
      }
      case 'task_created': {
        const d = data as Record<string, unknown> | null;
        return `Task created: ${d?.title ?? d?.task_id ?? event.task_id ?? 'unknown'}`;
      }
      case 'agent_status_change': {
        const d = data as Record<string, unknown> | null;
        return `Agent ${event.agent ?? d?.agent ?? 'unknown'}: ${d?.from ?? '?'} → ${d?.to ?? d?.status ?? '?'}`;
      }
      case 'metrics_update': {
        const d = data as Record<string, unknown> | null;
        const parts: string[] = [];
        if (d?.total_tasks !== undefined) parts.push(`tasks: ${d.total_tasks}`);
        if (d?.agents_busy !== undefined) parts.push(`busy: ${d.agents_busy}`);
        if (d?.total_tokens_used !== undefined) parts.push(`tokens: ${d.total_tokens_used}`);
        return parts.length > 0 ? `Metrics: ${parts.join(', ')}` : 'Metrics updated';
      }
      case 'circuit_breaker_tripped': {
        const d = data as Record<string, unknown> | null;
        return `Circuit breaker TRIPPED — ${d?.consecutive_failures ?? '?'} failures. ${d?.last_error ?? ''}`;
      }
      case 'circuit_breaker_reset':
        return 'Circuit breaker RESET — system recovered';
      case 'system':
        return typeof data === 'string' ? data : JSON.stringify(data);
      default: {
        if (typeof data === 'string') return data;
        if (data && typeof data === 'object') {
          const d = data as Record<string, unknown>;
          const content = d.message ?? d.text ?? d.content ?? d.output ?? d.description;
          if (typeof content === 'string') return content;
        }
        return data ? JSON.stringify(data) : `[${event.type}]`;
      }
    }
  }

  return {
    feedItems,
    totalCost,
    recentEvents,
    feedCount,
    formattedCost,
    processEvent,
    updateTotalCost,
    clearFeed,
  };
});
