<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useNotificationStore, type Notification, type NotificationType } from '@/stores/notifications';

const store = useNotificationStore();
const isOpen = ref(false);
const bellRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

onMounted(() => {
  store.initialize();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

function handleClickOutside(event: MouseEvent) {
  if (
    isOpen.value &&
    bellRef.value &&
    dropdownRef.value &&
    !bellRef.value.contains(event.target as Node) &&
    !dropdownRef.value.contains(event.target as Node)
  ) {
    isOpen.value = false;
  }
}

function toggle() {
  isOpen.value = !isOpen.value;
}

function handleDismiss(id: string) {
  store.dismiss(id);
}

function handleMarkRead(notif: Notification) {
  store.markRead(notif.id);
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getTypeStyles(type: NotificationType): { icon: string; bg: string; text: string; border: string } {
  switch (type) {
    case 'error':
      return {
        icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20',
      };
    case 'warning':
      return {
        icon: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/20',
      };
    case 'success':
      return {
        icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/20',
      };
    case 'info':
    default:
      return {
        icon: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
        bg: 'bg-shazam-500/10',
        text: 'text-shazam-400',
        border: 'border-shazam-500/20',
      };
  }
}
</script>

<template>
  <div class="relative">
    <!-- Bell Button -->
    <button
      ref="bellRef"
      class="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
      @click="toggle"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>

      <!-- Badge -->
      <Transition
        enter-active-class="transition-all duration-200 ease-bounce-in"
        enter-from-class="scale-0 opacity-0"
        enter-to-class="scale-100 opacity-100"
        leave-active-class="transition-all duration-150"
        leave-to-class="scale-0 opacity-0"
      >
        <span
          v-if="store.unreadCount > 0"
          class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
        >
          {{ store.unreadCount > 99 ? '99+' : store.unreadCount }}
        </span>
      </Transition>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-gray-800 bg-surface-card shadow-2xl shadow-black/40"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h3 class="text-sm font-semibold text-white">Notifications</h3>
          <div class="flex items-center gap-2">
            <button
              v-if="store.unreadCount > 0"
              class="text-[11px] text-shazam-400 hover:text-shazam-300 transition-colors"
              @click="store.markAllRead()"
            >
              Mark all read
            </button>
            <button
              v-if="store.notifications.length > 0"
              class="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
              @click="store.clearAll()"
            >
              Clear
            </button>
          </div>
        </div>

        <!-- Category tabs -->
        <div class="flex border-b border-gray-800 px-2">
          <div class="flex gap-3 px-2 py-2 text-[10px]">
            <span class="text-gray-400">
              All <span v-if="store.unreadCount > 0" class="text-shazam-400">({{ store.unreadCount }})</span>
            </span>
            <span v-if="store.unreadByCategory.tasks > 0" class="text-gray-500">
              Tasks <span class="text-shazam-400">{{ store.unreadByCategory.tasks }}</span>
            </span>
            <span v-if="store.unreadByCategory.agents > 0" class="text-gray-500">
              Agents <span class="text-yellow-400">{{ store.unreadByCategory.agents }}</span>
            </span>
            <span v-if="store.unreadByCategory.system > 0" class="text-gray-500">
              System <span class="text-red-400">{{ store.unreadByCategory.system }}</span>
            </span>
          </div>
        </div>

        <!-- Notification List -->
        <div class="max-h-80 overflow-y-auto scrollbar-thin">
          <div v-if="store.recentNotifications.length === 0" class="px-4 py-8 text-center">
            <svg class="mx-auto mb-2 h-8 w-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <p class="text-xs text-gray-500">No notifications yet</p>
          </div>

          <TransitionGroup name="notif" tag="div">
            <div
              v-for="notif in store.recentNotifications"
              :key="notif.id"
              class="group relative border-b border-gray-800/50 px-4 py-3 transition-colors hover:bg-gray-800/30"
              :class="{ 'bg-gray-800/15': !notif.read }"
              @click="handleMarkRead(notif)"
            >
              <!-- Unread indicator -->
              <span
                v-if="!notif.read"
                class="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-shazam-500"
              />

              <div class="flex gap-2.5">
                <!-- Type icon -->
                <div
                  class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  :class="getTypeStyles(notif.type).bg"
                >
                  <svg
                    class="h-3.5 w-3.5"
                    :class="getTypeStyles(notif.type).text"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" :d="getTypeStyles(notif.type).icon" />
                  </svg>
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-xs font-medium text-white">{{ notif.title }}</span>
                    <span class="shrink-0 text-[10px] text-gray-600">{{ formatTime(notif.timestamp) }}</span>
                  </div>
                  <p class="mt-0.5 text-[11px] leading-relaxed text-gray-400 line-clamp-2">{{ notif.message }}</p>
                  <div v-if="notif.agentName" class="mt-1">
                    <span class="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">{{ notif.agentName }}</span>
                  </div>
                </div>

                <!-- Dismiss -->
                <button
                  class="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-gray-600 hover:text-gray-300"
                  @click.stop="handleDismiss(notif.id)"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.notif-enter-active {
  transition: all 0.25s ease-out;
}
.notif-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.notif-leave-active {
  transition: all 0.2s ease-in;
}
.notif-leave-to {
  opacity: 0;
  transform: translateX(-12px);
  max-height: 0;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgb(55 65 81 / 0.5);
  border-radius: 9999px;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
