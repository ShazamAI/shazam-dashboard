import { ref, readonly } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

const MAX_TOASTS = 5;
let idCounter = 0;

const toasts = ref<Toast[]>([]);
const timerMap = new Map<number, ReturnType<typeof setTimeout>>();

function addToast(type: ToastType, message: string, duration = 5000) {
  const id = ++idCounter;
  toasts.value.push({ id, type, message, duration });

  // Cap max toasts — remove oldest when exceeded
  while (toasts.value.length > MAX_TOASTS) {
    const oldest = toasts.value[0];
    if (!oldest) break;
    removeToast(oldest.id);
  }

  if (duration > 0) {
    const timerId = setTimeout(() => {
      timerMap.delete(id);
      removeToast(id);
    }, duration);
    timerMap.set(id, timerId);
  }
}

function removeToast(id: number) {
  // Clear any pending auto-dismiss timer
  const timerId = timerMap.get(id);
  if (timerId !== undefined) {
    clearTimeout(timerId);
    timerMap.delete(id);
  }
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    success: (msg: string, duration?: number) => addToast('success', msg, duration),
    error: (msg: string, duration?: number) => addToast('error', msg, duration ?? 8000),
    warning: (msg: string, duration?: number) => addToast('warning', msg, duration),
    info: (msg: string, duration?: number) => addToast('info', msg, duration),
    remove: removeToast,
  };
}
