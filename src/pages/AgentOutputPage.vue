<script setup lang="ts">
import { useAgentOutput } from '@/composables/useAgentOutput';
import { QUICK_ACTIONS } from '@/composables/useAgentOutput';
import AgentOutputSidebar from '@/components/features/AgentOutputSidebar.vue';
import AgentTerminalHeader from '@/components/features/AgentTerminalHeader.vue';
import AgentTerminalLine from '@/components/features/AgentTerminalLine.vue';
import AgentQuickActions from '@/components/features/AgentQuickActions.vue';
import DiffViewer from '@/components/features/DiffViewer.vue';

const {
  selectedAgent,
  agents,
  currentLines,
  currentAgent,
  currentTask,
  agentHasOutput,
  expandedTools,
  activeView,
  currentDiffs,
  currentDiffCount,
  terminalRef,
  autoScroll,
  handleScroll,
  selectAgent,
  clearOutput,
  toggleTool,
  toggleAutoScroll,
  messageInput,
  isSendingMessage,
  messageFeedback,
  sendMessage,
  ws,
} = useAgentOutput();

function handleQuickAction(prompt: string) {
  messageInput.value = prompt;
  sendMessage();
}
</script>

<template>
  <div class="agent-output-page flex h-[calc(100vh-4rem)] gap-4">
    <!-- Agent List Sidebar -->
    <AgentOutputSidebar
      :agents="agents"
      :selected-agent="selectedAgent"
      :agent-has-output="agentHasOutput"
      @select-agent="selectAgent"
    />

    <!-- Terminal Output -->
    <div class="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-800 bg-surface-card">
      <!-- Terminal Header -->
      <AgentTerminalHeader
        :current-agent="currentAgent"
        :current-task="currentTask"
        :auto-scroll="autoScroll"
        @toggle-auto-scroll="toggleAutoScroll"
        @clear-output="clearOutput"
      />

      <!-- View Toggle Tabs -->
      <div v-if="selectedAgent" class="flex items-center gap-1 border-b border-gray-800 bg-gray-900/40 px-4 py-1">
        <button
          class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
          :class="activeView === 'terminal' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'"
          @click="activeView = 'terminal'"
        >
          <svg class="mr-1 inline-block h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3" />
          </svg>
          Terminal
        </button>
        <button
          class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
          :class="activeView === 'changes' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'"
          @click="activeView = 'changes'"
        >
          <svg class="mr-1 inline-block h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          Changes
          <span v-if="currentDiffCount > 0" class="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-shazam-500/20 px-1 text-[10px] text-shazam-400">
            {{ currentDiffCount }}
          </span>
        </button>
      </div>

      <!-- Terminal Body -->
      <div
        v-show="activeView === 'terminal'"
        ref="terminalRef"
        class="flex-1 overflow-y-auto bg-gray-950 p-3 font-mono text-xs leading-relaxed scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-800"
        @scroll="handleScroll"
      >
        <div v-if="!selectedAgent" class="flex h-full items-center justify-center text-gray-600">
          <div class="text-center">
            <svg class="mx-auto mb-3 h-12 w-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p class="text-sm">Select an agent to view output</p>
          </div>
        </div>

        <div v-else-if="currentLines.length === 0" class="flex h-full items-center justify-center text-gray-600">
          <div class="text-center">
            <div class="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800/60">
              <span class="text-base">...</span>
            </div>
            <p class="text-sm">Waiting for output from {{ selectedAgent }}</p>
          </div>
        </div>

        <template v-else>
          <TransitionGroup
            name="line"
            tag="div"
            class="space-y-0.5"
          >
            <AgentTerminalLine
              v-for="line in currentLines"
              :key="line.id"
              :line="line"
              :is-expanded="expandedTools.has(line.id)"
              @toggle-tool="toggleTool"
            />
          </TransitionGroup>
        </template>
      </div>

      <!-- Changes View -->
      <div
        v-show="activeView === 'changes'"
        class="flex-1 overflow-y-auto bg-gray-950 p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-800"
      >
        <DiffViewer :diffs="currentDiffs" />
      </div>

      <!-- Quick Actions -->
      <AgentQuickActions
        v-if="selectedAgent"
        :actions="QUICK_ACTIONS"
        :disabled="isSendingMessage || !selectedAgent"
        class="border-t border-gray-800 bg-gray-900/60 px-4 pt-2"
        @select="handleQuickAction"
      />

      <!-- Message Input -->
      <div v-if="selectedAgent" class="border-t border-gray-800 bg-gray-900/60 px-4 py-2.5">
        <form @submit.prevent="sendMessage" class="flex gap-2">
          <input
            v-model="messageInput"
            type="text"
            :placeholder="`Message ${selectedAgent}...`"
            :disabled="isSendingMessage"
            class="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-shazam-500/50 focus:outline-none disabled:opacity-50"
            aria-label="Send message to agent"
            @keydown.ctrl.enter="sendMessage"
          />
          <button
            type="submit"
            :disabled="!messageInput.trim() || isSendingMessage"
            class="rounded-lg bg-shazam-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-shazam-400 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <svg v-if="isSendingMessage" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
        <p v-if="messageFeedback" class="mt-1 text-[10px]" :class="messageFeedback.includes('error') || messageFeedback.includes('Failed') ? 'text-red-400' : 'text-yellow-400'">
          {{ messageFeedback }}
        </p>
      </div>

      <!-- Bottom status bar -->
      <div class="flex items-center justify-between border-t border-gray-800 bg-gray-900/40 px-4 py-1.5 text-[10px] text-gray-500">
        <span>{{ currentLines.length }} lines</span>
        <span v-if="currentAgent">
          model: {{ currentAgent.model ?? 'default' }} | budget: {{ currentAgent.budget }}
        </span>
        <span>
          <span class="inline-block h-1.5 w-1.5 rounded-full mr-1" :class="ws.isConnected.value ? 'bg-emerald-500' : 'bg-red-500'" />
          {{ ws.isConnected.value ? 'connected' : 'disconnected' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-enter-active {
  transition: all 0.15s ease-out;
}
.line-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}
.line-leave-active {
  transition: all 0.1s ease-in;
}
.line-leave-to {
  opacity: 0;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgb(55 65 81 / 0.5);
  border-radius: 9999px;
}
</style>
