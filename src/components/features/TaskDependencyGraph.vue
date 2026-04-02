<script setup lang="ts">
import { computed } from 'vue';
import type { Task } from '@/types';

interface Props {
  tasks: Task[];
  selectedTaskId?: string | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ selectTask: [task: Task] }>();

interface GraphNode {
  id: string;
  title: string;
  status: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dependsOn: string | null;
  assignedTo: string | null;
}

interface GraphEdge {
  from: string;
  to: string;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 50;
const LEVEL_GAP_Y = 80;
const NODE_GAP_X = 30;

// Build graph layout
const graphData = computed(() => {
  // Only include tasks that participate in dependency relationships
  const taskMap = new Map(props.tasks.map(t => [t.id, t]));
  const linkedIds = new Set<string>();

  for (const task of props.tasks) {
    if (task.depends_on && taskMap.has(task.depends_on)) {
      linkedIds.add(task.id);
      linkedIds.add(task.depends_on);
    }
  }

  const tasks = props.tasks.filter(t => linkedIds.has(t.id));
  if (tasks.length === 0) return { nodes: [], edges: [] };

  // Build adjacency: parent -> children
  const dependents = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const task of tasks) {
    if (task.depends_on && linkedIds.has(task.depends_on)) {
      const deps = dependents.get(task.depends_on) || [];
      deps.push(task.id);
      dependents.set(task.depends_on, deps);
      hasParent.add(task.id);
    }
  }

  // Roots = tasks with no parent in the linked set
  const roots = tasks.filter(t => !hasParent.has(t.id)).map(t => t.id);

  // Assign levels via BFS
  const levels = new Map<string, number>();
  const queue = [...roots];
  for (const r of roots) levels.set(r, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = dependents.get(current) || [];
    for (const child of children) {
      if (!levels.has(child)) {
        levels.set(child, (levels.get(current) ?? 0) + 1);
        queue.push(child);
      }
    }
  }

  // Group by level
  const byLevel = new Map<number, string[]>();
  for (const [id, level] of levels) {
    const arr = byLevel.get(level) || [];
    arr.push(id);
    byLevel.set(level, arr);
  }

  // Position nodes
  const nodes: GraphNode[] = [];

  for (const [level, ids] of byLevel) {
    const totalWidth = ids.length * (NODE_WIDTH + NODE_GAP_X) - NODE_GAP_X;
    const startX = -totalWidth / 2;

    ids.forEach((id, i) => {
      const task = taskMap.get(id);
      if (task) {
        nodes.push({
          id,
          title: task.title.length > 25 ? task.title.slice(0, 25) + '...' : task.title,
          status: task.status,
          x: startX + i * (NODE_WIDTH + NODE_GAP_X),
          y: level * LEVEL_GAP_Y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          dependsOn: task.depends_on,
          assignedTo: task.assigned_to,
        });
      }
    });
  }

  // Build edges
  const edges: GraphEdge[] = [];
  for (const node of nodes) {
    if (node.dependsOn && linkedIds.has(node.dependsOn)) {
      edges.push({ from: node.dependsOn, to: node.id });
    }
  }

  return { nodes, edges };
});

// SVG viewBox
const viewBox = computed(() => {
  const { nodes } = graphData.value;
  if (nodes.length === 0) return '0 0 400 200';

  const minX = Math.min(...nodes.map(n => n.x)) - 40;
  const maxX = Math.max(...nodes.map(n => n.x + n.width)) + 40;
  const maxY = Math.max(...nodes.map(n => n.y + n.height)) + 40;

  return `${minX} -20 ${maxX - minX} ${maxY + 40}`;
});

function statusColor(status: string): string {
  switch (status) {
    case 'completed': return '#34d399';
    case 'in_progress': return '#60a5fa';
    case 'failed': return '#f87171';
    case 'pending': return '#6b7280';
    case 'awaiting_approval': return '#fbbf24';
    case 'paused': return '#9ca3af';
    default: return '#6b7280';
  }
}

function statusBg(status: string): string {
  switch (status) {
    case 'completed': return 'rgba(52,211,153,0.1)';
    case 'in_progress': return 'rgba(96,165,250,0.1)';
    case 'failed': return 'rgba(248,113,113,0.1)';
    case 'awaiting_approval': return 'rgba(251,191,36,0.1)';
    default: return 'rgba(107,114,128,0.1)';
  }
}

function getEdgePath(from: string, to: string): string {
  const { nodes } = graphData.value;
  const fromNode = nodes.find(n => n.id === from);
  const toNode = nodes.find(n => n.id === to);
  if (!fromNode || !toNode) return '';

  const x1 = fromNode.x + fromNode.width / 2;
  const y1 = fromNode.y + fromNode.height;
  const x2 = toNode.x + toNode.width / 2;
  const y2 = toNode.y;
  const midY = (y1 + y2) / 2;

  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function handleClick(nodeId: string) {
  const task = props.tasks.find(t => t.id === nodeId);
  if (task) emit('selectTask', task);
}
</script>

<template>
  <div class="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
    <div class="flex items-center justify-between border-b border-gray-800 px-4 py-2.5">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Task Dependencies</h3>
      <span class="text-[10px] text-gray-600">{{ graphData.nodes.length }} linked tasks</span>
    </div>

    <div v-if="graphData.nodes.length === 0" class="px-4 py-8 text-center text-xs text-gray-600">
      No task dependencies found
    </div>

    <svg
      v-else
      :viewBox="viewBox"
      class="w-full"
      style="min-height: 200px; max-height: 400px;"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- Arrow marker -->
      <defs>
        <marker id="dep-arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="rgb(75,85,99)" />
        </marker>
      </defs>

      <!-- Edges -->
      <path
        v-for="edge in graphData.edges"
        :key="`${edge.from}-${edge.to}`"
        :d="getEdgePath(edge.from, edge.to)"
        fill="none"
        stroke="rgb(75,85,99)"
        stroke-width="1.5"
        stroke-dasharray="4,3"
        marker-end="url(#dep-arrowhead)"
      />

      <!-- Nodes -->
      <g
        v-for="node in graphData.nodes"
        :key="node.id"
        class="cursor-pointer"
        @click="handleClick(node.id)"
      >
        <rect
          :x="node.x"
          :y="node.y"
          :width="node.width"
          :height="node.height"
          rx="8"
          :fill="statusBg(node.status)"
          :stroke="node.id === selectedTaskId ? '#a78bfa' : statusColor(node.status)"
          :stroke-width="node.id === selectedTaskId ? 2 : 1"
        />
        <!-- Status dot -->
        <circle
          :cx="node.x + 14"
          :cy="node.y + node.height / 2"
          r="4"
          :fill="statusColor(node.status)"
        />
        <!-- Title -->
        <text
          :x="node.x + 26"
          :y="node.y + 20"
          fill="white"
          font-size="11"
          font-weight="500"
        >
          {{ node.title }}
        </text>
        <!-- Agent -->
        <text
          :x="node.x + 26"
          :y="node.y + 35"
          fill="rgb(156,163,175)"
          font-size="9"
        >
          {{ node.assignedTo ? `\u2192 ${node.assignedTo}` : 'Unassigned' }}
        </text>
      </g>
    </svg>
  </div>
</template>
