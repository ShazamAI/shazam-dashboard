<script setup lang="ts">
import { useMetrics } from '@/composables/useMetrics';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import MetricsStatsRow from '@/components/features/MetricsStatsRow.vue';
import CostTrendChart from '@/components/features/CostTrendChart.vue';
import MetricsAgentTable from '@/components/features/MetricsAgentTable.vue';
import MetricsCircuitBreaker from '@/components/features/MetricsCircuitBreaker.vue';
import MetricsSessionPool from '@/components/features/MetricsSessionPool.vue';
import MetricsSystemHealth from '@/components/features/MetricsSystemHealth.vue';
import ContextMonitor from '@/components/features/ContextMonitor.vue';
import AgentScoreCard from '@/components/features/AgentScoreCard.vue';

const {
  circuitBreaker,
  taskStats,
  totalTokens,
  totalBudget,
  totalCost,
  sortedAgents,
  idleAgentsCount,
  busyAgentsCount,
  agents,
  costHistory,
  contextEntries,
  agentScores,
  isLoading,
  error,
  ws,
} = useMetrics();
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <ErrorBoundary :error="error" />
    <LoadingSpinner v-if="isLoading" label="Loading metrics..." />

    <template v-else>
      <!-- Top stats row -->
      <MetricsStatsRow :task-stats="taskStats" :total-cost="totalCost" />

      <!-- Cost trend chart -->
      <CostTrendChart :data="costHistory" />

      <!-- Agent Performance Scores -->
      <div v-if="Object.keys(agentScores).length > 0" class="space-y-3">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Agent Performance</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AgentScoreCard
            v-for="(score, name) in agentScores"
            :key="name"
            :agent-name="String(name)"
            :score="score"
          />
        </div>
      </div>

      <div class="grid gap-4 md:gap-6 lg:grid-cols-3">
        <!-- Agent Token Usage (2/3) -->
        <div class="lg:col-span-2">
          <MetricsAgentTable
            :sorted-agents="sortedAgents"
            :total-tokens="totalTokens"
            :total-budget="totalBudget"
          />
        </div>

        <!-- Right column: system health panels -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <ContextMonitor :entries="contextEntries" />

          <MetricsCircuitBreaker :circuit-breaker="circuitBreaker" />

          <MetricsSessionPool
            :total-agents="agents.length"
            :idle-agents-count="idleAgentsCount"
            :busy-agents-count="busyAgentsCount"
          />

          <MetricsSystemHealth
            :is-connected="ws.isConnected.value"
            :total-tasks="taskStats.total"
            :reconnect-attempts="ws.reconnectAttempts.value"
          />
        </div>
      </div>
    </template>
  </div>
</template>
