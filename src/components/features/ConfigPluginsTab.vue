<script setup lang="ts">
import type { PluginConfig } from '@/types';
import AppButton from '@/components/common/Button.vue';

interface Props {
  plugins: PluginConfig[];
  isReloading: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  reload: [];
}>();
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-gray-800/60 bg-surface-card">
      <div class="flex flex-col gap-3 border-b border-gray-800/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div>
          <h2 class="section-title">Loaded Plugins</h2>
          <p class="section-subtitle">Plugins from .shazam/plugins/</p>
        </div>
        <AppButton variant="secondary" size="sm" :loading="isReloading" @click="emit('reload')">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Reload Plugins
        </AppButton>
      </div>
      <div class="divide-y divide-gray-800/40">
        <div
          v-for="plugin in plugins"
          :key="plugin.name"
          class="flex flex-col gap-2 px-4 py-3.5 transition-colors duration-150 hover:bg-gray-800/10 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-sm">🧩</span>
              <p class="text-sm font-semibold text-gray-200">{{ plugin.name }}</p>
              <span
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1"
                :class="plugin.enabled
                  ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                  : 'bg-gray-800/50 text-gray-500 ring-gray-700/30'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="plugin.enabled ? 'bg-emerald-400' : 'bg-gray-600'" />
                {{ plugin.enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div v-if="plugin.events?.length" class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="event in plugin.events"
                :key="event"
                class="inline-flex rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400 ring-1 ring-purple-500/15"
              >{{ event }}</span>
            </div>
            <p v-else class="mt-1 text-[10px] text-gray-600">Subscribed to all events</p>
          </div>
        </div>
        <div v-if="plugins.length === 0" class="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span class="text-2xl">🧩</span>
          <p class="text-sm text-gray-500">No plugins loaded</p>
          <p class="text-xs text-gray-600">Add .ex files to .shazam/plugins/ directory</p>
        </div>
      </div>
    </div>
  </div>
</template>
