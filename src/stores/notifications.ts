import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useWebSocket } from '@/composables/useWebSocket';
import type { ShazamEvent } from '@/types';

// ─── Types ──────────────────────────────────────────

export type NotificationType = 'info' | 'warning' | 'error' | 'success';
export type NotificationCategory = 'tasks' | 'agents' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  taskId?: string;
  agentName?: string;
}

// ─── Helpers ────────────────────────────────────────

const MAX_NOTIFICATIONS = 100;
let notifIdCounter = 0;

function nextId(): string {
  return `notif-${++notifIdCounter}-${Date.now()}`;
}

/**
 * Notification Store — captures WebSocket events and surfaces them as notifications.
 *
 * Tracks unread counts per category and provides mark-read/dismiss actions.
 */
export const useNotificationStore = defineStore('notifications', () => {
  // ─── State ──────────────────────────────────────────

  const notifications = ref<Notification[]>([]);
  const _initialized = ref(false);

  // ─── Getters ────────────────────────────────────────

  const unreadCount = computed(() =>
    notifications.value.filter((n) => !n.read).length,
  );

  const unreadByCategory = computed(() => {
    const counts: Record<NotificationCategory, number> = { tasks: 0, agents: 0, system: 0 };
    for (const n of notifications.value) {
      if (!n.read) counts[n.category]++;
    }
    return counts;
  });

  const recentNotifications = computed(() =>
    [...notifications.value]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20),
  );

  // ─── Actions ────────────────────────────────────────

  function addNotification(notif: Omit<Notification, 'id' | 'read'>) {
    notifications.value.push({
      ...notif,
      id: nextId(),
      read: false,
    });

    // Cap notifications
    if (notifications.value.length > MAX_NOTIFICATIONS) {
      notifications.value = notifications.value.slice(-MAX_NOTIFICATIONS);
    }
  }

  function markAllRead() {
    for (const n of notifications.value) {
      n.read = true;
    }
  }

  function markRead(id: string) {
    const notif = notifications.value.find((n) => n.id === id);
    if (notif) notif.read = true;
  }

  function dismiss(id: string) {
    notifications.value = notifications.value.filter((n) => n.id !== id);
  }

  function clearAll() {
    notifications.value = [];
  }

  // ─── WebSocket Integration ────────────────────────

  function initialize() {
    if (_initialized.value) return;
    _initialized.value = true;

    const ws = useWebSocket();

    ws.on('task_failed', (event: ShazamEvent) => {
      const data = event.data as Record<string, unknown> | null;
      const taskId = (data?.task_id ?? event.task_id ?? '') as string;
      const title = (data?.title ?? '') as string;
      const error = (data?.error ?? data?.message ?? 'Unknown error') as string;

      addNotification({
        type: 'error',
        category: 'tasks',
        title: 'Task Failed',
        message: title
          ? `"${title}" failed: ${error}`
          : `Task ${taskId} failed: ${error}`,
        timestamp: event.timestamp,
        taskId: taskId || undefined,
        agentName: event.agent ?? undefined,
      });
    });

    ws.on('task_created', (event: ShazamEvent) => {
      const data = event.data as Record<string, unknown> | null;
      const status = (data?.status ?? '') as string;

      // Only notify for tasks requiring approval
      if (status === 'awaiting_approval') {
        const taskId = (data?.task_id ?? event.task_id ?? '') as string;
        const title = (data?.title ?? '') as string;

        addNotification({
          type: 'info',
          category: 'tasks',
          title: 'Approval Required',
          message: title
            ? `"${title}" is awaiting approval`
            : `Task ${taskId} is awaiting approval`,
          timestamp: event.timestamp,
          taskId: taskId || undefined,
          agentName: event.agent ?? undefined,
        });
      }
    });

    ws.on('circuit_breaker_tripped', (event: ShazamEvent) => {
      const data = event.data as Record<string, unknown> | null;
      const failures = (data?.consecutive_failures ?? '?') as string | number;
      const lastError = (data?.last_error ?? '') as string;

      addNotification({
        type: 'error',
        category: 'system',
        title: 'Circuit Breaker Tripped',
        message: `${failures} consecutive failures. Execution paused.${lastError ? ` Last error: ${lastError}` : ''}`,
        timestamp: event.timestamp,
      });
    });

    ws.on('task_stage_advanced', (event: ShazamEvent) => {
      const data = event.data as Record<string, unknown> | null;
      const taskId = (data?.task_id ?? event.task_id ?? '') as string;
      const title = (data?.title ?? '') as string;
      const stage = (data?.stage ?? data?.stage_name ?? '') as string;

      addNotification({
        type: 'info',
        category: 'tasks',
        title: 'Pipeline Advanced',
        message: title
          ? `"${title}" advanced to stage: ${stage}`
          : `Task ${taskId} advanced to stage: ${stage}`,
        timestamp: event.timestamp,
        taskId: taskId || undefined,
        agentName: event.agent ?? undefined,
      });
    });

    // Also capture agent errors for agent category
    ws.on('agent_status_change', (event: ShazamEvent) => {
      const data = event.data as Record<string, unknown> | null;
      const to = (data?.to ?? data?.status ?? '') as string;

      if (to === 'error') {
        const agentName = event.agent ?? (data?.agent as string) ?? 'unknown';
        const error = (data?.error ?? data?.message ?? 'Agent entered error state') as string;

        addNotification({
          type: 'warning',
          category: 'agents',
          title: 'Agent Error',
          message: `${agentName}: ${error}`,
          timestamp: event.timestamp,
          agentName,
        });
      }
    });
  }

  return {
    // State
    notifications,

    // Getters
    unreadCount,
    unreadByCategory,
    recentNotifications,

    // Actions
    addNotification,
    markAllRead,
    markRead,
    dismiss,
    clearAll,
    initialize,
  };
});
