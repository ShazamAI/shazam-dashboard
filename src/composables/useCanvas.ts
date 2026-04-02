import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue';
import { useVueFlow, type Connection } from '@vue-flow/core';
import type { Node, Edge } from '@vue-flow/core';
import dagre from 'dagre';

import { useActiveCompany } from './useActiveCompany';
import { useWebSocket } from './useWebSocket';
import { useToast } from '@/composables/useToast';
import { fetchTasks, approveTask, rejectTask, approveAllTasks, createTask } from '@/api/taskService';
import { fetchAgents } from '@/api/companyService';
import { fetchAgentSubagents } from '@/api/subagentService';
import { get } from '@/api/http';
import { getDomainColor } from '@/constants/colors';
import type {
  CanvasStatsData,
  CanvasGitData,
  CanvasBudgetData,
  CanvasApprovalTask,
  CanvasLiveEvent,
  CanvasAgentOutput,
  CanvasFileDiff,
  CanvasContextMenu,
} from '@/types';

// ─── Constants ────────────────────────────────────────────
const EVENT_LIMIT = 30;
const OUTPUT_LIMIT = 50;
const DIFF_LIMIT = 5;
const TASK_LIMIT = 25;
const DEBOUNCE_MS = 2000;

/**
 * Composable for the Canvas page — manages Vue Flow nodes/edges,
 * dagre layout, WebSocket event tracking, hierarchy overrides,
 * and floating panel data.
 */
export function useCanvas() {
  const { activeCompany } = useActiveCompany();
  const ws = useWebSocket();
  const toast = useToast();
  const { fitView } = useVueFlow();

  // ─── Reactive state ──────────────────────────────────

  // Use `any[]` for the ref type to avoid Vue Flow's excessively deep
  // recursive Node/Edge generics triggering TS2589. The dagre layout
  // helpers and Vue Flow accept these at runtime without issue.
  const nodes = ref([]) as Ref<Node[]>;
  const edges = ref([]) as Ref<Edge[]>;
  const showTasks = ref(true);
  const showStats = ref(true);
  const showEvents = ref(true);
  const showGit = ref(true);
  const showBudget = ref(true);
  const showDomainGroups = ref(true);
  const isLoading = ref(false);
  const hasInitialized = ref(false);
  const isFullscreen = ref(false);

  // Agent output / diff tracking
  const expandedAgent = ref<string | null>(null);
  const showDiffAgent = ref<string | null>(null);
  const contextMenu = ref<CanvasContextMenu | null>(null);
  const agentFileDiffs = ref<Record<string, CanvasFileDiff[]>>({});
  const agentOutputs = ref<Record<string, CanvasAgentOutput[]>>({});

  // Floating panel data
  const statsData = ref<CanvasStatsData>({
    totalTasks: 0, pending: 0, running: 0, completed: 0, failed: 0, cost: '<$0.01',
  });
  const gitData = ref<CanvasGitData>({ branch: '', status: '' });
  const budgetData = ref<CanvasBudgetData>({ agents: [], totalCost: '<$0.01' });
  const approvalTasks = ref<CanvasApprovalTask[]>([]);
  const liveEvents = ref<CanvasLiveEvent[]>([]);

  // Toggle refs grouped for the toolbar
  const toggles = [
    { model: showTasks, label: 'Tasks' },
    { model: showStats, label: 'Stats' },
    { model: showEvents, label: 'Events' },
    { model: showGit, label: 'Git' },
    { model: showBudget, label: 'Budget' },
    { model: showDomainGroups, label: 'Domains' },
  ];

  // ─── Debounced rebuild ───────────────────────────────

  let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

  function debouncedRebuild() {
    if (rebuildTimer) return;
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      buildCanvas();
    }, DEBOUNCE_MS);
  }

  // ─── WebSocket event handling ────────────────────────

  const IMPORTANT_EVENTS = new Set([
    'task_created', 'task_completed', 'task_failed', 'task_started',
    'task_approved', 'task_rejected', 'task_killed', 'agent_status_change',
  ]);

  const unsubWs = ws.on('*' as any, (event: any) => {
    try {
      if (['heartbeat', 'metrics_updated'].includes(event.type)) return;

      // Add to live feed
      liveEvents.value = [
        { time: event.timestamp?.slice(0, 8) || '', agent: event.agent || 'system', text: event.data?.title || event.type, type: event.type },
        ...liveEvents.value.slice(0, EVENT_LIMIT),
      ];

      // Update event feed node reactively (reassign via spread to avoid direct mutation)
      const eventIdx = nodes.value.findIndex(n => n.id === 'events');
      if (eventIdx >= 0) {
        const updated = { ...nodes.value[eventIdx], data: { events: liveEvents.value } } as Node;
        nodes.value[eventIdx] = updated;
      }

      // Track file changes per agent (for diff tile)
      const agentName = event.agent || 'system';
      if (event.type === 'tool_use' && agentName !== 'system') {
        const text = event.data?.title || '';
        const editMatch = text.match(/(?:Edit|Write)\s*[:(]?\s*["']?([^"'\s)]+)/);
        if (editMatch) {
          if (!agentFileDiffs.value[agentName]) agentFileDiffs.value[agentName] = [];
          const existing = agentFileDiffs.value[agentName].find(f => f.path === editMatch[1]);
          if (!existing) {
            agentFileDiffs.value[agentName] = [
              ...agentFileDiffs.value[agentName].slice(-DIFF_LIMIT),
              { path: editMatch[1], diffs: [{ type: 'add' as const, text: 'Modified by ' + agentName }] },
            ];
          }
        }
      }

      // Track agent-specific output (reassign via spread)
      if (agentName !== 'system' && ['tool_use', 'agent_output', 'task_created', 'task_completed', 'task_failed', 'task_started'].includes(event.type)) {
        if (!agentOutputs.value[agentName]) {
          agentOutputs.value[agentName] = [];
        }
        agentOutputs.value[agentName] = [
          ...agentOutputs.value[agentName].slice(-OUTPUT_LIMIT),
          { time: event.timestamp?.slice(0, 8) || '', type: event.type, text: event.data?.title || event.type },
        ];
      }

      // Debounced full rebuild for task/agent changes
      if (IMPORTANT_EVENTS.has(event.type)) {
        debouncedRebuild();
      }
    } catch (err) {
      console.warn('[Canvas] WS event handler error:', err);
    }
  });

  // ─── Hierarchy overrides (localStorage) ──────────────

  function getOverridesKey(): string {
    return `shazam-canvas-overrides-${activeCompany.value?.name || 'default'}`;
  }

  function getLayoutKey(): string {
    return `shazam-canvas-layout-${activeCompany.value?.name || 'default'}`;
  }

  function saveLayout() {
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.value.forEach(n => { positions[n.id] = n.position; });
    localStorage.setItem(getLayoutKey(), JSON.stringify(positions));
  }

  function applyLayout(targetNodes: Node[]) {
    try {
      const saved = JSON.parse(localStorage.getItem(getLayoutKey()) || '{}');
      targetNodes.forEach(n => {
        if (saved[n.id]) {
          n.position = saved[n.id];
        }
      });
    } catch { /* ignore */ }
  }

  function loadOverrides(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(getOverridesKey()) || '{}');
    } catch { return {}; }
  }

  function saveOverride(agentName: string, supervisorName: string) {
    const overrides = loadOverrides();
    overrides[agentName] = supervisorName;
    localStorage.setItem(getOverridesKey(), JSON.stringify(overrides));
  }

  function applyOverrides(agents: any[]): any[] {
    const overrides = loadOverrides();
    return agents.map(a => {
      const override = overrides[a.name];
      if (override !== undefined) {
        return { ...a, supervisor: override };
      }
      return a;
    });
  }

  // ─── Dagre layout ────────────────────────────────────

  function layoutNodes(allNodes: Node[], allEdges: Edge[]) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60, marginx: 40, marginy: 40 });

    allNodes.forEach((node) => {
      const w = node.type === 'agent' ? 210 : 190;
      const h = node.type === 'agent' ? 130 : 80;
      g.setNode(node.id, { width: w, height: h });
    });

    const nodeIds = new Set(allNodes.map(n => n.id));
    allEdges.forEach((edge) => {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        g.setEdge(edge.source, edge.target);
      }
    });

    dagre.layout(g);

    allNodes.forEach((node) => {
      const pos = g.node(node.id);
      if (pos) node.position = { x: pos.x - (pos.width || 0) / 2, y: pos.y - (pos.height || 0) / 2 };
    });
  }

  // ─── Build canvas ────────────────────────────────────

  async function buildCanvas() {
    isLoading.value = true;
    const company = activeCompany.value?.name;
    if (!company) { isLoading.value = false; return; }

    try {
      // Load agents from API + apply hierarchy overrides from localStorage
      const rawAgents = await fetchAgents(company);
      let agents = applyOverrides(rawAgents);

      // Filter out agents with no name (daemon bug)
      agents = agents.filter(a => a.name && a.name !== 'unknown' && a.name !== '');

      const taskResult = await fetchTasks({ company });
      const tasks = taskResult.items;

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // ── Update floating panel data ───────────
      statsData.value = {
        totalTasks: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        running: tasks.filter(t => ['in_progress', 'running'].includes(t.status)).length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length,
        cost: '<$0.01',
      };

      try {
        const health = await get<any>('/health');
        gitData.value = { branch: health?.git_branch || '', status: health?.git_status || '' };
      } catch { /* ignore */ }

      budgetData.value = {
        agents: agents.map(a => ({ name: a.name, used: (a as any).tokens_used || 0, total: a.budget || 100000 })),
        totalCost: '<$0.01',
      };

      approvalTasks.value = tasks
        .filter(t => t.status === 'awaiting_approval')
        .map(t => ({ id: t.id, title: t.title, assignedTo: t.assigned_to || '' }));

      // ── Fetch subagent counts in parallel ──
      const subagentCounts: Record<string, number> = {};
      await Promise.all(
        agents.map(async (agent) => {
          try {
            const subs = await fetchAgentSubagents(agent.name);
            subagentCounts[agent.name] = subs.length;
          } catch {
            subagentCounts[agent.name] = 0;
          }
        }),
      );

      // ── Agent nodes ─────────────────────────
      const domains = new Set<string>();
      agents.forEach((agent) => {
        const currentTask = tasks.find(t =>
          t.assigned_to === agent.name && ['in_progress', 'running'].includes(t.status)
        );
        const domain = (agent as any).domain || null;
        if (domain) domains.add(domain);

        newNodes.push({
          id: `agent-${agent.name}`, type: 'agent', position: { x: 0, y: 0 },
          data: {
            name: agent.name,
            role: agent.role || '',
            status: agent.status || 'idle',
            domain,
            currentTask: currentTask?.title || null,
            tasksCompleted: (agent as any).tasks_completed || 0,
            tasksFailed: (agent as any).tasks_failed || 0,
            tasksPending: tasks.filter(t => t.assigned_to === agent.name && t.status === 'pending').length,
            tasksRunning: tasks.filter(t => t.assigned_to === agent.name && ['in_progress', 'running'].includes(t.status)).length,
            subagentCount: subagentCounts[agent.name] || 0,
          },
        });
      });

      // ── Domain group nodes ───────────────────
      if (showDomainGroups.value && domains.size > 0) {
        domains.forEach(domain => {
          const color = getDomainColor(domain).hex;
          const agentCount = agents.filter(a => (a as any).domain === domain).length;
          newNodes.push({
            id: `domain-${domain}`,
            type: 'domainGroup',
            position: { x: 0, y: 0 },
            data: { domain, agentCount, color },
            style: { zIndex: -1 },
          } as any);
        });
      }

      // ── Hierarchy edges ─────────────────────
      agents.forEach((agent) => {
        const supervisor = (agent as any).supervisor;
        if (supervisor && agents.find(a => a.name === supervisor)) {
          newEdges.push({
            id: `edge-${supervisor}-${agent.name}`,
            source: `agent-${supervisor}`,
            target: `agent-${agent.name}`,
            type: 'smoothstep',
            style: { stroke: '#4b5563', strokeWidth: 2 },
          });
        }
      });

      // ── Task nodes ──────────────────────────
      if (showTasks.value) {
        const activeAgentNames = new Set(agents.map(a => a.name));
        const activeTasks = tasks.filter(t =>
          ['pending', 'in_progress', 'running', 'awaiting_approval', 'failed'].includes(t.status) ||
          (t.assigned_to && activeAgentNames.has(t.assigned_to) && t.status === 'in_progress')
        );
        const seen = new Set<string>();
        const uniqueTasks = activeTasks.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; }).slice(0, TASK_LIMIT);

        uniqueTasks.forEach((task) => {
          newNodes.push({
            id: `task-${task.id}`, type: 'task', position: { x: 0, y: 0 },
            data: { id: task.id, title: task.title, status: task.status, assignedTo: task.assigned_to || 'unassigned' },
          });
          if (task.assigned_to && agents.find(a => a.name === task.assigned_to)) {
            newEdges.push({
              id: `edge-task-${task.id}`,
              source: `agent-${task.assigned_to}`,
              target: `task-${task.id}`,
              type: 'smoothstep',
              animated: task.status === 'in_progress',
              style: {
                stroke: task.status === 'in_progress' ? '#60a5fa' : task.status === 'awaiting_approval' ? '#fbbf24' : task.status === 'failed' ? '#ef4444' : '#4b5563',
                strokeWidth: 1.5,
                strokeDasharray: task.status === 'awaiting_approval' ? '5,5' : undefined,
              },
            });
          }
        });
      }

      // ── Auto layout + saved positions ───────
      layoutNodes(newNodes, newEdges);
      applyLayout(newNodes);

      nodes.value = newNodes;
      edges.value = newEdges;

      if (!hasInitialized.value) {
        hasInitialized.value = true;
        setTimeout(() => fitView({ padding: 0.15 }), 100);
      }
    } catch (err) {
      console.error('[Canvas] buildCanvas failed:', err);
      toast.error('Failed to build canvas');
    } finally {
      isLoading.value = false;
    }
  }

  // ─── User interactions ───────────────────────────────

  function onAgentContextMenu(agentName: string, event: MouseEvent) {
    event.preventDefault();
    contextMenu.value = { agent: agentName, x: event.clientX, y: event.clientY };
  }

  function toggleAgentOutput(agentName: string) {
    expandedAgent.value = expandedAgent.value === agentName ? null : agentName;
  }

  async function handleApprove(id: string) { await approveTask(id); buildCanvas(); }
  async function handleReject(id: string) { await rejectTask(id); buildCanvas(); }
  async function handleApproveAll() { await approveAllTasks(); buildCanvas(); }

  async function handleCreateTask(title: string) {
    const company = activeCompany.value?.name;
    if (!company) return;
    await createTask(company, { title, description: title });
    buildCanvas();
  }

  // ─── Edge connection / hierarchy changes ─────────────

  async function onConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;

    const sourceId = connection.source;
    const targetId = connection.target;

    const isAgentToAgent = sourceId.startsWith('agent-') && targetId.startsWith('agent-');
    const isAgentToTask = sourceId.startsWith('agent-') && targetId.startsWith('task-');

    if (isAgentToTask) {
      const agentName = sourceId.replace('agent-', '');
      const taskId = targetId.replace('task-', '');
      try {
        const { post: httpPost } = await import('@/api/http');
        await httpPost(`/tasks/${encodeURIComponent(taskId)}/reassign`, { assigned_to: agentName });
      } catch { /* best effort */ }
      debouncedRebuild();
      return;
    }

    if (!isAgentToAgent) return;

    const supervisorName = sourceId.replace('agent-', '');
    const agentName = targetId.replace('agent-', '');
    const company = activeCompany.value?.name;
    if (!company) return;

    // Prevent cycles
    const wouldCycle = (agent: string, visited = new Set<string>()): boolean => {
      if (visited.has(agent)) return true;
      visited.add(agent);
      const subordinates = (edges.value as any[])
        .filter((e: any) => e.source === `agent-${agent}` && !e.id.includes('task'))
        .map((e: any) => e.target.replace('agent-', ''));
      return subordinates.some(sub => sub === agentName || wouldCycle(sub, visited));
    };

    if (agentName === supervisorName || wouldCycle(supervisorName)) {
      console.warn('[Canvas] Cycle detected — cannot make', agentName, 'report to', supervisorName);
      toast.error(`Cannot set ${agentName} to report to ${supervisorName} — would create a cycle`);
      return;
    }

    saveOverride(agentName, supervisorName);

    const filtered = (edges.value as any[]).filter((e: any) => {
      if (e.id.includes('task')) return true;
      if (e.target === targetId) return false;
      return true;
    });
    filtered.push({
      id: `edge-${supervisorName}-${agentName}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      style: { stroke: '#4b5563', strokeWidth: 2 },
    } as any);
    edges.value = filtered;

    // Update daemon in background (best effort)
    try {
      const { put } = await import('@/api/http');
      put(`/companies/${encodeURIComponent(company)}/agents/${encodeURIComponent(agentName)}`, {
        supervisor: supervisorName,
      }).catch(() => {});
    } catch { /* localStorage has it anyway */ }
  }

  function onEdgeUpdate({ edge, connection }: { edge: any; connection: Connection }) {
    if (!connection.source || !connection.target) return;
    edges.value = (edges.value as any[]).filter((e: any) => e.id !== edge.id) as any;
    onConnect(connection);
  }

  // ─── Lifecycle ───────────────────────────────────────

  watch(() => activeCompany.value?.name, (n, o) => {
    if (n && n !== o) {
      liveEvents.value = [];
      hasInitialized.value = false;
      buildCanvas();
    }
  });

  onMounted(buildCanvas);

  onUnmounted(() => {
    if (rebuildTimer) {
      clearTimeout(rebuildTimer);
      rebuildTimer = null;
    }
    unsubWs();
  });

  // ─── Public API ──────────────────────────────────────

  return {
    // Flow state
    nodes,
    edges,

    // Visibility toggles
    showTasks,
    showStats,
    showEvents,
    showGit,
    showBudget,
    showDomainGroups,
    toggles,

    // UI state
    isLoading,
    isFullscreen,
    expandedAgent,
    showDiffAgent,
    contextMenu,

    // Tracking data
    agentOutputs,
    agentFileDiffs,
    liveEvents,

    // Floating panel data
    statsData,
    gitData,
    budgetData,
    approvalTasks,

    // Actions
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
  };
}
