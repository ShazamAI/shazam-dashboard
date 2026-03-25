<script setup lang="ts">
import { computed } from 'vue';

interface AgentBudget {
  name: string;
  used: number;
  total: number;
}

interface Props {
  data: {
    agents: AgentBudget[];
    totalCost: string;
  };
}

const props = defineProps<Props>();

const totalUsed = computed(() => props.data.agents.reduce((s, a) => s + a.used, 0));
const totalBudget = computed(() => props.data.agents.reduce((s, a) => s + a.total, 0));
const percentage = computed(() => totalBudget.value > 0 ? Math.round((totalUsed.value / totalBudget.value) * 100) : 0);
</script>

<template>
  <div class="rounded-xl border border-gray-700 bg-gray-900/90 px-4 py-3 shadow-lg min-w-[200px]">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-medium text-gray-300">💰 Budget</span>
      <span class="text-xs text-gray-500">{{ data.totalCost }}</span>
    </div>
    <div class="w-full h-1.5 bg-gray-800 rounded-full mb-2">
      <div
        class="h-full rounded-full transition-all"
        :class="percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'"
        :style="{ width: percentage + '%' }"
      />
    </div>
    <div class="text-[10px] text-gray-500 mb-2">{{ percentage }}% used ({{ totalUsed.toLocaleString() }} / {{ totalBudget.toLocaleString() }} tokens)</div>
    <div class="space-y-1">
      <div v-for="agent in data.agents.slice(0, 5)" :key="agent.name" class="flex items-center justify-between text-[10px]">
        <span class="text-gray-400">{{ agent.name }}</span>
        <span class="text-gray-500">{{ agent.used.toLocaleString() }}</span>
      </div>
    </div>
  </div>
</template>
