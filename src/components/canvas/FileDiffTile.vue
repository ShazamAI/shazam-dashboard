<script setup lang="ts">
interface DiffLine {
  type: 'add' | 'remove' | 'context';
  text: string;
}

interface Props {
  agentName: string;
  isExpanded: boolean;
  files: Array<{ path: string; diffs: DiffLine[] }>;
}

defineProps<Props>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Transition name="slide">
    <div
      v-if="isExpanded && files.length > 0"
      class="rounded-xl border border-gray-700 bg-gray-950/95 shadow-2xl overflow-hidden backdrop-blur-sm mt-2"
      :style="{ width: '380px', maxHeight: '300px' }"
    >
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900/80">
        <div class="flex items-center gap-2">
          <span class="text-sm">📝</span>
          <span class="text-xs font-semibold text-white">Changes by {{ agentName }}</span>
          <span class="text-[10px] text-gray-500">{{ files.length }} file(s)</span>
        </div>
        <button class="text-gray-500 hover:text-gray-300 p-0.5" @click="emit('close')">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="overflow-y-auto max-h-[250px] scrollbar-none">
        <div v-for="file in files" :key="file.path" class="border-b border-gray-800/50 last:border-0">
          <div class="px-3 py-1.5 bg-gray-900/50 text-[10px] font-mono text-gray-400">
            {{ file.path }}
          </div>
          <div class="px-2 py-1 font-mono text-[10px] leading-relaxed">
            <div
              v-for="(line, i) in file.diffs.slice(0, 20)"
              :key="i"
              class="px-1"
              :class="{
                'bg-green-500/10 text-green-400': line.type === 'add',
                'bg-red-500/10 text-red-400': line.type === 'remove',
                'text-gray-500': line.type === 'context',
              }"
            >
              <span class="select-none mr-1">{{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ' }}</span>{{ line.text }}
            </div>
          </div>
        </div>
        <div v-if="files.length === 0" class="px-3 py-4 text-center text-[10px] text-gray-600">
          No changes detected
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-enter-active { transition: all 0.2s ease-out; }
.slide-leave-active { transition: all 0.15s ease-in; }
.slide-enter-from { opacity: 0; transform: translateY(-8px) scale(0.95); }
.slide-leave-to { opacity: 0; transform: translateY(-8px) scale(0.95); }
</style>
