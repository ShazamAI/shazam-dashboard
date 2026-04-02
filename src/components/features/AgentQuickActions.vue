<script setup lang="ts">
interface QuickAction {
  label: string;
  icon: string;
  prompt: string;
}

interface Props {
  actions: readonly QuickAction[];
  disabled: boolean;
}

defineProps<Props>();
const emit = defineEmits<{ select: [prompt: string] }>();
</script>

<template>
  <div class="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-1">
    <button
      v-for="action in actions"
      :key="action.label"
      class="shrink-0 rounded-full border border-gray-700 bg-gray-800/60 px-3 py-1 text-[10px] font-medium text-gray-400 transition-all hover:border-gray-600 hover:bg-gray-700 hover:text-white disabled:opacity-40"
      :disabled="disabled"
      :aria-label="action.label"
      @click="emit('select', action.prompt)"
    >
      <span class="mr-1">{{ action.icon }}</span>
      {{ action.label }}
    </button>
  </div>
</template>
