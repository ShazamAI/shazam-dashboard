<script setup lang="ts">
interface DiffLine {
  type: 'add' | 'remove' | 'context';
  text: string;
  lineNumber?: number;
}

interface FileDiff {
  path: string;
  diffs: DiffLine[];
}

interface Props {
  diffs: FileDiff[];
}

defineProps<Props>();

function lineClass(type: string): string {
  switch (type) {
    case 'add': return 'bg-green-500/10 text-green-400';
    case 'remove': return 'bg-red-500/10 text-red-400';
    default: return 'text-gray-500';
  }
}

function linePrefix(type: string): string {
  switch (type) {
    case 'add': return '+';
    case 'remove': return '-';
    default: return ' ';
  }
}

function fileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const icons: Record<string, string> = {
    ts: '🟦', tsx: '🟦', js: '🟨', jsx: '🟨',
    vue: '🟩', ex: '🟪', exs: '🟪', rs: '🟧',
    py: '🐍', css: '🎨', html: '📄', md: '📝',
  };
  return icons[ext] ?? '📄';
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="diffs.length === 0" class="text-center py-8 text-sm text-gray-600">
      No file changes to display
    </div>

    <div v-for="file in diffs" :key="file.path" class="rounded-xl border border-gray-800 overflow-hidden">
      <!-- File header -->
      <div class="flex items-center gap-2 bg-gray-800/50 px-4 py-2 border-b border-gray-800">
        <span>{{ fileIcon(file.path) }}</span>
        <span class="text-xs font-mono text-gray-300 truncate">{{ file.path }}</span>
        <div class="ml-auto flex items-center gap-2 text-[10px]">
          <span class="text-green-400">+{{ file.diffs.filter(d => d.type === 'add').length }}</span>
          <span class="text-red-400">-{{ file.diffs.filter(d => d.type === 'remove').length }}</span>
        </div>
      </div>

      <!-- Diff lines -->
      <div class="overflow-x-auto">
        <table class="w-full text-xs font-mono">
          <tbody>
            <tr v-for="(line, i) in file.diffs" :key="i" :class="lineClass(line.type)">
              <td class="w-8 px-2 py-0.5 text-right text-gray-600 select-none border-r border-gray-800/50">
                {{ line.lineNumber ?? '' }}
              </td>
              <td class="w-4 px-1 py-0.5 text-center select-none" :class="{ 'text-green-500': line.type === 'add', 'text-red-500': line.type === 'remove' }">
                {{ linePrefix(line.type) }}
              </td>
              <td class="px-3 py-0.5 whitespace-pre">{{ line.text }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
