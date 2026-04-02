/**
 * Pinia Store Index
 *
 * Only the notification store remains as a Pinia store.
 * All other domain state is managed by composables.
 */

export { useNotificationStore } from './notifications';
export type { Notification, NotificationType, NotificationCategory } from './notifications';
