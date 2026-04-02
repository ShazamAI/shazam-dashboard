<script setup lang="ts">
import { ref, onMounted } from 'vue';

const status = ref<'checking' | 'starting' | 'connected' | 'error'>('checking');
const message = ref('Checking daemon...');
const errorDetail = ref('');

const emit = defineEmits<{ ready: [] }>();

async function checkAndStart() {
  status.value = 'checking';
  message.value = 'Checking daemon...';
  errorDetail.value = '';

  try {
    const { invoke } = await import('@tauri-apps/api/core');

    // Check if daemon is already running
    const healthy = await invoke<boolean>('check_daemon_health', { port: 4040 });

    if (healthy) {
      status.value = 'connected';
      message.value = 'Connected to daemon';
      setTimeout(() => emit('ready'), 500);
      return;
    }

    // Try to start daemon
    status.value = 'starting';
    message.value = 'Starting Shazam daemon...';

    const result = await invoke<string>('start_daemon', { port: 4040 });

    if (result.startsWith('started') || result === 'already_running') {
      status.value = 'connected';
      message.value = 'Shazam is ready';
      setTimeout(() => emit('ready'), 500);
    } else {
      status.value = 'error';
      message.value = 'Failed to start daemon';
      errorDetail.value = result;
    }
  } catch (err) {
    status.value = 'error';
    message.value = 'Could not connect to daemon';
    errorDetail.value = String(err);
  }
}

async function checkWeb() {
  status.value = 'checking';
  try {
    const resp = await fetch('http://localhost:4040/api/health');
    if (resp.ok) {
      status.value = 'connected';
      message.value = 'Connected to daemon';
      setTimeout(() => emit('ready'), 500);
    } else {
      status.value = 'error';
      message.value = 'Daemon not running. Start it with: shazam';
    }
  } catch {
    status.value = 'error';
    message.value = 'Daemon not running. Start it with: shazam';
  }
}

onMounted(() => {
  const isTauri =
    typeof window !== 'undefined' &&
    ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
  if (isTauri) {
    checkAndStart();
  } else {
    checkWeb();
  }
});
</script>

<template>
  <div class="flex h-screen items-center justify-center bg-gray-950">
    <div class="text-center space-y-4 max-w-sm">
      <div class="text-5xl font-bold text-shazam-500">S</div>

      <div>
        <h1 class="text-xl font-bold text-white">Shazam</h1>
        <p class="text-sm text-gray-400 mt-1">{{ message }}</p>
      </div>

      <!-- Spinner -->
      <div
        v-if="status === 'checking' || status === 'starting'"
        class="flex justify-center"
      >
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-shazam-500"
        />
      </div>

      <!-- Connected -->
      <div v-else-if="status === 'connected'" class="text-emerald-400">
        <svg
          class="h-8 w-8 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <!-- Error -->
      <div v-else-if="status === 'error'" class="space-y-3">
        <p class="text-sm text-red-400">{{ errorDetail }}</p>
        <button
          class="rounded-lg bg-shazam-500 px-4 py-2 text-sm font-medium text-white hover:bg-shazam-400"
          @click="checkAndStart"
        >
          Retry
        </button>
        <p class="text-[10px] text-gray-600">
          Or start manually:
          <code class="text-gray-400"
            >cd shazam-core && SHAZAM_DAEMON=true mix run --no-halt</code
          >
        </p>
      </div>
    </div>
  </div>
</template>
