<script setup lang="ts">
interface Props {
  title: string;
  description?: string;
  icon?: string;
}

withDefaults(defineProps<Props>(), {
  description: '',
  icon: 'inbox',
});
</script>

<template>
  <div class="empty-state flex flex-col items-center justify-center py-16 text-center">
    <!-- Icon with subtle float animation -->
    <div class="empty-icon mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-800 bg-surface-card">
      <svg
        class="h-8 w-8 text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        stroke-width="1"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    </div>

    <h3 class="text-lg font-semibold text-gray-300">{{ title }}</h3>
    <p v-if="description" class="mt-1.5 max-w-sm text-sm text-gray-500">{{ description }}</p>

    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  animation: emptyEntrance 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes emptyEntrance {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.empty-icon {
  animation: emptyFloat 4s ease-in-out infinite;
}

@keyframes emptyFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
</style>
