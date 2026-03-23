<script setup lang="ts">
import { useMetrics } from '@/composables/useMetrics';
import {
  formatTokens,
  formatAgentCost,
  budgetPercentage,
  budgetBarColor,
  budgetTextColor,
  formatCost,
} from '@/api/metricsService';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';

const {
  circuitBreaker,
  taskStats,
  totalTokens,
  totalBudget,
  totalCost,
  sortedAgents,
  activeSessionsCount,
  idleAgentsCount,
  busyAgentsCount,
  agents,
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
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-6">
        <div class="stat-card">
          <p class="stat-label">Total Tasks</p>
          <p class="stat-value text-white">{{ taskStats.total }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Completed</p>
          <p class="stat-value text-emerald-400">{{ taskStats.completed }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Failed</p>
          <p class="stat-value text-red-400">{{ taskStats.failed }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">In Progress</p>
          <p class="stat-value text-blue-400">{{ taskStats.inProgress }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Success Rate</p>
          <p class="stat-value text-shazam-400">{{ taskStats.successRate }}%</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Total Cost</p>
          <p class="stat-value text-white">{{ formatCost(totalCost) }}</p>
        </div>
      </div>

      <div class="grid gap-4 md:gap-6 lg:grid-cols-3">
        <!-- Agent Token Usage (2/3) -->
        <div class="lg:col-span-2">
          <div class="card">
            <div class="card-header">
              <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 class="section-title">Per-Agent Token Usage</h2>
                <div class="text-[10px] text-gray-500 sm:text-xs">
                  Total: <span class="font-mono text-gray-300">{{ formatTokens(totalTokens) }}</span>
                  / <span class="font-mono text-gray-300">{{ formatTokens(totalBudget) }}</span>
                </div>
              </div>
            </div>

            <div v-if="sortedAgents.length > 0">
              <!-- Desktop table (hidden on mobile) -->
              <table class="hidden w-full md:table">
                <thead>
                  <tr class="border-b border-gray-800 text-left text-[10px] uppercase tracking-wider text-gray-500">
                    <th class="px-4 py-2.5 font-medium lg:px-6">Agent</th>
                    <th class="px-4 py-2.5 font-medium lg:px-6">Role</th>
                    <th class="px-4 py-2.5 font-medium lg:px-6">Tokens</th>
                    <th class="hidden px-4 py-2.5 font-medium lg:table-cell lg:px-6">Budget</th>
                    <th class="px-4 py-2.5 font-medium lg:px-6">Usage</th>
                    <th class="px-4 py-2.5 font-medium text-right lg:px-6">Est. Cost</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800/50">
                  <tr v-for="agent in sortedAgents" :key="agent.name" class="hover:bg-gray-800/30">
                    <td class="px-4 py-3 lg:px-6">
                      <div class="flex items-center gap-2">
                        <span
                          class="h-2 w-2 rounded-full"
                          :class="{
                            'bg-emerald-500': agent.status === 'idle',
                            'bg-amber-400 animate-pulse': agent.status === 'busy',
                            'bg-yellow-500': agent.status === 'paused',
                          }"
                        />
                        <span class="text-sm font-medium text-gray-200">{{ agent.name }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-xs text-gray-500 lg:px-6">{{ agent.role }}</td>
                    <td class="px-4 py-3 font-mono text-xs text-gray-300 lg:px-6">{{ formatTokens(agent.tokens_used) }}</td>
                    <td class="hidden px-4 py-3 font-mono text-xs text-gray-500 lg:table-cell lg:px-6">{{ formatTokens(agent.budget) }}</td>
                    <td class="px-4 py-3 lg:px-6">
                      <div class="flex items-center gap-2">
                        <div class="h-2 w-16 overflow-hidden rounded-full bg-gray-800 lg:w-20">
                          <div
                            class="h-full rounded-full transition-all duration-500"
                            :class="budgetBarColor(budgetPercentage(agent))"
                            :style="{ width: `${budgetPercentage(agent)}%` }"
                          />
                        </div>
                        <span
                          class="text-xs font-medium"
                          :class="budgetTextColor(budgetPercentage(agent))"
                        >
                          {{ budgetPercentage(agent) }}%
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right font-mono text-xs text-gray-300 lg:px-6">
                      {{ formatAgentCost(agent.tokens_used) }}
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- Mobile card list -->
              <div class="divide-y divide-gray-800/50 md:hidden">
                <div v-for="agent in sortedAgents" :key="agent.name" class="px-3 py-3 sm:px-4">
                  <div class="mb-2 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span
                        class="h-2 w-2 shrink-0 rounded-full"
                        :class="{
                          'bg-emerald-400': agent.status === 'idle',
                          'bg-amber-400 animate-pulse': agent.status === 'busy' || agent.status === 'working',
                          'bg-cyan-400 animate-pulse': agent.status === 'executing',
                          'bg-yellow-400 animate-pulse': agent.status === 'waiting',
                          'bg-gray-500': agent.status === 'paused',
                          'bg-red-500': agent.status === 'error',
                          'bg-gray-600': agent.status === 'offline',
                        }"
                      />
                      <span class="text-sm font-medium text-gray-200">{{ agent.name }}</span>
                    </div>
                    <span class="font-mono text-xs text-gray-300">{{ formatAgentCost(agent.tokens_used) }}</span>
                  </div>
                  <p class="mb-2 text-[10px] text-gray-500">{{ agent.role }}</p>
                  <div class="flex items-center gap-2">
                    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :class="budgetBarColor(budgetPercentage(agent))"
                        :style="{ width: `${budgetPercentage(agent)}%` }"
                      />
                    </div>
                    <span class="text-[10px] font-medium" :class="budgetTextColor(budgetPercentage(agent))">
                      {{ budgetPercentage(agent) }}%
                    </span>
                    <span class="font-mono text-[10px] text-gray-500">
                      {{ formatTokens(agent.tokens_used) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="px-4 py-10 text-center text-sm text-gray-500 sm:px-6">
              No agent data available. Metrics will appear when agents are active.
            </div>
          </div>
        </div>

        <!-- Right column: system health panels -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <!-- Circuit Breaker -->
          <div
            class="rounded-xl border p-3 sm:p-4"
            :class="circuitBreaker.tripped
              ? 'border-red-500/20 bg-red-500/5'
              : 'border-gray-800 bg-surface-card'"
          >
            <div class="mb-3 flex items-center justify-between">
              <h3 class="section-title">Circuit Breaker</h3>
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="circuitBreaker.tripped
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-emerald-500/10 text-emerald-400'"
              >
                {{ circuitBreaker.tripped ? 'TRIPPED' : 'Healthy' }}
              </span>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-500">Consecutive Failures</span>
                <span
                  class="font-mono font-medium"
                  :class="circuitBreaker.consecutive_failures > 0 ? 'text-red-400' : 'text-gray-300'"
                >
                  {{ circuitBreaker.consecutive_failures }} / {{ circuitBreaker.threshold }}
                </span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-gray-800">
                <div
                  class="h-full rounded-full transition-all"
                  :class="circuitBreaker.tripped ? 'bg-red-500' : 'bg-yellow-500'"
                  :style="{ width: `${Math.min((circuitBreaker.consecutive_failures / circuitBreaker.threshold) * 100, 100)}%` }"
                />
              </div>
              <p v-if="circuitBreaker.last_error" class="mt-1 truncate text-red-400/70">
                {{ circuitBreaker.last_error }}
              </p>
            </div>
          </div>

          <!-- Session Pool -->
          <div class="rounded-xl border border-gray-800 bg-surface-card p-3 sm:p-4">
            <h3 class="mb-3 text-sm font-semibold text-white">Session Pool</h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-500">Active Sessions</span>
                <span class="font-mono font-medium text-gray-300">{{ activeSessionsCount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Total Agents</span>
                <span class="font-mono font-medium text-gray-300">{{ agents.length }}</span>
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

          <!-- System Health -->
          <div class="rounded-xl border border-gray-800 bg-surface-card p-3 sm:p-4">
            <h3 class="mb-3 text-sm font-semibold text-white">System Health</h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-500">Connection</span>
                <span class="flex items-center gap-1.5">
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="ws.isConnected.value ? 'bg-emerald-500' : 'bg-red-500'"
                  />
                  <span :class="ws.isConnected.value ? 'text-emerald-400' : 'text-red-400'">
                    {{ ws.isConnected.value ? 'Connected' : 'Disconnected' }}
                  </span>
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Total Tasks</span>
                <span class="font-mono font-medium text-gray-300">{{ taskStats.total }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">WS Reconnects</span>
                <span class="font-mono font-medium text-gray-300">{{ ws.reconnectAttempts.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
