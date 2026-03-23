<script setup lang="ts">
import type { AgentYamlConfig } from '@/types';

interface Props {
  agentEntries: [string, AgentYamlConfig][];
}

defineProps<Props>();

function roleIcon(role: string): string {
  const lower = role.toLowerCase();
  if (lower.includes('pm') || lower.includes('manager')) return '👔';
  if (lower.includes('senior')) return '⚡';
  if (lower.includes('junior')) return '🌱';
  if (lower.includes('qa')) return '🧪';
  if (lower.includes('designer')) return '🎨';
  if (lower.includes('devops')) return '🚀';
  if (lower.includes('research')) return '🔬';
  if (lower.includes('writer')) return '✍️';
  return '🤖';
}
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-2xl border border-gray-800/60 bg-surface-card">
      <div class="border-b border-gray-800/50 px-4 py-3 sm:px-6 sm:py-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="section-title">Agent Definitions</h2>
            <p class="section-subtitle">Agents configured in shazam.yaml</p>
          </div>
          <span class="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-gray-500">
            {{ agentEntries.length }}
          </span>
        </div>
      </div>
      <div class="divide-y divide-gray-800/40">
        <div
          v-for="[name, agent] in agentEntries"
          :key="name"
          class="agent-row px-4 py-3.5 transition-colors duration-150 hover:bg-gray-800/10 sm:px-6 sm:py-4"
        >
          <!-- Top row: name + badges -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <span class="text-base">{{ roleIcon(agent.role) }}</span>
              <div>
                <p class="text-sm font-semibold text-gray-200">{{ name }}</p>
                <p class="text-xs text-gray-500 capitalize">{{ agent.role.replace(/_/g, ' ') }}</p>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-1.5">
              <span v-if="agent.provider" class="badge bg-shazam-500/10 text-shazam-400 ring-1 ring-shazam-500/20">{{ agent.provider }}</span>
              <span v-if="agent.model" class="badge bg-gray-800/80 text-gray-400 ring-1 ring-gray-700/30">{{ agent.model }}</span>
            </div>
          </div>

          <!-- Detail grid -->
          <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div class="rounded-lg bg-surface p-2.5">
              <p class="micro-label">Supervisor</p>
              <p class="mt-0.5 text-xs text-gray-400">{{ agent.supervisor ?? 'Top-level' }}</p>
            </div>
            <div class="rounded-lg bg-surface p-2.5">
              <p class="micro-label">Domain</p>
              <p class="mt-0.5 text-xs text-gray-400">{{ agent.domain ?? 'Unrestricted' }}</p>
            </div>
            <div class="rounded-lg bg-surface p-2.5">
              <p class="micro-label">Budget</p>
              <p class="mt-0.5 text-xs tabular-nums text-gray-400">{{ agent.budget?.toLocaleString() ?? '100,000' }} tok</p>
            </div>
            <div class="rounded-lg bg-surface p-2.5">
              <p class="micro-label">Workspace</p>
              <p class="mt-0.5 text-xs text-gray-400">{{ agent.workspace ?? 'Default' }}</p>
            </div>
          </div>

          <!-- Tools -->
          <div v-if="agent.tools?.length" class="mt-2.5 flex flex-wrap gap-1">
            <span
              v-for="tool in agent.tools"
              :key="tool"
              class="inline-flex rounded-md bg-gray-800/60 px-1.5 py-0.5 text-[10px] text-gray-500 ring-1 ring-gray-700/20"
            >{{ tool }}</span>
          </div>
        </div>
        <div v-if="agentEntries.length === 0" class="px-6 py-12 text-center text-sm text-gray-500">
          No agents configured.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-row {
  animation: rowIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes rowIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
