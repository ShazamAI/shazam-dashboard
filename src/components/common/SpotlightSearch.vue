<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useSpotlight } from '@/composables/useSpotlight';

const { isOpen, query, selectedIndex, filteredItems, close, selectItem, handleKeyDown } = useSpotlight();

const inputRef = ref<HTMLInputElement | null>(null);
const itemRefs = ref<HTMLElement[]>([]);

watch(isOpen, (val) => {
  if (val) {
    nextTick(() => inputRef.value?.focus());
  }
});

watch(selectedIndex, (idx) => {
  nextTick(() => {
    itemRefs.value[idx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
});

const typeColors: Record<string, string> = {
  page: 'text-blue-400',
  agent: 'text-emerald-400',
  task: 'text-amber-400',
  action: 'text-purple-400',
  plan: 'text-shazam-400',
};

const typeLabels: Record<string, string> = {
  page: 'Page',
  agent: 'Agent',
  task: 'Task',
  action: 'Action',
  plan: 'Plan',
};
</script>

<template>
  <Teleport to="body">
    <Transition name="spotlight">
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="close" />

        <!-- Search panel -->
        <div
          class="relative w-full max-w-xl rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl shadow-black/50 overflow-hidden"
          @keydown="handleKeyDown"
        >
          <!-- Search input -->
          <div class="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
            <svg class="h-5 w-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              placeholder="Search pages, agents, actions..."
              class="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              aria-label="Search"
            />
            <kbd class="hidden sm:inline-flex items-center gap-0.5 rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
              ESC
            </kbd>
          </div>

          <!-- Results -->
          <div class="max-h-80 overflow-y-auto py-2 scrollbar-thin">
            <div v-if="filteredItems.length === 0" class="px-4 py-8 text-center text-sm text-gray-600">
              No results found
            </div>

            <button
              v-for="(item, i) in filteredItems"
              :ref="(el) => { if (el) itemRefs[i] = el as HTMLElement }"
              :key="item.id"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
              :class="i === selectedIndex ? 'bg-shazam-500/10 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'"
              @click="selectItem(item)"
              @mouseenter="selectedIndex = i"
            >
              <span class="text-lg w-7 text-center shrink-0">{{ item.icon }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ item.title }}</p>
                <p v-if="item.subtitle" class="text-[10px] text-gray-600 truncate">{{ item.subtitle }}</p>
              </div>
              <span class="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium" :class="typeColors[item.type]">
                {{ typeLabels[item.type] }}
              </span>
            </button>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-gray-800 px-4 py-2">
            <div class="flex items-center gap-3 text-[10px] text-gray-600">
              <span><kbd class="text-gray-500">↑↓</kbd> Navigate</span>
              <span><kbd class="text-gray-500">↵</kbd> Open</span>
              <span><kbd class="text-gray-500">esc</kbd> Close</span>
            </div>
            <span class="text-[10px] text-gray-700">{{ filteredItems.length }} results</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.spotlight-enter-active { transition: all 0.15s ease-out; }
.spotlight-leave-active { transition: all 0.1s ease-in; }
.spotlight-enter-from { opacity: 0; }
.spotlight-enter-from > div:last-child { transform: scale(0.95) translateY(-20px); }
.spotlight-leave-to { opacity: 0; }
</style>
