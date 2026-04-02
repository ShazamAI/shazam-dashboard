<script setup lang="ts">
import type { TaskStats } from '@/api/metricsService';
import { formatCost } from '@/api/metricsService';

interface Props {
  taskStats: TaskStats;
  totalCost: number;
}

defineProps<Props>();
</script>

<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-6">
    <div class="stat-card" role="article" aria-label="Total Tasks">
      <p class="stat-label">Total Tasks</p>
      <p class="stat-value text-white">{{ taskStats.total }}</p>
    </div>
    <div class="stat-card" role="article" aria-label="Completed tasks">
      <p class="stat-label">Completed</p>
      <p class="stat-value text-emerald-400">{{ taskStats.completed }}</p>
    </div>
    <div class="stat-card" role="article" aria-label="Failed tasks">
      <p class="stat-label">Failed</p>
      <p class="stat-value text-red-400">{{ taskStats.failed }}</p>
    </div>
    <div class="stat-card" role="article" aria-label="Tasks in progress">
      <p class="stat-label">In Progress</p>
      <p class="stat-value text-blue-400">{{ taskStats.inProgress }}</p>
    </div>
    <div class="stat-card" role="article" aria-label="Success rate">
      <p class="stat-label">Success Rate</p>
      <p class="stat-value text-shazam-400">{{ taskStats.successRate }}%</p>
    </div>
    <div class="stat-card" role="article" aria-label="Total cost">
      <p class="stat-label">Total Cost</p>
      <p class="stat-value text-white">{{ formatCost(totalCost) }}</p>
    </div>
  </div>
</template>
