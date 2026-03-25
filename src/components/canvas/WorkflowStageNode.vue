<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';

interface Props {
  data: {
    name: string;
    role: string;
    prompt_suffix: string | null;
    on_reject: string | null;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    editing: boolean;
  };
}

const { data } = defineProps<Props>();
const emit = defineEmits<{
  update: [field: string, value: string];
  remove: [];
}>();

const roleColors: Record<string, { bg: string; border: string; text: string }> = {
  dev: { bg: 'bg-blue-900/40', border: 'border-blue-500/40', text: 'text-blue-400' },
  reviewer: { bg: 'bg-purple-900/40', border: 'border-purple-500/40', text: 'text-purple-400' },
  qa: { bg: 'bg-amber-900/40', border: 'border-amber-500/40', text: 'text-amber-400' },
  default: { bg: 'bg-gray-800/60', border: 'border-gray-600', text: 'text-gray-400' },
};

function getColors(role: string): { bg: string; border: string; text: string } {
  const lower = role.toLowerCase();
  for (const [key, val] of Object.entries(roleColors)) {
    if (key !== 'default' && lower.includes(key)) return val;
  }
  return roleColors['default']!;
}
</script>

<template>
  <div
    class="rounded-xl border-2 shadow-lg min-w-[180px] max-w-[220px] transition-all"
    :class="[getColors(data.role ?? '').bg, getColors(data.role ?? '').border]"
  >
    <Handle v-if="!data.isFirst" type="target" :position="Position.Left" class="!bg-gray-500 !w-2.5 !h-2.5 !border-2 !border-gray-900" />

    <!-- Header -->
    <div class="px-3 pt-3 pb-1.5">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="text-[9px] font-bold uppercase tracking-wider text-gray-500">Stage {{ data.index + 1 }}</span>
        <button
          v-if="data.editing"
          class="text-gray-600 hover:text-red-400 transition-colors"
          title="Remove stage"
          @click.stop="emit('remove')"
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Name -->
      <template v-if="data.editing">
        <input
          :value="data.name"
          class="w-full rounded bg-gray-900/80 border border-gray-700 px-2 py-1 text-xs font-semibold text-white focus:border-shazam-500/50 focus:outline-none mb-1.5"
          placeholder="Stage name"
          @input="emit('update', 'name', ($event.target as HTMLInputElement).value)"
          @click.stop
        />
      </template>
      <template v-else>
        <p class="text-sm font-semibold text-white truncate">{{ data.name }}</p>
      </template>

      <!-- Role -->
      <div class="flex items-center gap-1.5 mt-1">
        <span class="h-1.5 w-1.5 rounded-full" :class="getColors(data.role ?? '').text.replace('text-', 'bg-')" />
        <template v-if="data.editing">
          <select
            :value="data.role"
            class="flex-1 rounded bg-gray-900/80 border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300 focus:border-shazam-500/50 focus:outline-none"
            @change="emit('update', 'role', ($event.target as HTMLSelectElement).value)"
            @click.stop
          >
            <option value="dev">dev</option>
            <option value="reviewer">reviewer</option>
            <option value="qa">qa</option>
            <option value="*">any (*)</option>
          </select>
        </template>
        <template v-else>
          <span class="text-[10px]" :class="getColors(data.role ?? '').text">{{ data.role }}</span>
        </template>
      </div>
    </div>

    <!-- Prompt suffix -->
    <div v-if="data.editing" class="px-3 pb-2">
      <textarea
        :value="data.prompt_suffix ?? ''"
        class="w-full rounded bg-gray-900/80 border border-gray-700 px-2 py-1 text-[10px] text-gray-400 focus:border-shazam-500/50 focus:outline-none resize-none"
        rows="2"
        placeholder="Stage instructions..."
        @input="emit('update', 'prompt_suffix', ($event.target as HTMLTextAreaElement).value)"
        @click.stop
      />
    </div>
    <div v-else-if="data.prompt_suffix" class="px-3 pb-2">
      <p class="text-[10px] leading-relaxed text-gray-500 line-clamp-2">{{ data.prompt_suffix }}</p>
    </div>

    <!-- On reject -->
    <div v-if="data.on_reject" class="border-t border-gray-800/40 px-3 py-1.5">
      <p class="text-[9px] text-red-400/60">reject → {{ data.on_reject }}</p>
    </div>

    <Handle v-if="!data.isLast" type="source" :position="Position.Right" class="!bg-gray-500 !w-2.5 !h-2.5 !border-2 !border-gray-900" />
  </div>
</template>
