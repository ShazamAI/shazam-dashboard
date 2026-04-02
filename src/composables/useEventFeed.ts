import { ref, readonly } from 'vue';
import type { ShazamEvent, FeedItem, EventType } from '@/types';
import { getEventData, getEventDataOrString, getDataString } from '@/utils/eventGuards';

import { COST_PER_1K_TOKENS } from '@/api/metricsService';
const MAX_BUFFER_SIZE = 10 * 1024; // 10KB per buffer
const MAX_BUFFER_COUNT = 100;

let feedIdCounter = 0;

function nextId(): string {
  feedIdCounter++;
  return `feed-${feedIdCounter}-${Date.now()}`;
}

export function useEventFeed() {
  const feedItems = ref<FeedItem[]>([]);
  const streamingBuffers = ref<Map<string, string>>(new Map());
  const totalCost = ref(0);

  function formatEventContent(event: ShazamEvent): string {
    const data = getEventDataOrString(event);
    const d = getEventData(event);
    switch (event.type) {
      case 'agent_text_delta':
        return typeof data === 'string' ? data : getDataString(event, 'text');
      case 'agent_text_complete':
      case 'agent_output':
        return typeof data === 'string' ? data : getDataString(event, 'text') || getDataString(event, 'output') || '[complete]';
      case 'tool_use':
      case 'tool_result': {
        const toolName = getDataString(event, 'tool_name')
          || getDataString(event, 'name')
          || getDataString(event, 'title')?.split(':')[0]?.trim()
          || 'unknown';
        const inputRaw = d.input ?? d.result ?? d.arguments;
        const inputSummary = inputRaw
          ? JSON.stringify(inputRaw).slice(0, 120) + (JSON.stringify(inputRaw).length > 120 ? '...' : '')
          : getDataString(event, 'text')?.slice(0, 120) || '';
        return `Tool: ${toolName}${inputSummary ? ` — ${inputSummary}` : ''}`;
      }
      case 'task_status_change': {
        const taskId = getDataString(event, 'task_id') || event.task_id || '';
        const from = getDataString(event, 'from', '?');
        const to = getDataString(event, 'to') || getDataString(event, 'status', '?');
        const title = getDataString(event, 'title');
        return `Task ${taskId}: ${from} → ${to}${title ? ` (${title})` : ''}`;
      }
      case 'task_completed': {
        const taskId = getDataString(event, 'task_id') || event.task_id || '';
        const title = getDataString(event, 'title');
        return `Task ${taskId} completed${title ? ` — ${title}` : ''}`;
      }
      case 'task_started': {
        const taskId = getDataString(event, 'task_id') || event.task_id || '';
        const title = getDataString(event, 'title');
        const assignedTo = getDataString(event, 'assigned_to');
        return `Task ${taskId} started${title ? ` — ${title}` : ''}${assignedTo ? ` (${assignedTo})` : ''}`;
      }
      case 'task_failed': {
        const taskId = getDataString(event, 'task_id') || event.task_id || '';
        const error = getDataString(event, 'error');
        const title = getDataString(event, 'title');
        return `Task ${taskId} FAILED${error ? ` — ${error}` : ''}${title ? ` (${title})` : ''}`;
      }
      case 'task_created': {
        const title = getDataString(event, 'title') || getDataString(event, 'task_id') || event.task_id || 'unknown';
        return `Task created: ${title}`;
      }
      case 'agent_status_change': {
        const agentName = event.agent ?? getDataString(event, 'agent', 'unknown');
        const from = getDataString(event, 'from', '?');
        const to = getDataString(event, 'to') || getDataString(event, 'status', '?');
        return `Agent ${agentName}: ${from} → ${to}`;
      }
      case 'metrics_update': {
        const parts: string[] = [];
        if (d.total_tasks !== undefined) parts.push(`tasks: ${d.total_tasks}`);
        if (d.agents_busy !== undefined) parts.push(`busy: ${d.agents_busy}`);
        if (d.total_tokens_used !== undefined) parts.push(`tokens: ${d.total_tokens_used}`);
        return parts.length > 0 ? `Metrics: ${parts.join(', ')}` : 'Metrics updated';
      }
      case 'circuit_breaker_tripped': {
        const failures = d.consecutive_failures ?? '?';
        const lastError = getDataString(event, 'last_error', 'unknown');
        return `Circuit breaker TRIPPED — ${failures} consecutive failures. Last error: ${lastError}`;
      }
      case 'circuit_breaker_reset':
        return 'Circuit breaker RESET — system recovered';
      case 'heartbeat':
        return 'heartbeat';
      case 'system':
        return typeof data === 'string' ? data : JSON.stringify(data);
      default:
        // Generic handler for any unrecognized event type
        if (typeof data === 'string') return data;
        if (data && typeof data === 'object') {
          // Try common content fields
          const content = d.message ?? d.text ?? d.content ?? d.output ?? d.description;
          if (typeof content === 'string') return content;
        }
        return data ? JSON.stringify(data) : `[${event.type}]`;
    }
  }

  function getStreamKey(event: ShazamEvent): string {
    return `${event.agent ?? 'unknown'}-${event.task_id ?? 'none'}`;
  }

  function processEvent(event: ShazamEvent) {
    try {
      processEventInner(event);
    } catch (err) {
      console.warn('[useEventFeed] Error processing event:', err);
    }
  }

  function processEventInner(event: ShazamEvent) {
    // Skip heartbeat events from cluttering the feed
    if (event.type === 'heartbeat') return;

    if (event.type === 'agent_text_delta') {
      const key = getStreamKey(event);
      const deltaText = formatEventContent(event);
      const existing = streamingBuffers.value.get(key) ?? '';
      const updated = (existing + deltaText).slice(0, MAX_BUFFER_SIZE);

      // Cap total buffer count
      if (!streamingBuffers.value.has(key) && streamingBuffers.value.size >= MAX_BUFFER_COUNT) {
        const oldest = streamingBuffers.value.keys().next().value;
        if (oldest !== undefined) streamingBuffers.value.delete(oldest);
      }
      streamingBuffers.value.set(key, updated);

      const existingItem = feedItems.value.find(
        (item) => item.isStreaming && item.agent === event.agent && item.taskId === event.task_id
      );

      if (existingItem) {
        existingItem.content = updated;
        existingItem.timestamp = event.timestamp;
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
      return;
    }

    if (event.type === 'agent_text_complete' || event.type === 'agent_output') {
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
    }

    feedItems.value.push({
      id: nextId(),
      type: event.type,
      agent: event.agent,
      content: formatEventContent(event),
      timestamp: event.timestamp,
      isStreaming: false,
      taskId: event.task_id,
      meta: getEventData(event),
    });

    // Cap at 500 items
    if (feedItems.value.length > 500) {
      feedItems.value = feedItems.value.slice(-500);
    }
  }

  function estimateCost(tokensUsed: number): number {
    return (tokensUsed / 1000) * COST_PER_1K_TOKENS;
  }

  function updateTotalCost(tokens: number) {
    totalCost.value = estimateCost(tokens);
  }

  function clearFeed() {
    feedItems.value = [];
    streamingBuffers.value.clear();
  }

  return {
    feedItems: readonly(feedItems),
    totalCost: readonly(totalCost),
    processEvent,
    estimateCost,
    updateTotalCost,
    clearFeed,
  };
}

export function eventTypeIcon(type: EventType): { path: string; color: string } {
  switch (type) {
    case 'agent_text_delta':
    case 'agent_text_complete':
    case 'agent_output':
      return {
        path: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
        color: 'text-blue-400',
      };
    case 'tool_use':
    case 'tool_result':
      return {
        path: 'M11.42 15.17l-5.58-3.22a.96.96 0 01-.5-.84V5.65c0-.35.19-.68.5-.84l5.58-3.22a.96.96 0 01.96 0l5.58 3.22c.31.16.5.49.5.84v5.46c0 .35-.19.68-.5.84l-5.58 3.22a.96.96 0 01-.96 0z',
        color: 'text-amber-400',
      };
    case 'task_status_change':
    case 'task_started':
    case 'task_created':
      return {
        path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
        color: 'text-emerald-400',
      };
    case 'task_completed':
      return {
        path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'text-emerald-400',
      };
    case 'task_failed':
      return {
        path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'text-red-400',
      };
    case 'agent_status_change':
      return {
        path: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        color: 'text-cyan-400',
      };
    case 'metrics_update':
      return {
        path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        color: 'text-purple-400',
      };
    case 'circuit_breaker_tripped':
      return {
        path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
        color: 'text-red-400',
      };
    case 'circuit_breaker_reset':
      return {
        path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'text-emerald-400',
      };
    case 'system':
      return {
        path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'text-gray-400',
      };
    default:
      return {
        path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'text-gray-400',
      };
  }
}

export function eventTypeLabel(type: EventType): string {
  switch (type) {
    case 'agent_text_delta': return 'Streaming';
    case 'agent_text_complete': return 'Output';
    case 'agent_output': return 'Output';
    case 'tool_use': return 'Tool';
    case 'tool_result': return 'Tool';
    case 'task_status_change': return 'Status';
    case 'task_completed': return 'Done';
    case 'task_started': return 'Started';
    case 'task_failed': return 'Failed';
    case 'task_created': return 'Created';
    case 'agent_status_change': return 'Agent';
    case 'metrics_update': return 'Metrics';
    case 'circuit_breaker_tripped': return 'Breaker';
    case 'circuit_breaker_reset': return 'Breaker';
    case 'system': return 'System';
    case 'heartbeat': return 'Heartbeat';
    default: return 'Event';
  }
}
