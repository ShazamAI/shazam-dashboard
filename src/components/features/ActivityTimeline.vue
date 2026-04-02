<script setup lang="ts">
import { computed } from 'vue';
import type { FeedItem } from '@/types';
import { formatTimelineTime } from '@/utils/formatters';

interface Props {
  items: readonly FeedItem[];
}

const props = defineProps<Props>();

const timelineItems = computed(() =>
  [...props.items]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      type: item.type,
      agent: item.agent,
      content: item.content,
      timestamp: item.timestamp,
    })),
);

function getDotColor(type: string | undefined | null): string {
  const t = type ?? '';
  if (t.includes('failed') || t.includes('error') || t === 'circuit_breaker_tripped') return 'bg-red-500';
  if (t.includes('completed') || t === 'circuit_breaker_reset') return 'bg-emerald-500';
  if (t.includes('started') || t.includes('created')) return 'bg-shazam-500';
  if (t.includes('tool')) return 'bg-purple-500';
  if (t.includes('agent')) return 'bg-blue-500';
  return 'bg-gray-500';
}

function getDotBorder(type: string | undefined | null): string {
  const t = type ?? '';
  if (t.includes('failed') || t.includes('error') || t === 'circuit_breaker_tripped') return 'ring-red-500/20';
  if (t.includes('completed') || t === 'circuit_breaker_reset') return 'ring-emerald-500/20';
  if (t.includes('started') || t.includes('created')) return 'ring-shazam-500/20';
  return 'ring-gray-500/20';
}
</script>

<template>
  <div class="rounded-2xl border border-gray-800 bg-surface-card p-4">
    <h3 class="mb-3 text-sm font-semibold text-white">Activity Timeline</h3>

    <div v-if="timelineItems.length === 0" class="py-4 text-center text-xs text-gray-600">
      No recent activity
    </div>

    <div v-else class="relative space-y-0">
      <!-- Timeline line -->
      <div class="absolute left-[11px] top-2 bottom-2 w-px bg-gray-800" />

      <div
        v-for="(event, idx) in timelineItems"
        :key="event.id"
        class="relative flex gap-3 pb-3"
        :class="{ 'pb-0': idx === timelineItems.length - 1 }"
      >
        <!-- Dot -->
        <div
          class="relative z-10 mt-1 h-[9px] w-[9px] shrink-0 rounded-full ring-2"
          :class="[getDotColor(event.type), getDotBorder(event.type)]"
          style="margin-left: 4.5px;"
        />

        <div class="min-w-0 flex-1 -mt-0.5">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono text-gray-600">{{ formatTimelineTime(event.timestamp) }}</span>
            <span
              v-if="event.agent"
              class="truncate rounded bg-gray-800/80 px-1.5 py-0.5 text-[10px] text-gray-400"
              :title="event.agent"
            >
              {{ event.agent }}
            </span>
            <span class="rounded bg-gray-800/50 px-1.5 py-0.5 text-[10px] text-gray-500">
              {{ (event.type ?? '').replace(/_/g, ' ') }}
            </span>
          </div>
          <p class="mt-0.5 truncate text-[11px] text-gray-400" :title="event.content">{{ event.content }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
