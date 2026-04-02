<script setup lang="ts">
interface Props {
  totalAgents: number;
  idleAgentsCount: number;
  busyAgentsCount: number;
}

defineProps<Props>();
</script>

<template>
  <div class="rounded-xl border border-gray-800 bg-surface-card p-3 sm:p-4">
    <h3 class="mb-3 text-sm font-semibold text-white">Session Pool</h3>
    <div class="space-y-2 text-xs">
      <div class="flex justify-between">
        <span class="text-gray-500">Active Sessions</span>
        <span class="font-mono font-medium text-gray-300">{{ busyAgentsCount }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Total Agents</span>
        <span class="font-mono font-medium text-gray-300">{{ totalAgents }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Idle Agents</span>
        <span class="font-mono font-medium text-gray-300">{{ idleAgentsCount }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Busy Agents</span>
        <span class="font-mono font-medium text-amber-400">{{ busyAgentsCount }}</span>
      </div>
    </div>
  </div>
</template>
