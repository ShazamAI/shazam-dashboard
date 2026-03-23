<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  error: string | null;
}

const props = defineProps<Props>();
const dismissed = ref(false);

// Reset dismissed state when error changes
watch(() => props.error, () => {
  dismissed.value = false;
});

function dismiss() {
  dismissed.value = true;
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-350 ease-bounce-in"
    enter-from-class="opacity-0 -translate-y-2 scale-[0.98]"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all duration-200 ease-bounce-out"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="props.error && !dismissed"
      class="mb-3 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 shadow-sm md:mb-4 md:px-4 md:py-3"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
          <svg
            class="h-4 w-4 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <p class="text-xs text-red-300 md:text-sm">{{ props.error }}</p>
      </div>
      <button
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400 transition-all duration-200 hover:bg-red-500/15 hover:text-red-300 active:scale-95"
        aria-label="Dismiss error"
        @click="dismiss"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>
