<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  /** Show a more prominent full-section loader with pulsing background */
  prominent?: boolean;
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  label: 'Loading...',
  prominent: false,
});

const sizeMap = {
  sm: { spinner: 'h-4 w-4', ring: 'h-6 w-6' },
  md: { spinner: 'h-7 w-7', ring: 'h-10 w-10' },
  lg: { spinner: 'h-10 w-10', ring: 'h-14 w-14' },
} as const;

function sizeClasses(s: 'sm' | 'md' | 'lg') {
  return sizeMap[s];
}
</script>

<template>
  <div
    class="loading-spinner flex flex-col items-center justify-center gap-3 py-8"
    :class="prominent ? 'py-16' : ''"
    role="status"
    aria-live="polite"
  >
    <!-- Spinner with outer glow ring -->
    <div class="relative">
      <!-- Outer pulse ring -->
      <div
        class="absolute inset-0 rounded-full opacity-20 animate-ping"
        :class="[sizeClasses(size).ring, 'bg-shazam-500']"
        style="animation-duration: 2s;"
      />

      <!-- Main spinner -->
      <svg
        class="animate-spin text-shazam-500 drop-shadow-sm"
        :class="sizeClasses(size).spinner"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-15"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="3"
        />
        <path
          class="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>

    <!-- Label with subtle fade animation -->
    <span
      v-if="label"
      class="text-sm text-gray-500 animate-pulse-soft"
    >
      {{ label }}
    </span>
  </div>
</template>

<style scoped>
.loading-spinner {
  animation: spinnerEntrance 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes spinnerEntrance {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
