import { ref } from 'vue';

const notificationsEnabled = ref(false);
const permission = ref<NotificationPermission>('default');

export function useNotifications() {
  async function requestPermission() {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    permission.value = result;
    notificationsEnabled.value = result === 'granted';
  }

  function notify(title: string, body: string, options?: { tag?: string }) {
    if (!notificationsEnabled.value) return;
    if (document.hasFocus()) return; // Don't notify if app is focused

    try {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: options?.tag,
        silent: false,
      });

      n.onclick = () => {
        window.focus();
        n.close();
      };

      // Auto-close after 5s
      setTimeout(() => n.close(), 5000);
    } catch { /* ignore */ }
  }

  return {
    notificationsEnabled,
    permission,
    requestPermission,
    notify,
  };
}
