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
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let isDestroyed = false;
let activeConsumers = 0;
let subscribedCompany: string | null = null;

const MAX_EVENTS = 100;

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

function removeAllListeners() {
  listeners.clear();
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      send({ type: 'ping' });
    }
  }, 30_000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function pushEvent(normalized: ShazamEvent) {
  lastEvent.value = normalized;
  events.value.push(normalized);
  if (events.value.length > MAX_EVENTS) {
    events.value.shift();
  }
  emit(normalized);
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
  // Backend sends { type: "event", event: "task_completed" } — prefer obj.event when type is generic
  let eventType: string | undefined;
  if (obj.type === 'event' && typeof obj.event === 'string' && obj.event.length > 0) {
    eventType = obj.event as string;
  } else {
    eventType = (obj.type ?? obj.event) as string | undefined;
  }
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
    type: eventType as EventType,
    agent,
    company,
    task_id: taskId,
    data,
    timestamp,
  };
}

async function connect() {
  if (isDestroyed) {
    isDestroyed = false;
  }

  const isTauri = typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
  const url = isTauri ? 'ws://127.0.0.1:4040/ws' : `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`;

  if (isTauri) {
    // Use Tauri WebSocket plugin (bypasses WebKit mixed-content block)
    try {
      const TauriWebSocket = (await import('@tauri-apps/plugin-websocket')).default;

      if (socket) return; // Already connected

      const tauriWs = await TauriWebSocket.connect(url);
      isConnected.value = true;
      reconnectAttempts.value = 0;

      // Subscribe if needed
      if (subscribedCompany) {
        tauriWs.send(JSON.stringify({ action: 'subscribe', company: subscribedCompany }));
      }

      // Store a proxy object so send() works uniformly
      const proxy: Record<string, unknown> = {
        readyState: WebSocket.OPEN,
        send: (d: string) => tauriWs.send(d),
        close: () => tauriWs.disconnect(),
        onclose: null,
        onerror: null,
        onmessage: null,
        onopen: null,
        // WebSocket constants
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3,
        url,
        protocol: '',
        extensions: '',
        bufferedAmount: 0,
        binaryType: 'blob',
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
      socket = proxy as unknown as WebSocket;

      startHeartbeat();

      tauriWs.addListener((msg) => {
        if (msg.type === 'Close') {
          isConnected.value = false;
          proxy.readyState = WebSocket.CLOSED;
          socket = null;
          stopHeartbeat();
          scheduleReconnect();
          return;
        }
        if (msg.type !== 'Text' || typeof msg.data !== 'string') return;

        try {
          const parsed = JSON.parse(msg.data) as unknown;
          const normalized = normalizeEvent(parsed);
          if (!normalized) return;
          pushEvent(normalized);
        } catch {
          // skip
        }
      });
    } catch {
      scheduleReconnect();
    }
  } else {
    // Browser native WebSocket (dev mode with Vite proxy)
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;

    try {
      socket = new WebSocket(url);

      socket.onopen = () => {
        isConnected.value = true;
        reconnectAttempts.value = 0;
        startHeartbeat();
        if (subscribedCompany) {
          send({ action: 'subscribe', company: subscribedCompany });
        }
      };

      socket.onmessage = (messageEvent: MessageEvent) => {
        try {
          const parsed = JSON.parse(messageEvent.data as string) as unknown;
          const normalized = normalizeEvent(parsed);
          if (!normalized) return;
          pushEvent(normalized);
        } catch {
          // skip
        }
      };

      socket.onclose = () => {
        isConnected.value = false;
        stopHeartbeat();
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket?.close();
      };
    } catch {
      scheduleReconnect();
    }
  }
}

function scheduleReconnect() {
  if (isDestroyed) return;

  const baseInterval = 3000;

  if (reconnectTimer) clearTimeout(reconnectTimer);

  // Exponential backoff: 3s, 6s, 12s, 24s, 48s, 60s (capped)
  const delay = Math.min(baseInterval * Math.pow(2, reconnectAttempts.value), 60_000);

  reconnectTimer = setTimeout(() => {
    reconnectAttempts.value++;
    connect();
  }, delay);
}

function disconnect() {
  isDestroyed = true;
  stopHeartbeat();
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
    removeAllListeners,
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
