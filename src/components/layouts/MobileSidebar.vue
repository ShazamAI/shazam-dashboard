<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { routes } from '@/router';
import { useSidebar } from '@/composables/useSidebar';

const route = useRoute();
const { isMobileOpen, closeMobile } = useSidebar();

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
  sessions: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  memory: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
};

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMobile();
}

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition duration-250 ease-smooth"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-smooth"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobileOpen"
        class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        @click="closeMobile"
      />
    </Transition>

    <!-- Sidebar panel -->
    <Transition
      enter-active-class="transition duration-300 ease-bounce-in"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition duration-200 ease-bounce-out"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <aside
        v-if="isMobileOpen"
        class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-800 bg-gray-900 shadow-elevation-4 md:hidden"
      >
        <!-- Header -->
        <div class="flex h-16 items-center justify-between border-b border-gray-800/50 px-4">
          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-gray-950 shadow-glow-sm">
              S
            </div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-lg font-bold tracking-tight text-white">Shazam</span>
              <span class="text-[10px] font-medium text-shazam-500">.dev</span>
            </div>
          </div>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-all duration-200 hover:bg-gray-800 hover:text-white active:scale-95"
            aria-label="Close menu"
            @click="closeMobile"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Nav -->
        <nav class="flex-1 space-y-0.5 overflow-y-auto px-2 py-4 scrollbar-none">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="item.path"
            class="group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 min-h-[48px]"
            :class="
              item.isActive
                ? 'bg-shazam-500/10 text-shazam-400'
                : 'text-gray-500 hover:bg-gray-800/70 hover:text-gray-200'
            "
            @click="closeMobile"
          >
            <!-- Active indicator -->
            <span
              v-if="item.isActive"
              class="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-shazam-400"
            />

            <svg
              class="h-5 w-5 shrink-0 transition-colors duration-200"
              :class="item.isActive ? 'text-shazam-400' : 'text-gray-600 group-hover:text-gray-400'"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              stroke-width="1.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconMap[item.icon] ?? iconMap['home']" />
            </svg>
            <span>{{ item.title }}</span>
          </router-link>
        </nav>

        <!-- Footer -->
        <div class="border-t border-gray-800/50 px-4 py-3">
          <p class="text-[10px] text-gray-700">Shazam Dashboard v0.1.0</p>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
