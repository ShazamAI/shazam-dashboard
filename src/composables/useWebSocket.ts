import { ref, readonly, onUnmounted } from 'vue';
import type { ShazamEvent, EventType } from '@/types';

type EventHandler = (event: ShazamEvent) => void;

// ─── Singleton state (shared across all components) ──────
const isConnected = ref(false);
const events = ref<ShazamEvent[]>([]);
const lastEvent = ref<ShazamEvent | null>(null);
const reconnectAttempts = ref(0);

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isDestroyed = false;
let activeConsumers = 0;
let subscribedCompany: string | null = null;

const listeners = new Map<EventType | '*', Set<EventHandler>>();

// ─── Internal functions ──────────────────────────────────

function on(eventType: EventType | '*', handler: EventHandler): () => void {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, new Set());
  }
  listeners.get(eventType)!.add(handler);
  return () => {
    listeners.get(eventType)?.delete(handler);
  };
}

function emit(event: ShazamEvent) {
  listeners.get(event.type)?.forEach((handler) => {
    try {
      handler(event);
    } catch {
      // Silent handler error
    }
  });
  listeners.get('*')?.forEach((handler) => {
    try {
      handler(event);
    } catch {
      // Silent handler error
    }
  });
}

/**
 * Normalizes various backend message formats into a consistent ShazamEvent.
 *
 * Supported formats:
 *   1. Standard:     { type, data, timestamp, agent?, company?, task_id? }
 *   2. Phoenix:      { event, payload: { ... } }
 *   3. Wrapped:      { event, data: { ... } }
 *   4. Flat payload: { type, task_id, status, ... }  (no nested data)
 *   5. Topic-based:  { topic, event, payload }
 */
function normalizeEvent(raw: unknown): ShazamEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  // Determine the event type string
  const eventType = (obj.type ?? obj.event) as string | undefined;
  if (typeof eventType !== 'string' || eventType.length === 0) {
    return null;
  }

  // Skip Phoenix internal messages
  if (eventType === 'phx_reply' || eventType === 'phx_error' || eventType === 'phx_close') {
    return null;
  }

  // Determine the data payload
  let data: unknown = obj.data ?? obj.payload ?? null;

  // If data is null but there are extra fields, treat the object as a flat payload
  if (data === null || data === undefined) {
    const reserved = new Set([
      'type', 'event', 'timestamp', 'agent', 'company',
      'task_id', 'topic', 'ref', 'join_ref',
    ]);
    const extra: Record<string, unknown> = {};
    let hasExtra = false;
    for (const [key, val] of Object.entries(obj)) {
      if (!reserved.has(key)) {
        extra[key] = val;
        hasExtra = true;
      }
    }
    if (hasExtra) {
      data = extra;
    }
  }

  // Determine timestamp — accept from message, nested payload, or generate now
  let timestamp = obj.timestamp as string | undefined;
  if (typeof timestamp !== 'string') {
    if (data && typeof data === 'object' && 'timestamp' in (data as Record<string, unknown>)) {
      timestamp = (data as Record<string, unknown>).timestamp as string;
    }
    if (typeof timestamp !== 'string') {
      timestamp = new Date().toISOString();
    }
  }

  // Extract agent / company / task_id from top level or nested data
  const dataObj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  const agent = (obj.agent ?? dataObj.agent ?? dataObj.agent_name ?? null) as string | null;
  const company = (obj.company ?? dataObj.company ?? dataObj.company_name ?? null) as string | null;
  const taskId = (obj.task_id ?? dataObj.task_id ?? null) as string | null;

  return {
    type: eventType,
    agent,
    company,
    task_id: taskId,
    data,
    timestamp,
  };
}

function connect() {
  if (isDestroyed) return;
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;

  // In Tauri (production), connect directly to daemon. In dev, use Vite proxy.
  const isTauri = '__TAURI__' in window;
  const url = isTauri ? 'ws://127.0.0.1:4040/ws' : `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`;

  try {
    socket = new WebSocket(url);

    socket.onopen = () => {
      isConnected.value = true;
      reconnectAttempts.value = 0;

      // Auto-subscribe to active project if set
      if (subscribedCompany) {
        send({ action: 'subscribe', company: subscribedCompany });
      }
    };

    socket.onmessage = (messageEvent: MessageEvent) => {
      try {
        const parsed = JSON.parse(messageEvent.data as string) as unknown;
        const normalized = normalizeEvent(parsed);

        if (!normalized) return;

        lastEvent.value = normalized;
        events.value = [...events.value.slice(-99), normalized];
        emit(normalized);
      } catch {
        // Unparseable message — skip silently
      }
    };

    socket.onclose = () => {
      isConnected.value = false;
      scheduleReconnect();
    };

    socket.onerror = () => {
      socket?.close();
    };
  } catch {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (isDestroyed) return;

  const maxAttempts = 10;
  const baseInterval = 3000;

  if (reconnectAttempts.value >= maxAttempts) return;

  if (reconnectTimer) clearTimeout(reconnectTimer);

  // Exponential backoff: 3s, 6s, 12s... capped at 30s
  const delay = Math.min(baseInterval * Math.pow(2, reconnectAttempts.value), 30_000);

  reconnectTimer = setTimeout(() => {
    reconnectAttempts.value++;
    connect();
  }, delay);
}

function disconnect() {
  isDestroyed = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  isConnected.value = false;
}

function send(data: unknown) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

// ─── Public composable ──────────────────────────────────

export function useWebSocket() {
  activeConsumers++;

  if (activeConsumers === 1 && !socket) {
    isDestroyed = false;
    connect();
  }

  const cleanups: (() => void)[] = [];

  function onScoped(eventType: EventType | '*', handler: EventHandler): () => void {
    const unsub = on(eventType, handler);
    cleanups.push(unsub);
    return unsub;
  }

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;

    activeConsumers--;
    if (activeConsumers <= 0) {
      activeConsumers = 0;
      disconnect();
    }
  });

  return {
    isConnected: readonly(isConnected),
    events: readonly(events),
    lastEvent: readonly(lastEvent),
    reconnectAttempts: readonly(reconnectAttempts),
    on: onScoped,
    send,
    connect() {
      isDestroyed = false;
      connect();
    },
    disconnect,

    /** Subscribe to a specific project — filters events server-side */
    subscribeToProject(company: string) {
      subscribedCompany = company;
      send({ action: 'subscribe', company });
    },

    /** Send a command to the daemon (e.g. "/tasks", "/start") */
    sendCommand(raw: string) {
      send({ action: 'command', raw });
    },
  };
}
