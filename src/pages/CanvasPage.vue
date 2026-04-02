<script setup lang="ts">
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';

import AgentNode from '@/components/canvas/AgentNode.vue';
import TaskNode from '@/components/canvas/TaskNode.vue';
import EventFeedNode from '@/components/canvas/EventFeedNode.vue';
import GitNode from '@/components/canvas/GitNode.vue';
import BudgetNode from '@/components/canvas/BudgetNode.vue';
import QuickTaskNode from '@/components/canvas/QuickTaskNode.vue';
import ApprovalQueueNode from '@/components/canvas/ApprovalQueueNode.vue';
import AgentOutputTile from '@/components/canvas/AgentOutputTile.vue';
import AgentContextMenu from '@/components/canvas/AgentContextMenu.vue';
import DomainGroupNode from '@/components/canvas/DomainGroupNode.vue';
import FileDiffTile from '@/components/canvas/FileDiffTile.vue';
import StatsNode from '@/components/canvas/StatsNode.vue';

import { useActiveCompany } from '@/composables/useActiveCompany';
import { useCanvas } from '@/composables/useCanvas';

const { activeCompany } = useActiveCompany();

const {
  nodes,
  edges,
  toggles,
  showStats,
  showEvents,
  showGit,
  showBudget,
  isLoading,
  isFullscreen,
  expandedAgent,
  showDiffAgent,
  contextMenu,
  agentOutputs,
  agentFileDiffs,
  liveEvents,
  statsData,
  gitData,
  budgetData,
  approvalTasks,
  buildCanvas,
  fitView,
  saveLayout,
  onConnect,
  onEdgeUpdate,
  onAgentContextMenu,
  toggleAgentOutput,
  handleApprove,
  handleReject,
  handleApproveAll,
  handleCreateTask,
} = useCanvas();
</script>

<template>
  <div class="h-full flex flex-col" :class="isFullscreen ? 'fixed inset-0 z-50 bg-gray-950' : ''">
    <div class="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-medium text-gray-300">Canvas</h2>
        <span v-if="isLoading" class="text-xs text-gray-500">Loading...</span>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <label
          v-for="toggle in toggles"
          :key="toggle.label"
          class="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer"
        >
          <input v-model="toggle.model" type="checkbox" class="rounded border-gray-600 h-3 w-3" @change="buildCanvas" />
          {{ toggle.label }}
        </label>
        <button class="rounded-lg bg-gray-800 px-2.5 py-1 text-[11px] text-gray-400 hover:text-white" @click="buildCanvas">&#8635;</button>
        <button class="rounded-lg bg-gray-800 px-2.5 py-1 text-[11px] text-gray-400 hover:text-white" @click="fitView({ padding: 0.15 })">&#8862;</button>
        <button class="rounded-lg bg-gray-800 px-2.5 py-1 text-[11px] text-gray-400 hover:text-white" @click="isFullscreen = !isFullscreen">{{ isFullscreen ? '&#8863;' : '&#9974;' }}</button>
      </div>
    </div>

    <div class="flex-1 relative">
      <!-- Canvas -->
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        :default-viewport="{ x: 0, y: 0, zoom: 0.7 }"
        :min-zoom="0.15"
        :max-zoom="2.5"
        fit-view-on-init
        :connect-on-click="true"
        :edges-updatable="true"
        class="bg-gray-950"
        @connect="onConnect"
        @edge-update="onEdgeUpdate"
        @node-drag-stop="saveLayout"
      >
        <template #node-agent="{ data }">
          <div @dblclick.stop="toggleAgentOutput(data.name)" @contextmenu.prevent.stop="onAgentContextMenu(data.name, $event)">
            <AgentNode :data="data" />
            <AgentOutputTile
              :agent-name="data.name"
              :is-expanded="expandedAgent === data.name"
              :lines="agentOutputs[data.name] || []"
              @close="expandedAgent = null"
            />
            <FileDiffTile
              :agent-name="data.name"
              :is-expanded="showDiffAgent === data.name"
              :files="agentFileDiffs[data.name] || []"
              @close="showDiffAgent = null"
            />
          </div>
        </template>
        <template #node-task="{ data }"><TaskNode :data="data" @approve="handleApprove" @reject="handleReject" /></template>
        <template #node-domainGroup="{ data }"><DomainGroupNode :data="data" /></template>

        <Background pattern-color="#1f2937" :gap="20" />
        <Controls position="bottom-left" />
        <MiniMap pannable zoomable node-color="#374151" mask-color="rgba(0,0,0,0.7)" />
      </VueFlow>

      <!-- Agent Context Menu -->
      <div v-if="contextMenu" class="fixed inset-0 z-40" @click="contextMenu = null" @contextmenu.prevent="contextMenu = null" />
      <AgentContextMenu
        v-if="contextMenu"
        :agent-name="contextMenu.agent"
        :x="contextMenu.x"
        :y="contextMenu.y"
        @close="contextMenu = null"
        @view-output="toggleAgentOutput"
        @pause-agent="() => { /* TODO */ }"
        @remove-agent="() => { /* TODO */ }"
        @view-config="(name: string) => { showDiffAgent = showDiffAgent === name ? null : name; }"
      />

      <!-- Floating panels (fixed position, always visible) -->

      <!-- Left panel: QuickTask + Approvals + Events -->
      <div class="absolute top-3 left-3 flex flex-col gap-3 z-10 pointer-events-auto max-w-[280px] max-h-[calc(100%-80px)] overflow-y-auto scrollbar-none">
        <QuickTaskNode :data="{ companyName: activeCompany?.name || '' }" @create="handleCreateTask" />
        <ApprovalQueueNode
          v-if="approvalTasks.length > 0"
          :data="{ tasks: approvalTasks }"
          @approve="handleApprove"
          @reject="handleReject"
          @approve-all="handleApproveAll"
        />
        <EventFeedNode v-if="showEvents" :data="{ events: liveEvents }" />
      </div>

      <!-- Right panel: Stats + Git + Budget -->
      <div class="absolute top-3 right-3 flex flex-col gap-3 z-10 pointer-events-auto max-w-[230px]">
        <StatsNode v-if="showStats" :data="statsData" />
        <GitNode v-if="showGit" :data="gitData" />
        <BudgetNode v-if="showBudget" :data="budgetData" />
      </div>

    </div>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.vue-flow__minimap { border-radius: 8px; border: 1px solid #374151; background: #111827; }
.vue-flow__controls { border-radius: 8px; border: 1px solid #374151; background: #1f2937; }
.vue-flow__controls-button { background: #1f2937; border-color: #374151; color: #9ca3af; }
.vue-flow__controls-button:hover { background: #374151; color: white; }
</style>
