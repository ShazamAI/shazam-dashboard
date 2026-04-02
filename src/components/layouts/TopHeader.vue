<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSidebar } from '@/composables/useSidebar';
import { useWebSocket } from '@/composables/useWebSocket';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useNotifications } from '@/composables/useNotifications';
import NotificationBell from '@/components/common/NotificationBell.vue';

const route = useRoute();
const { toggleMobile } = useSidebar();
const ws = useWebSocket();
const { activeCompany } = useActiveCompany();
const { notificationsEnabled, permission, requestPermission } = useNotifications();

const pageTitle = computed(() => (route.meta?.title as string) ?? 'Dashboard');

const companyName = computed(() => activeCompany.value?.name ?? null);

function toggleBrowserNotifications() {
  if (permission.value === 'default') {
    requestPermission();
  } else {
    notificationsEnabled.value = !notificationsEnabled.value;
  }
}
</script>

<template>
  <header class="top-header flex h-14 shrink-0 items-center border-b border-gray-800 bg-gray-900/85 backdrop-blur-xl md:h-16">
    <!-- Left section -->
    <div class="flex min-w-0 flex-1 items-center gap-3 px-4 md:px-6">
      <!-- Mobile hamburger — 44px touch target -->
      <button
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-all duration-200 hover:bg-gray-800 hover:text-white active:scale-95 md:hidden"
        aria-label="Open menu"
        @click="toggleMobile"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <!-- Page title + breadcrumb -->
      <div class="flex min-w-0 items-center gap-2.5">
        <h1 class="truncate text-base font-semibold text-white tracking-tight md:text-lg">
          {{ pageTitle }}
        </h1>

        <!-- Company context pill -->
        <div
          v-if="companyName"
          class="hidden items-center gap-1.5 rounded-lg border border-gray-800 bg-surface-card px-2.5 py-1 sm:flex"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-shazam-400" />
          <span class="text-[11px] font-medium text-gray-400">{{ companyName }}</span>
        </div>
      </div>
    </div>

    <!-- Right section -->
    <div class="flex shrink-0 items-center gap-2 px-4 md:gap-3 md:px-6">
      <!-- Browser notification toggle -->
      <button
        class="relative rounded-lg p-2 transition-colors"
        :class="notificationsEnabled ? 'text-shazam-400 hover:bg-shazam-500/10' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'"
        :title="notificationsEnabled ? 'Browser notifications on (click to disable)' : permission === 'denied' ? 'Notifications blocked by browser' : 'Enable browser notifications'"
        @click="toggleBrowserNotifications"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path
            v-if="!notificationsEnabled"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9.143 17.082a24.248 24.248 0 005.714 0m-5.714 0a3 3 0 115.714 0M3.124 16.126c-.866 1.5.217 3.374 1.948 3.374h13.856c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L3.124 16.126z"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        <!-- Active dot -->
        <span
          v-if="notificationsEnabled"
          class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-shazam-400"
        />
      </button>

      <!-- In-app notification bell -->
      <NotificationBell />

      <!-- Connection status -->
      <div
        class="flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors duration-200"
        :class="ws.isConnected.value ? 'bg-emerald-500/10' : 'bg-red-500/10'"
      >
        <span class="relative flex h-2 w-2">
          <span
            v-if="!ws.isConnected.value"
            class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            :class="ws.isConnected.value ? 'bg-emerald-400' : 'bg-red-400'"
          />
          <span
            class="relative inline-flex h-2 w-2 rounded-full"
            :class="ws.isConnected.value ? 'bg-emerald-500' : 'bg-red-500'"
          />
        </span>
        <span
          class="hidden text-xs font-medium sm:inline"
          :class="ws.isConnected.value ? 'text-emerald-400' : 'text-red-400'"
        >
          {{ ws.isConnected.value ? 'Live' : 'Reconnecting' }}
        </span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-header {
  /* Subtle bottom shadow for depth separation */
  box-shadow: 0 1px 0 rgba(39, 39, 42, 0.5), 0 1px 3px rgba(0, 0, 0, 0.2);
}
</style>
