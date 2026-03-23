<script setup lang="ts">
interface Props {
  techStackEntries: [string, string | Record<string, string>][];
}

defineProps<Props>();

function techIcon(key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes('language') || lower.includes('typescript') || lower.includes('javascript')) return '📝';
  if (lower.includes('framework') || lower.includes('vue') || lower.includes('react')) return '🏗️';
  if (lower.includes('build') || lower.includes('vite') || lower.includes('webpack')) return '📦';
  if (lower.includes('style') || lower.includes('css') || lower.includes('tailwind')) return '🎨';
  if (lower.includes('test')) return '🧪';
  if (lower.includes('database') || lower.includes('db')) return '🗄️';
  return '⚙️';
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-gray-800/60 bg-surface-card">
      <div class="border-b border-gray-800/50 px-4 py-3 sm:px-6 sm:py-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="section-title">Tech Stack</h2>
            <p class="section-subtitle">Detected or configured technology stack</p>
          </div>
          <span class="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-gray-500">
            {{ techStackEntries.length }}
          </span>
        </div>
      </div>
      <div class="divide-y divide-gray-800/40">
        <div
          v-for="[key, value] in techStackEntries"
          :key="key"
          class="px-4 py-3.5 transition-colors duration-150 hover:bg-gray-800/10 sm:px-6 sm:py-4"
        >
          <!-- Simple string value -->
          <template v-if="typeof value === 'string'">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="text-sm">{{ techIcon(key) }}</span>
                <p class="text-sm font-medium capitalize text-gray-300">{{ key }}</p>
              </div>
              <span class="inline-flex rounded-lg bg-gray-800/60 px-2.5 py-1 font-mono text-xs text-gray-400 ring-1 ring-gray-700/30">
                {{ value }}
              </span>
            </div>
          </template>

          <!-- Object value (nested stack) -->
          <template v-else>
            <div class="mb-3 flex items-center gap-2.5">
              <span class="text-sm">{{ techIcon(key) }}</span>
              <p class="text-sm font-semibold capitalize text-gray-200">{{ key }}</p>
            </div>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div
                v-for="[subKey, subVal] in Object.entries(value)"
                :key="subKey"
                class="rounded-xl border border-gray-800/40 bg-surface p-3"
              >
                <p class="micro-label capitalize">{{ subKey }}</p>
                <p class="mt-1 text-xs text-gray-400">{{ subVal }}</p>
              </div>
            </div>
          </template>
        </div>
        <div v-if="techStackEntries.length === 0" class="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span class="text-2xl">🔧</span>
          <p class="text-sm text-gray-500">No tech stack configured</p>
          <p class="text-xs text-gray-600">
            Run <code class="rounded-md bg-gray-800 px-1.5 py-0.5 font-mono text-shazam-400">shazam init</code> to auto-detect
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
