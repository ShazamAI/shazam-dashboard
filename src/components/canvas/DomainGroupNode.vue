<script setup lang="ts">
interface Props {
  data: {
    domain: string;
    agentCount: number;
    color: string;
  };
}

defineProps<Props>();
</script>

<template>
  <div
    class="rounded-2xl border-2 border-dashed px-6 py-4 min-w-[250px] min-h-[150px]"
    :style="{
      borderColor: data.color + '40',
      backgroundColor: data.color + '08',
    }"
  >
    <div class="flex items-center gap-2 mb-1">
      <div class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: data.color }" />
      <span class="text-xs font-semibold uppercase tracking-wider" :style="{ color: data.color }">
        {{ data.domain }}
      </span>
      <span class="text-[10px] text-gray-600">{{ data.agentCount }} agents</span>
    </div>
  </div>
</template>
