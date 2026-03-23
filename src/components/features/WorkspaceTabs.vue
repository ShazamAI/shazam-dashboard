<script setup lang="ts">
import { computed } from 'vue';

export interface WorkspaceTab {
  id: string;
  label: string;
  count: number;
  icon: string;
  color: string;
}

interface Props {
  tabs: WorkspaceTab[];
  activeTab: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [tabId: string];
}>();

const totalCount = computed(() =>
  props.tabs.reduce((sum, tab) => sum + tab.count, 0)
);
</script>

<template>
  <div class="workspace-tabs -mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0" style="-webkit-overflow-scrolling: touch">
    <!-- Tab bar -->
    <div class="inline-flex min-w-max items-center gap-1 rounded-2xl border border-gray-800/80 bg-gray-900/50 p-1 backdrop-blur-sm">
      <!-- All tab -->
      <button
        class="tab-button relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
        :class="
          activeTab === 'all'
            ? 'bg-shazam-500/15 text-shazam-400 shadow-sm shadow-shazam-500/10'
            : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'
        "
        @click="emit('select', 'all')"
      >
        <span class="text-base">🌐</span>
        <span>All</span>
        <span
          class="ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums transition-colors duration-300"
          :class="
            activeTab === 'all'
              ? 'bg-shazam-500/20 text-shazam-400'
              : 'bg-gray-800 text-gray-500'
          "
        >
          {{ totalCount }}
        </span>
      </button>

      <!-- Dynamic workspace tabs -->
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-button relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
        :class="
          activeTab === tab.id
            ? `${tab.color} shadow-sm`
            : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'
        "
        @click="emit('select', tab.id)"
      >
        <span class="text-base">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
        <span
          class="ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums transition-colors duration-300"
          :class="
            activeTab === tab.id
              ? 'bg-white/10 text-current'
              : 'bg-gray-800 text-gray-500'
          "
        >
          {{ tab.count }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tab-button {
  position: relative;
  overflow: hidden;
}

.tab-button::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: currentColor;
  border-radius: 1px;
  transition: all 0.3s ease;
  transform: translateX(-50%);
  opacity: 0;
}

.tab-button:hover::after {
  width: 60%;
  opacity: 0.3;
}
</style>
