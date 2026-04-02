<script setup lang="ts">
import { ref } from 'vue';
import { get, post } from '@/api/http';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useToast } from '@/composables/useToast';

const { activeCompany } = useActiveCompany();
const toast = useToast();

const showImportDialog = ref(false);
const importText = ref('');
const isImporting = ref(false);

const emit = defineEmits<{ imported: [] }>();

async function exportJSON() {
  try {
    const company = activeCompany.value?.name;
    const url = company ? `/tasks/export?format=json&company=${encodeURIComponent(company)}` : '/tasks/export?format=json';
    const data = await get<{ tasks: unknown[]; count: number }>(url);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `tasks-${new Date().toISOString().slice(0, 10)}.json`);
    toast.success(`Exported ${data.count} tasks`);
  } catch {
    toast.error('Failed to export tasks');
  }
}

async function exportCSV() {
  try {
    const company = activeCompany.value?.name;
    const url = company ? `/tasks/export?format=csv&company=${encodeURIComponent(company)}` : '/tasks/export?format=csv';

    const isTauri = typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
    const baseUrl = isTauri ? 'http://127.0.0.1:4040/api' : '/api';
    const response = await fetch(`${baseUrl}${url}`);
    const csv = await response.text();

    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `tasks-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Tasks exported as CSV');
  } catch {
    toast.error('Failed to export CSV');
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImport() {
  const text = importText.value.trim();
  if (!text) return;

  isImporting.value = true;
  try {
    const tasks = JSON.parse(text);
    const payload = {
      tasks: Array.isArray(tasks) ? tasks : tasks.tasks || [tasks],
      company: activeCompany.value?.name,
    };

    const result = await post<{ imported: number; total: number }>('/tasks/import', payload);
    toast.success(`Imported ${result.imported}/${result.total} tasks`);
    importText.value = '';
    showImportDialog.value = false;
    emit('imported');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Invalid JSON format');
  } finally {
    isImporting.value = false;
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Export buttons -->
    <button
      class="rounded-lg border border-gray-700 px-3 py-1.5 text-[10px] font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
      aria-label="Export tasks as JSON"
      @click="exportJSON"
    >
      Export JSON
    </button>
    <button
      class="rounded-lg border border-gray-700 px-3 py-1.5 text-[10px] font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
      aria-label="Export tasks as CSV"
      @click="exportCSV"
    >
      Export CSV
    </button>
    <button
      class="rounded-lg border border-gray-700 px-3 py-1.5 text-[10px] font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
      aria-label="Import tasks"
      @click="showImportDialog = !showImportDialog"
    >
      Import
    </button>
  </div>

  <!-- Import dialog -->
  <div v-if="showImportDialog" class="mt-3 rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-3">
    <p class="text-xs text-gray-400">Paste JSON array of tasks (each with title, description, assigned_to):</p>
    <textarea
      v-model="importText"
      class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:border-shazam-500/50 focus:outline-none resize-y min-h-[80px]"
      placeholder='[{"title": "Fix bug", "description": "...", "assigned_to": "dev1"}]'
      rows="4"
    />
    <div class="flex gap-2">
      <button
        class="rounded-lg bg-shazam-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-shazam-400 disabled:opacity-50"
        :disabled="!importText.trim() || isImporting"
        @click="handleImport"
      >
        {{ isImporting ? 'Importing...' : 'Import Tasks' }}
      </button>
      <button
        class="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white"
        @click="showImportDialog = false"
      >
        Cancel
      </button>
    </div>
  </div>
</template>
