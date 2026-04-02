<script setup lang="ts">
import { ref, computed } from 'vue';
import type { OrgChartNode } from '@/types';

interface Props {
  node: OrgChartNode;
  depth?: number;
  isLast?: boolean;
  totalSiblings?: number;
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  isLast: false,
  totalSiblings: 1,
});

const emit = defineEmits<{
  select: [name: string];
}>();

const isExpanded = ref(true);
const isHovered = ref(false);

const hasChildren = computed(() => props.node.reports && props.node.reports.length > 0);

function toggleExpand(e: Event) {
  e.stopPropagation();
  isExpanded.value = !isExpanded.value;
}

function handleSelect(name: string) {
  emit('select', name);
}

// Domain color mapping
const DOMAIN_COLORS: Record<string, { border: string; bg: string; text: string; glow: string; dot: string }> = {
  dashboard: { border: 'border-l-violet-500', bg: 'bg-violet-500/8', text: 'text-violet-400', glow: 'shadow-violet-500/20', dot: 'bg-violet-400' },
  vscode: { border: 'border-l-sky-500', bg: 'bg-sky-500/8', text: 'text-sky-400', glow: 'shadow-sky-500/20', dot: 'bg-sky-400' },
  backend: { border: 'border-l-emerald-500', bg: 'bg-emerald-500/8', text: 'text-emerald-400', glow: 'shadow-emerald-500/20', dot: 'bg-emerald-400' },
  frontend: { border: 'border-l-violet-500', bg: 'bg-violet-500/8', text: 'text-violet-400', glow: 'shadow-violet-500/20', dot: 'bg-violet-400' },
  infrastructure: { border: 'border-l-orange-500', bg: 'bg-orange-500/8', text: 'text-orange-400', glow: 'shadow-orange-500/20', dot: 'bg-orange-400' },
  design: { border: 'border-l-pink-500', bg: 'bg-pink-500/8', text: 'text-pink-400', glow: 'shadow-pink-500/20', dot: 'bg-pink-400' },
  research: { border: 'border-l-cyan-500', bg: 'bg-cyan-500/8', text: 'text-cyan-400', glow: 'shadow-cyan-500/20', dot: 'bg-cyan-400' },
  qa: { border: 'border-l-amber-500', bg: 'bg-amber-500/8', text: 'text-amber-400', glow: 'shadow-amber-500/20', dot: 'bg-amber-400' },
  management: { border: 'border-l-shazam-500', bg: 'bg-shazam-500/8', text: 'text-shazam-400', glow: 'shadow-shazam-500/20', dot: 'bg-shazam-400' },
};

const DEFAULT_DOMAIN_COLOR = { border: 'border-l-gray-600', bg: 'bg-gray-500/8', text: 'text-gray-400', glow: 'shadow-gray-500/10', dot: 'bg-gray-500' };

function getDomainColor(domain: string | null) {
  if (!domain) return DEFAULT_DOMAIN_COLOR;
  const key = domain.toLowerCase().trim();
  return DOMAIN_COLORS[key] ?? DEFAULT_DOMAIN_COLOR;
}

const domainColor = computed(() => getDomainColor(props.node.domain));

// Role icon mapping
function roleIcon(role: string): string {
  const lower = role.toLowerCase();
  if (lower.includes('manager') || lower === 'pm') return '👔';
  if (lower.includes('senior')) return '⚡';
  if (lower.includes('junior')) return '🌱';
  if (lower.includes('qa')) return '🔍';
  if (lower.includes('designer')) return '🎨';
  if (lower.includes('devops')) return '⚙️';
  if (lower.includes('researcher')) return '🔬';
  if (lower.includes('writer')) return '✍️';
  if (lower.includes('reviewer')) return '📋';
  return '🤖';
}

// Status styling
function statusConfig(status: string): { dot: string; label: string; ring: string } {
  switch (status) {
    case 'busy':
    case 'working':
      return { dot: 'bg-amber-400 animate-pulse', label: 'Working', ring: 'ring-amber-400/30' };
    case 'executing':
      return { dot: 'bg-cyan-400 animate-pulse', label: 'Executing', ring: 'ring-cyan-400/30' };
    case 'waiting':
      return { dot: 'bg-yellow-400 animate-pulse', label: 'Waiting', ring: 'ring-yellow-400/30' };
    case 'idle':
      return { dot: 'bg-emerald-400', label: 'Idle', ring: 'ring-emerald-400/20' };
    case 'error':
      return { dot: 'bg-red-500 animate-pulse', label: 'Error', ring: 'ring-red-500/30' };
    case 'offline':
      return { dot: 'bg-gray-600', label: 'Offline', ring: 'ring-gray-600/20' };
    case 'paused':
      return { dot: 'bg-gray-500', label: 'Paused', ring: 'ring-gray-500/20' };
    default:
      return { dot: 'bg-gray-500', label: status, ring: 'ring-gray-500/20' };
  }
}

const status = computed(() => statusConfig(props.node.status));

function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
</script>

<template>
  <div class="org-tree-node flex flex-col items-center">
    <!-- Node Card — responsive sizing with 44px min touch target -->
    <div
      class="org-card group relative cursor-pointer rounded-2xl border border-gray-800/80 border-l-[3px] bg-surface-card px-3 py-3 transition-all duration-300 min-w-[160px] max-w-[200px] sm:min-w-[200px] sm:max-w-[240px] sm:px-5 sm:py-4"
      :class="[
        domainColor.border,
        isHovered ? 'border-gray-700/80 shadow-lg scale-[1.03] -translate-y-0.5' : 'shadow-md',
        isHovered ? domainColor.glow : '',
      ]"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
      @click="handleSelect(node.name)"
    >
      <!-- Status ring indicator -->
      <div
        class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 bg-surface-card"
        :class="status.ring"
      >
        <span class="h-2.5 w-2.5 rounded-full" :class="status.dot" />
      </div>

      <!-- Role icon + Name -->
      <div class="flex items-center gap-2 mb-1.5 sm:gap-2.5 sm:mb-2">
        <div
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition-transform duration-300 sm:h-9 sm:w-9 sm:rounded-xl sm:text-base"
          :class="[domainColor.bg, isHovered ? 'scale-110' : '']"
        >
          {{ roleIcon(node.role) }}
        </div>
        <div class="min-w-0 flex-1">
          <h4 class="truncate text-xs font-semibold text-white leading-tight sm:text-sm">{{ node.name }}</h4>
          <p class="truncate text-[10px] font-medium sm:text-[11px]" :class="domainColor.text">
            {{ formatRole(node.role) }}
          </p>
        </div>
      </div>

      <!-- Domain badge -->
      <div class="flex items-center gap-1.5 mt-0.5 sm:gap-2 sm:mt-1">
        <span
          v-if="node.domain"
          class="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-medium tracking-wide uppercase sm:gap-1 sm:px-2 sm:text-[10px]"
          :class="[domainColor.bg, domainColor.text]"
        >
          <span class="h-1.5 w-1.5 rounded-full" :class="domainColor.dot" />
          {{ node.domain }}
        </span>
        <span
          class="ml-auto inline-flex items-center rounded-md px-1 py-0.5 text-[9px] font-medium sm:px-1.5 sm:text-[10px]"
          :class="{
            'bg-emerald-500/10 text-emerald-400': node.status === 'idle',
            'bg-amber-500/10 text-amber-400': node.status === 'busy' || node.status === 'working',
            'bg-cyan-500/10 text-cyan-400': node.status === 'executing',
            'bg-yellow-500/10 text-yellow-400': node.status === 'waiting',
            'bg-red-500/10 text-red-400': node.status === 'error',
            'bg-gray-500/10 text-gray-500': node.status === 'paused' || node.status === 'offline',
          }"
        >
          {{ status.label }}
        </span>
      </div>

      <!-- Subagent mini-nodes -->
      <div v-if="node.subagents?.length" class="flex flex-col items-center mt-2 sm:mt-2.5">
        <div class="h-2.5 w-px bg-gray-700/60" />
        <div class="flex flex-wrap justify-center gap-1 max-w-full">
          <div
            v-for="sa in node.subagents"
            :key="sa"
            class="flex items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/5 px-1.5 py-0.5 transition-colors duration-200 hover:border-purple-500/40 hover:bg-purple-500/10"
            :title="sa"
          >
            <span class="text-[7px] text-purple-400/70 font-medium sm:text-[8px]">{{ sa }}</span>
          </div>
        </div>
      </div>

      <!-- Expand/Collapse toggle — larger on mobile for touch -->
      <button
        v-if="hasChildren"
        class="absolute -bottom-3.5 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-gray-400 transition-all duration-300 hover:border-shazam-500 hover:text-shazam-400 hover:shadow-md hover:shadow-shazam-500/20 sm:h-6 sm:w-6 sm:-bottom-3"
        @click="toggleExpand"
      >
        <svg
          class="h-3 w-3 transition-transform duration-300"
          :class="{ 'rotate-180': !isExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <!-- Children Section with Animation -->
    <template v-if="hasChildren">
      <Transition name="org-expand">
        <div v-show="isExpanded" class="org-children-container flex flex-col items-center">
          <!-- Vertical connector from parent -->
          <div class="org-connector-v h-8 w-px bg-gradient-to-b from-gray-700 to-gray-800" />

          <!-- Horizontal connector bar -->
          <div
            v-if="node.reports.length > 1"
            class="org-connector-h h-px rounded-full bg-gradient-to-r from-transparent via-gray-700 to-transparent"
            :style="{ width: `${Math.max((node.reports.length - 1) * 220, 200)}px` }"
          />

          <!-- Children nodes — tighter gap on mobile -->
          <div class="flex items-start gap-2 sm:gap-4">
            <div
              v-for="(child, idx) in node.reports"
              :key="child.name"
              class="flex flex-col items-center"
            >
              <!-- Vertical line from horizontal bar to child -->
              <div
                v-if="node.reports.length > 1"
                class="h-5 w-px bg-gradient-to-b from-gray-700 to-gray-800"
              />

              <!-- Recursive child -->
              <OrgTreeNode
                :node="child"
                :depth="depth + 1"
                :is-last="idx === node.reports.length - 1"
                :total-siblings="node.reports.length"
                @select="handleSelect"
              />
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
/* Expand/Collapse animation */
.org-expand-enter-active {
  animation: orgExpandIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.org-expand-leave-active {
  animation: orgExpandOut 0.25s cubic-bezier(0.55, 0, 1, 0.45);
}

@keyframes orgExpandIn {
  0% {
    opacity: 0;
    transform: translateY(-12px) scaleY(0.85);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }
}

@keyframes orgExpandOut {
  0% {
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-8px) scaleY(0.9);
  }
}

/* Card entrance stagger */
.org-tree-node {
  animation: orgNodeIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

@keyframes orgNodeIn {
  0% {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Connector pulse on hover */
.org-card:hover ~ .org-children-container .org-connector-v {
  background: linear-gradient(to bottom, theme('colors.shazam.400 / 0.27'), transparent);
}
</style>
