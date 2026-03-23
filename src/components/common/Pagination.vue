<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /** Current active page (1-based) */
  page: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Items displayed per page */
  pageSize?: number;
  /** Maximum number of page buttons shown at once */
  maxVisiblePages?: number;
  /** Available page size options for the size selector. Pass empty array to hide selector. */
  pageSizeOptions?: number[];
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 10,
  maxVisiblePages: 5,
  pageSizeOptions: () => [10, 25, 50],
});

const emit = defineEmits<{
  'update:page': [page: number];
  'update:pageSize': [size: number];
}>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)));

const isFirstPage = computed(() => props.page <= 1);
const isLastPage = computed(() => props.page >= totalPages.value);

/** Range of items currently displayed, e.g. "1 - 10" */
const itemRange = computed(() => {
  const start = (props.page - 1) * props.pageSize + 1;
  const end = Math.min(props.page * props.pageSize, props.totalItems);
  return { start, end };
});

/** Visible page numbers with ellipsis markers (represented as -1) */
const visiblePages = computed<number[]>(() => {
  const total = totalPages.value;
  const max = props.maxVisiblePages;
  const current = props.page;

  if (total <= max) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: number[] = [];
  const half = Math.floor(max / 2);
  let start = Math.max(2, current - half);
  let end = Math.min(total - 1, current + half);

  // Adjust range when near edges
  if (current <= half + 1) {
    end = Math.min(total - 1, max - 1);
  } else if (current >= total - half) {
    start = Math.max(2, total - max + 2);
  }

  // Always include first page
  pages.push(1);

  // Leading ellipsis
  if (start > 2) {
    pages.push(-1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Trailing ellipsis
  if (end < total - 1) {
    pages.push(-1);
  }

  // Always include last page
  if (total > 1) {
    pages.push(total);
  }

  return pages;
});

function goToPage(page: number) {
  const clamped = Math.max(1, Math.min(page, totalPages.value));
  if (clamped !== props.page) {
    emit('update:page', clamped);
  }
}

function changePageSize(size: number) {
  emit('update:pageSize', size);
  // Reset to page 1 when page size changes
  emit('update:page', 1);
}
</script>

<template>
  <nav
    v-if="totalItems > 0"
    class="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
    aria-label="Pagination"
  >
    <!-- Item range summary -->
    <p class="text-xs text-gray-500">
      Showing
      <span class="font-medium text-gray-300">{{ itemRange.start }}</span>
      &ndash;
      <span class="font-medium text-gray-300">{{ itemRange.end }}</span>
      of
      <span class="font-medium text-gray-300">{{ totalItems }}</span>
    </p>

    <div class="flex items-center gap-3">
      <!-- Page size selector -->
      <div v-if="pageSizeOptions.length > 1" class="flex items-center gap-1.5">
        <label for="page-size" class="text-xs text-gray-500">Per page</label>
        <select
          id="page-size"
          :value="pageSize"
          class="rounded-md border border-gray-700 bg-surface-card px-2 py-1 text-xs text-gray-300 focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500"
          @change="changePageSize(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">
            {{ opt }}
          </option>
        </select>
      </div>

      <!-- Page buttons -->
      <div class="flex items-center gap-1">
        <!-- Previous — 36px mobile, appropriate touch target -->
        <button
          :disabled="isFirstPage"
          :aria-disabled="isFirstPage"
          aria-label="Previous page"
          class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8"
          :class="isFirstPage
            ? 'bg-surface-card text-gray-600'
            : 'bg-surface-card text-gray-300 hover:border-gray-600 hover:bg-gray-800'"
          @click="goToPage(page - 1)"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <!-- Page numbers — hide on very small screens, show summary instead -->
        <template v-for="(p, idx) in visiblePages" :key="idx">
          <!-- Ellipsis -->
          <span
            v-if="p === -1"
            class="hidden items-center justify-center text-xs text-gray-500 sm:inline-flex sm:h-8 sm:w-8"
            aria-hidden="true"
          >
            &hellip;
          </span>

          <!-- Page button -->
          <button
            v-else
            :aria-label="`Page ${p}`"
            :aria-current="p === page ? 'page' : undefined"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border text-xs font-medium transition-colors sm:h-8 sm:w-8"
            :class="[
              p === page
                ? 'border-shazam-500/50 bg-shazam-500/10 text-shazam-400'
                : 'border-gray-700 bg-surface-card text-gray-400 hover:border-gray-600 hover:bg-gray-800 hover:text-gray-200',
              p !== page && p !== 1 && p !== totalPages ? 'hidden sm:inline-flex' : '',
            ]"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
        </template>

        <!-- Next -->
        <button
          :disabled="isLastPage"
          :aria-disabled="isLastPage"
          aria-label="Next page"
          class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8"
          :class="isLastPage
            ? 'bg-surface-card text-gray-600'
            : 'bg-surface-card text-gray-300 hover:border-gray-600 hover:bg-gray-800'"
          @click="goToPage(page + 1)"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </nav>
</template>
