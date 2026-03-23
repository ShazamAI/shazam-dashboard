<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import type { ToastType } from '@/composables/useToast';

const { toasts, remove } = useToast();

function typeClasses(type: ToastType): string {
  switch (type) {
    case 'success': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'error': return 'border-red-500/30 bg-red-500/10 text-red-300';
    case 'warning': return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
    case 'info': return 'border-shazam-500/30 bg-shazam-500/10 text-shazam-300';
  }
}

function typeIcon(type: ToastType): string {
  switch (type) {
    case 'success': return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    case 'error': return 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z';
    case 'warning': return 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z';
    case 'info': return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
}

function iconBgClass(type: ToastType): string {
  switch (type) {
    case 'success': return 'bg-emerald-500/15';
    case 'error': return 'bg-red-500/15';
    case 'warning': return 'bg-yellow-500/15';
    case 'info': return 'bg-shazam-500/15';
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-350 ease-bounce-in"
        enter-from-class="translate-x-[120%] opacity-0 scale-95"
        enter-to-class="translate-x-0 opacity-100 scale-100"
        leave-active-class="transition-all duration-250 ease-bounce-out"
        leave-from-class="translate-x-0 opacity-100 scale-100"
        leave-to-class="translate-x-[120%] opacity-0 scale-95"
        move-class="transition-transform duration-300 ease-bounce-in"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item flex items-start gap-3 rounded-xl border px-4 py-3 shadow-elevation-3 backdrop-blur-sm"
          :class="typeClasses(toast.type)"
          role="alert"
        >
          <div
            class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
            :class="iconBgClass(toast.type)"
          >
            <svg
              class="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              stroke-width="1.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="typeIcon(toast.type)" />
            </svg>
          </div>
          <p class="flex-1 text-sm leading-relaxed">{{ toast.message }}</p>
          <button
            class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg opacity-50 transition-all duration-200 hover:opacity-100 hover:bg-white/10 active:scale-90"
            aria-label="Dismiss"
            @click="remove(toast.id)"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* Auto-dismiss progress bar */
.toast-item {
  position: relative;
  overflow: hidden;
}

.toast-item::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: currentColor;
  opacity: 0.2;
  animation: toastProgress 4s linear forwards;
}

@keyframes toastProgress {
  from { width: 100%; }
  to { width: 0%; }
}
</style>
