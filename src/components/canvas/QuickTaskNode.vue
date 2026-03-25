<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  data: {
    companyName: string;
  };
}

defineProps<Props>();
const emit = defineEmits<{ create: [title: string] }>();

const taskTitle = ref('');

function submit() {
  if (!taskTitle.value.trim()) return;
  emit('create', taskTitle.value.trim());
  taskTitle.value = '';
}
</script>

<template>
  <div class="rounded-xl border border-shazam-500/30 bg-gray-900/90 px-4 py-3 shadow-lg w-[250px]">
    <div class="text-xs font-medium text-shazam-400 mb-2">⚡ Quick Task</div>
    <form @submit.prevent="submit" class="flex gap-2">
      <input
        v-model="taskTitle"
        type="text"
        placeholder="Describe task..."
        class="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:border-shazam-500 focus:outline-none"
      />
      <button
        type="submit"
        class="rounded-lg bg-shazam-500/20 px-3 py-1.5 text-xs font-medium text-shazam-400 hover:bg-shazam-500/30 shrink-0"
      >Go</button>
    </form>
  </div>
</template>
