<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { routes } from '@/router';
import { useSidebar } from '@/composables/useSidebar';

const route = useRoute();
const { isCollapsed, toggle } = useSidebar();

const navItems = computed(() =>
  routes
    .filter((r) => r.meta?.icon)
    .map((r) => ({
      name: r.name as string,
      path: r.path,
      title: (r.meta?.title as string) ?? (r.name as string),
      icon: (r.meta?.icon as string) ?? '',
      isActive: route.name === r.name,
    }))
);

const iconMap: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
  tasks: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  agents: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  'org-chart': 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zm8 0a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1h-6a1 1 0 01-1-1v-2z',
  config: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  metrics: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  sessions: 'M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z',
  memory: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
};
</script>

<template>
  <aside
    class="sidebar hidden flex-col border-r border-gray-800 bg-gray-900 transition-all duration-300 ease-bounce-in md:flex"
    :class="isCollapsed ? 'w-[68px]' : 'w-64'"
  >
    <!-- Logo row -->
    <div
      class="flex h-16 shrink-0 items-center gap-2.5 border-b border-gray-800/50 px-4"
      :class="isCollapsed ? 'justify-center px-2' : ''"
    >
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-gray-950 shadow-glow-sm transition-transform duration-300 hover:scale-105">
        S
      </div>
      <Transition name="brand-text">
        <div v-if="!isCollapsed" class="flex items-baseline gap-1.5 overflow-hidden">
          <span class="text-lg font-bold tracking-tight text-white">Shazam</span>
          <span class="text-[10px] font-medium text-shazam-500">.dev</span>
        </div>
      </Transition>
    </div>

    <!-- Nav links -->
    <nav class="flex-1 space-y-0.5 overflow-y-auto px-2 py-4 scrollbar-none">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        class="nav-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 min-h-[44px]"
        :class="[
          item.isActive
            ? 'bg-shazam-500/10 text-shazam-400'
            : 'text-gray-500 hover:bg-gray-800/70 hover:text-gray-200',
          isCollapsed ? 'justify-center px-2' : '',
        ]"
        :title="isCollapsed ? item.title : undefined"
      >
        <!-- Active indicator bar -->
        <span
          v-if="item.isActive"
          class="active-indicator absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-shazam-400 transition-all duration-300"
        />

        <svg
          class="h-5 w-5 shrink-0 transition-colors duration-200"
          :class="item.isActive ? 'text-shazam-400' : 'text-gray-600 group-hover:text-gray-400'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            :d="iconMap[item.icon] ?? iconMap['home']"
          />
        </svg>

        <Transition name="nav-text">
          <span v-if="!isCollapsed" class="truncate">{{ item.title }}</span>
        </Transition>

        <!-- Tooltip for collapsed mode -->
        <Transition name="tooltip">
          <span
            v-if="isCollapsed"
            class="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-white shadow-elevation-3 group-hover:block"
          >
            {{ item.title }}
          </span>
        </Transition>
      </router-link>
    </nav>

    <!-- Footer: collapse toggle + version -->
    <div class="shrink-0 border-t border-gray-800/50 px-2 py-3">
      <button
        class="flex w-full items-center justify-center rounded-xl p-2.5 text-gray-600 transition-all duration-200 hover:bg-gray-800/70 hover:text-gray-400 active:scale-95"
        :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggle"
      >
        <svg
          class="h-4 w-4 transition-transform duration-300"
          :class="isCollapsed ? 'rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          stroke-width="1.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
        </svg>
      </button>
      <Transition name="brand-text">
        <p v-if="!isCollapsed" class="mt-1.5 px-2 text-center text-[10px] text-gray-700">
          v0.1.0
        </p>
      </Transition>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  box-shadow: 1px 0 0 rgba(39, 39, 42, 0.3);
}

/* Active indicator entrance */
.active-indicator {
  animation: indicator-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes indicator-in {
  from {
    opacity: 0;
    height: 0;
  }
  to {
    opacity: 1;
    height: 1.25rem;
  }
}

/* Nav text transitions */
.nav-text-enter-active {
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.nav-text-leave-active {
  transition: all 0.15s ease-in;
}
.nav-text-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}
.nav-text-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

/* Brand text transitions */
.brand-text-enter-active {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.brand-text-leave-active {
  transition: all 0.15s ease-in;
}
.brand-text-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}
.brand-text-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

/* Tooltip */
.tooltip-enter-active {
  transition: all 0.15s ease-out;
}
.tooltip-leave-active {
  transition: all 0.1s ease-in;
}
.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}
</style>
