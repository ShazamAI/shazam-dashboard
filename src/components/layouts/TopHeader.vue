<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSidebar } from '@/composables/useSidebar';
import { useWebSocket } from '@/composables/useWebSocket';
import { useActiveCompany } from '@/composables/useActiveCompany';

const route = useRoute();
const { toggleMobile } = useSidebar();
const ws = useWebSocket();
const { activeCompany } = useActiveCompany();

const pageTitle = computed(() => (route.meta?.title as string) ?? 'Dashboard');

const companyName = computed(() => activeCompany.value?.name ?? null);
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
