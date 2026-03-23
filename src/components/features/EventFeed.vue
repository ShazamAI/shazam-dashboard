<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { eventTypeIcon, eventTypeLabel } from '@/composables/useEventFeed';
import AppButton from '@/components/common/Button.vue';
import type { FeedItem, EventType } from '@/types';

interface Props {
  items: readonly FeedItem[];
}

const props = defineProps<Props>();

const feedContainer = ref<HTMLElement | null>(null);
const autoScroll = ref(true);
const userScrolledUp = ref(false);

// ─── Event categorization ──────────────────────────────

type EventCategory = 'output' | 'tool' | 'success' | 'error' | 'status' | 'system';

function eventCategory(type: EventType): EventCategory {
  switch (type) {
    case 'agent_text_delta':
    case 'agent_text_complete':
    case 'agent_output':
      return 'output';
    case 'tool_use':
    case 'tool_result':
      return 'tool';
    case 'task_completed':
    case 'task_started':
    case 'task_created':
    case 'circuit_breaker_reset':
      return 'success';
    case 'task_failed':
    case 'circuit_breaker_tripped':
      return 'error';
    case 'task_status_change':
    case 'agent_status_change':
    case 'metrics_update':
      return 'status';
    default:
      return 'system';
  }
}

function badgeClass(type: EventType): string {
  const cat = eventCategory(type);
  switch (cat) {
    case 'output': return 'bg-shazam-500/10 text-shazam-400 ring-1 ring-shazam-500/20';
    case 'tool': return 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20';
    case 'success': return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20';
    case 'error': return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20';
    case 'status': return 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20';
    default: return 'bg-gray-500/10 text-gray-400 ring-1 ring-gray-500/20';
  }
}

function timelineDotClass(type: EventType): string {
  const cat = eventCategory(type);
  switch (cat) {
    case 'output': return 'bg-shazam-400';
    case 'tool': return 'bg-amber-400';
    case 'success': return 'bg-emerald-400';
    case 'error': return 'bg-red-400';
    case 'status': return 'bg-cyan-400';
    default: return 'bg-gray-500';
  }
}

function eventRowAccent(item: FeedItem): string {
  if (item.isStreaming) return 'border-l-shazam-500/40 bg-shazam-500/[0.02]';
  const cat = eventCategory(item.type);
  if (cat === 'error') return 'border-l-red-500/40 bg-red-500/[0.02]';
  if (cat === 'success') return 'border-l-emerald-500/40';
  return 'border-l-transparent';
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '--:--:--';
  }
}

// ─── Stats ─────────────────────────────────────────────

const eventStats = computed(() => {
  let errors = 0;
  let tools = 0;
  let outputs = 0;
  for (const item of props.items) {
    const cat = eventCategory(item.type);
    if (cat === 'error') errors++;
    else if (cat === 'tool') tools++;
    else if (cat === 'output') outputs++;
  }
  return { errors, tools, outputs, total: props.items.length };
});

// ─── Scroll management ─────────────────────────────────

function handleScroll() {
  if (!feedContainer.value) return;
  const el = feedContainer.value;
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  userScrolledUp.value = !atBottom;
  autoScroll.value = atBottom;
}

function scrollToBottom() {
  if (!feedContainer.value) return;
  feedContainer.value.scrollTo({
    top: feedContainer.value.scrollHeight,
    behavior: 'smooth',
  });
  autoScroll.value = true;
  userScrolledUp.value = false;
}

watch(
  () => props.items.length,
  async () => {
    if (autoScroll.value) {
      await nextTick();
      if (feedContainer.value) {
        feedContainer.value.scrollTop = feedContainer.value.scrollHeight;
      }
    }
  }
);

watch(
  () => {
    const last = props.items[props.items.length - 1];
    return last?.content.length ?? 0;
  },
  async () => {
    if (autoScroll.value) {
      await nextTick();
      if (feedContainer.value) {
        feedContainer.value.scrollTop = feedContainer.value.scrollHeight;
      }
    }
  }
);

onMounted(() => {
  if (feedContainer.value) {
    feedContainer.value.addEventListener('scroll', handleScroll, { passive: true });
  }
});

onUnmounted(() => {
  if (feedContainer.value) {
    feedContainer.value.removeEventListener('scroll', handleScroll);
  }
});
</script>

<template>
  <div class="event-feed card relative flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-800 px-3 py-2.5 sm:px-4 sm:py-3">
      <div class="flex items-center gap-2.5">
        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-shazam-500/10 ring-1 ring-shazam-500/20">
          <svg class="h-3.5 w-3.5 text-shazam-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 class="section-title text-sm">Live Event Feed</h2>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Mini stats -->
        <div class="hidden items-center gap-1.5 sm:flex">
          <span v-if="eventStats.errors > 0" class="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-red-400">
            {{ eventStats.errors }} err
          </span>
          <span class="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-gray-500">
            {{ eventStats.total }}
          </span>
        </div>

        <AppButton
          v-if="userScrolledUp"
          variant="primary"
          size="xs"
          @click="scrollToBottom"
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          Latest
        </AppButton>
      </div>
    </div>

    <!-- Feed body -->
    <div
      ref="feedContainer"
      class="feed-scroll flex-1 overflow-y-auto"
      style="max-height: min(520px, 60vh); min-height: 200px"
    >
      <!-- Empty state -->
      <div v-if="items.length === 0" class="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-800/50">
          <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-400">Waiting for events</p>
          <p class="mt-0.5 text-xs text-gray-600">Events will appear here in real time</p>
        </div>
      </div>

      <!-- Event list with timeline -->
      <div v-else class="relative">
        <div
          v-for="(item, index) in items"
          :key="item.id"
          class="event-row group relative border-l-2 transition-colors duration-200 hover:bg-gray-800/20"
          :class="eventRowAccent(item)"
        >
          <div class="flex gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
            <!-- Timeline dot -->
            <div class="relative mt-1.5 flex shrink-0 flex-col items-center">
              <span
                class="timeline-dot h-2 w-2 rounded-full ring-2 ring-surface-card"
                :class="[
                  timelineDotClass(item.type),
                  item.isStreaming ? 'animate-pulse' : '',
                ]"
              />
              <!-- Timeline line -->
              <div
                v-if="index < items.length - 1"
                class="mt-1 w-px flex-1 bg-gray-800/60"
                style="min-height: 8px"
              />
            </div>

            <!-- Icon -->
            <div class="mt-0.5 hidden shrink-0 sm:block">
              <div
                class="flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-200"
                :class="badgeClass(item.type).replace('ring-1', '')"
              >
                <svg
                  class="h-3 w-3"
                  :class="eventTypeIcon(item.type).color"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" :d="eventTypeIcon(item.type).path" />
                </svg>
              </div>
            </div>

            <!-- Content -->
            <div class="min-w-0 flex-1">
              <!-- Meta row -->
              <div class="mb-0.5 flex flex-wrap items-center gap-1 sm:gap-1.5">
                <span
                  class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider sm:text-[10px]"
                  :class="badgeClass(item.type)"
                >
                  {{ eventTypeLabel(item.type) }}
                </span>
                <span v-if="item.agent" class="text-[11px] font-semibold text-shazam-400 sm:text-xs">
                  {{ item.agent }}
                </span>
                <span v-if="item.taskId" class="hidden truncate text-[10px] font-mono text-gray-600 sm:inline">
                  {{ item.taskId }}
                </span>
                <span class="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-gray-600">
                  {{ formatTime(item.timestamp) }}
                </span>
              </div>

              <!-- Event content -->
              <div class="relative">
                <p
                  class="whitespace-pre-wrap break-words text-xs leading-relaxed"
                  :class="item.isStreaming ? 'text-gray-200' : 'text-gray-400'"
                >{{ item.content }}<span
                    v-if="item.isStreaming"
                    class="streaming-cursor ml-0.5 inline-block h-3.5 w-1.5 rounded-sm bg-shazam-400"
                  /></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll paused overlay -->
    <Transition name="v-fade-up">
      <div
        v-if="userScrolledUp"
        class="absolute bottom-0 left-0 right-0 pointer-events-none"
      >
        <div class="bg-gradient-to-t from-surface-card via-surface-card/80 to-transparent pb-3 pt-10 text-center">
          <button
            class="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-gray-700/50 bg-gray-800/90 px-3.5 py-1.5 text-[10px] font-medium text-gray-300 shadow-lg backdrop-blur-sm transition-all hover:border-shazam-500/30 hover:text-shazam-400"
            @click="scrollToBottom"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            New events below
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.event-feed {
  animation: feedIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes feedIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* New event entrance */
.event-row {
  animation: eventSlideIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes eventSlideIn {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Streaming cursor blink */
.streaming-cursor {
  animation: cursorBlink 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Timeline dot pulse for active events */
.timeline-dot {
  transition: transform 0.2s ease;
}

.event-row:hover .timeline-dot {
  transform: scale(1.3);
}

/* Feed scroll styling */
.feed-scroll {
  scrollbar-width: thin;
  scrollbar-color: #27272a transparent;
}

.feed-scroll::-webkit-scrollbar {
  width: 4px;
}

.feed-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.feed-scroll::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 2px;
}

.feed-scroll::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
</style>
