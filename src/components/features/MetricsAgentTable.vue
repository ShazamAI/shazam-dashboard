<script setup lang="ts">
import type { AgentWorker } from '@/types';
import {
  formatTokens,
  formatAgentCost,
  budgetPercentage,
  budgetBarColor,
  budgetTextColor,
} from '@/api/metricsService';

interface Props {
  sortedAgents: AgentWorker[];
  totalTokens: number;
  totalBudget: number;
}

defineProps<Props>();
</script>

<template>
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
          <tr v-for="agent in sortedAgents" :key="agent.name + '-' + (agent.domain ?? '')" class="hover:bg-gray-800/30">
            <td class="px-4 py-3 lg:px-6">
              <div class="flex items-center gap-2">
                <span
                  class="h-2 w-2 rounded-full"
                  :class="{
                    'bg-emerald-500': agent.status === 'idle',
                    'bg-amber-400 animate-pulse': agent.status === 'busy',
                    'bg-yellow-500': agent.status === 'paused',
                  }"
                  :aria-label="`Agent status: ${agent.status}`"
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
              {{ formatAgentCost(agent.tokens_used, agent.model) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mobile card list -->
      <div class="divide-y divide-gray-800/50 md:hidden">
        <div v-for="agent in sortedAgents" :key="agent.name + '-' + (agent.domain ?? '')" class="px-3 py-3 sm:px-4">
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                :aria-label="`Agent status: ${agent.status}`"
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
            <span class="font-mono text-xs text-gray-300">{{ formatAgentCost(agent.tokens_used, agent.model) }}</span>
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
</template>
