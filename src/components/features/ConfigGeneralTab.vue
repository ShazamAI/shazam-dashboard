<script setup lang="ts">
import type { ShazamConfig, DomainConfig } from '@/types';

interface Props {
  config: ShazamConfig;
  domainEntries: [string, DomainConfig][];
}

defineProps<Props>();
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <!-- Company Information -->
    <div class="rounded-2xl border border-gray-800/60 bg-surface-card">
      <div class="border-b border-gray-800/50 px-4 py-3 sm:px-6 sm:py-4">
        <h2 class="section-title">Company Information</h2>
      </div>
      <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 sm:gap-5">
        <div class="rounded-xl border border-gray-800/40 bg-surface p-3.5 sm:p-4">
          <p class="micro-label mb-1.5">Name</p>
          <p class="text-sm font-medium text-gray-200">{{ config.company?.name ?? 'Not set' }}</p>
        </div>
        <div class="rounded-xl border border-gray-800/40 bg-surface p-3.5 sm:p-4">
          <p class="micro-label mb-1.5">Mission</p>
          <p class="text-sm text-gray-300">{{ config.company?.mission ?? 'Not set' }}</p>
        </div>
        <div class="rounded-xl border border-gray-800/40 bg-surface p-3.5 sm:p-4">
          <p class="micro-label mb-1.5">Workspace Path</p>
          <p class="truncate font-mono text-xs text-gray-400">{{ config.company?.workspace ?? 'CWD' }}</p>
        </div>
        <div class="rounded-xl border border-gray-800/40 bg-surface p-3.5 sm:p-4">
          <p class="micro-label mb-1.5">Provider</p>
          <span class="inline-flex items-center gap-1.5 rounded-lg bg-shazam-500/10 px-2.5 py-1 text-xs font-semibold text-shazam-400 ring-1 ring-shazam-500/20">
            <span class="h-1.5 w-1.5 rounded-full bg-shazam-400" />
            {{ config.provider ?? 'claude_code' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Domains -->
    <div v-if="domainEntries.length > 0" class="rounded-2xl border border-gray-800/60 bg-surface-card">
      <div class="border-b border-gray-800/50 px-4 py-3 sm:px-6 sm:py-4">
        <div class="flex items-center justify-between">
          <h2 class="section-title">Domains</h2>
          <span class="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-gray-500">
            {{ domainEntries.length }}
          </span>
        </div>
      </div>
      <div class="divide-y divide-gray-800/40">
        <div
          v-for="[name, domain] in domainEntries"
          :key="name"
          class="flex flex-col gap-2 px-4 py-3.5 transition-colors duration-150 hover:bg-gray-800/10 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-200">{{ name }}</p>
            <p class="text-xs text-gray-500">{{ domain.description }}</p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="p in domain.paths"
              :key="p"
              class="inline-flex rounded-lg bg-gray-800/60 px-2 py-0.5 font-mono text-[10px] text-gray-400 ring-1 ring-gray-700/30"
            >{{ p }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
