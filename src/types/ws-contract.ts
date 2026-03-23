/**
 * WebSocket Message Format Contract
 * ==================================
 * Source of truth for all WebSocket messages between the Shazam backend
 * (Elixir/Phoenix) and the dashboard frontend (Vue 3).
 *
 * Connection: ws://localhost:4040/ws (proxied via Vite at /ws)
 *
 * ## Transport Formats
 *
 * The backend may send messages in several envelope formats. The normalizer
 * in `useWebSocket.ts` (`normalizeEvent`) accepts all of them and produces
 * a unified `ShazamEvent` for consumers.
 *
 * ### Format 1: Standard (preferred)
 * ```json
 * {
 *   "type": "<event_type>",
 *   "agent": "dashboard_dev_1",
 *   "company": "Shazam",
 *   "task_id": "abc-123",
 *   "timestamp": "2026-03-21T20:00:00Z",
 *   "data": { ... }
 * }
 * ```
 *
 * ### Format 2: Phoenix Channel
 * ```json
 * {
 *   "event": "<event_type>",
 *   "topic": "events",
 *   "payload": { "agent": "...", "task_id": "...", ... },
 *   "ref": null,
 *   "join_ref": null
 * }
 * ```
 *
 * ### Format 3: Flat Payload
 * ```json
 * {
 *   "type": "<event_type>",
 *   "agent": "dashboard_dev_1",
 *   "task_id": "abc-123",
 *   "status": "completed",
 *   "content": "..."
 * }
 * ```
 * (No nested `data`/`payload` — extra fields become the data object)
 *
 * ## Normalization Rules
 *
 * After normalization, every message becomes a `ShazamEvent`:
 *
 * | ShazamEvent Field | Source (priority order)                              |
 * |-------------------|------------------------------------------------------|
 * | `type`            | `obj.type` ?? `obj.event`                            |
 * | `agent`           | `obj.agent` ?? `data.agent` ?? `data.agent_name`     |
 * | `company`         | `obj.company` ?? `data.company` ?? `data.company_name`|
 * | `task_id`         | `obj.task_id` ?? `data.task_id`                      |
 * | `timestamp`       | `obj.timestamp` ?? `data.timestamp` ?? `new Date()`  |
 * | `data`            | `obj.data` ?? `obj.payload` ?? (flat extra fields)   |
 *
 * ## Filtered Messages
 *
 * These Phoenix internal messages are silently dropped:
 * - `phx_reply`
 * - `phx_error`
 * - `phx_close`
 *
 * `heartbeat` events are accepted but filtered from the EventFeed display.
 */

// ─── Agent Text Streaming ────────────────────────────────────────────────────

/**
 * `agent_text_delta` — Streaming text chunk from an agent.
 *
 * Sent continuously while an agent generates text output.
 * Multiple deltas are concatenated into a single streaming feed item.
 *
 * @example
 * {
 *   "type": "agent_text_delta",
 *   "agent": "dashboard_dev_2",
 *   "task_id": "task-001",
 *   "timestamp": "2026-03-21T20:15:00.123Z",
 *   "data": {
 *     "text": "Let me check the "
 *   }
 * }
 *
 * @consumed_by DashboardPage (EventFeed), useEventFeed
 */
export interface WsAgentTextDelta {
  type: 'agent_text_delta';
  agent: string;
  task_id?: string | null;
  timestamp?: string;
  data: {
    /** The text chunk. May also appear as a bare string in `data`. */
    text: string;
  } | string;
}

/**
 * `agent_text_complete` — Final text output from an agent.
 *
 * Signals that the agent finished generating text.
 * Closes any open streaming buffer for this agent+task pair.
 *
 * @example
 * {
 *   "type": "agent_text_complete",
 *   "agent": "dashboard_dev_2",
 *   "task_id": "task-001",
 *   "timestamp": "2026-03-21T20:15:01.456Z",
 *   "data": {
 *     "text": "Here is the complete output...",
 *     "output": "Here is the complete output..."
 *   }
 * }
 *
 * @consumed_by DashboardPage (EventFeed), useEventFeed
 */
export interface WsAgentTextComplete {
  type: 'agent_text_complete';
  agent: string;
  task_id?: string | null;
  timestamp?: string;
  data: {
    text?: string;
    output?: string;
  } | string;
}

/**
 * `agent_output` — Complete agent output (non-streaming variant).
 *
 * Used when the backend sends full output at once instead of streaming deltas.
 * Behaves identically to `agent_text_complete` in the normalizer.
 *
 * @example
 * {
 *   "type": "agent_output",
 *   "event": "agent_output",
 *   "agent": "dashboard_dev_3",
 *   "content": "Grep: %{\"output_mode\" => \"content\", ...}",
 *   "timestamp": "2026-03-21T20:17:00Z"
 * }
 *
 * @note Backend may use flat format with `content` instead of nested `data.text`
 * @consumed_by DashboardPage (EventFeed), useEventFeed, AgentsPage (activity sparkline)
 */
export interface WsAgentOutput {
  type: 'agent_output';
  agent: string;
  task_id?: string | null;
  timestamp?: string;
  data?: {
    text?: string;
    output?: string;
    content?: string;
  } | string;
  /** Flat format variant — content at top level */
  content?: string;
}

// ─── Tool Events ─────────────────────────────────────────────────────────────

/**
 * `tool_use` — Agent invoked a tool.
 *
 * @example
 * {
 *   "type": "tool_use",
 *   "agent": "dashboard_dev_1",
 *   "task_id": "task-002",
 *   "timestamp": "2026-03-21T20:16:00Z",
 *   "data": {
 *     "tool_name": "Read",
 *     "name": "Read",
 *     "input": { "file_path": "/src/pages/DashboardPage.vue" }
 *   }
 * }
 *
 * @consumed_by DashboardPage (EventFeed), AgentsPage (infers 'executing' status)
 */
export interface WsToolUse {
  type: 'tool_use';
  agent: string;
  task_id?: string | null;
  timestamp?: string;
  data: {
    /** Tool name — may appear as `tool_name` or `name` */
    tool_name?: string;
    name?: string;
    /** Tool input parameters */
    input?: unknown;
  };
}

/**
 * `tool_result` — Result from a tool invocation.
 *
 * @example
 * {
 *   "type": "tool_result",
 *   "agent": "dashboard_dev_1",
 *   "task_id": "task-002",
 *   "timestamp": "2026-03-21T20:16:01Z",
 *   "data": {
 *     "tool_name": "Read",
 *     "name": "Read",
 *     "result": "file contents..."
 *   }
 * }
 *
 * @consumed_by DashboardPage (EventFeed), AgentsPage (activity sparkline)
 */
export interface WsToolResult {
  type: 'tool_result';
  agent: string;
  task_id?: string | null;
  timestamp?: string;
  data: {
    tool_name?: string;
    name?: string;
    result?: unknown;
  };
}

// ─── Task Lifecycle Events ───────────────────────────────────────────────────

/**
 * `task_created` — A new task was created.
 *
 * @example
 * {
 *   "type": "task_created",
 *   "task_id": "task-003",
 *   "agent": "manager",
 *   "timestamp": "2026-03-21T20:10:00Z",
 *   "data": {
 *     "task_id": "task-003",
 *     "title": "Fix login bug",
 *     "assigned_to": "dashboard_dev_1"
 *   }
 * }
 *
 * @consumed_by TasksPage (triggers debounced refresh), DashboardPage
 */
export interface WsTaskCreated {
  type: 'task_created';
  task_id?: string | null;
  agent?: string | null;
  timestamp?: string;
  data?: {
    task_id?: string;
    title?: string;
    assigned_to?: string;
    description?: string;
  };
}

/**
 * `task_started` — A task began execution.
 *
 * @example
 * {
 *   "type": "task_started",
 *   "task_id": "task-003",
 *   "agent": "dashboard_dev_1",
 *   "timestamp": "2026-03-21T20:11:00Z",
 *   "data": {
 *     "task_id": "task-003",
 *     "title": "Fix login bug",
 *     "assigned_to": "dashboard_dev_1"
 *   }
 * }
 *
 * @consumed_by TasksPage (sets status in_progress), AgentsPage (sets agent 'working'),
 *              MetricsPage (refreshes tasks), DashboardPage (refreshes tasks)
 */
export interface WsTaskStarted {
  type: 'task_started';
  task_id: string;
  agent?: string | null;
  timestamp?: string;
  data?: {
    task_id?: string;
    title?: string;
    assigned_to?: string;
    status?: string;
  };
}

/**
 * `task_status_change` — Generic task state transition.
 *
 * The most flexible task event — includes `from` and `to` status strings.
 *
 * @example
 * {
 *   "type": "task_status_change",
 *   "task_id": "task-003",
 *   "agent": "dashboard_dev_1",
 *   "timestamp": "2026-03-21T20:12:00Z",
 *   "data": {
 *     "task_id": "task-003",
 *     "from": "pending",
 *     "to": "in_progress",
 *     "title": "Fix login bug",
 *     "status": "in_progress",
 *     "assigned_to": "dashboard_dev_1"
 *   }
 * }
 *
 * @consumed_by TasksPage (updates task inline), AgentsPage (infers agent status),
 *              MetricsPage (refreshes), DashboardPage (refreshes + feed)
 */
export interface WsTaskStatusChange {
  type: 'task_status_change';
  task_id?: string | null;
  agent?: string | null;
  timestamp?: string;
  data: {
    task_id?: string;
    /** Previous status */
    from?: string;
    /** New status */
    to?: string;
    /** Alias for `to` — some backend paths use this */
    status?: string;
    title?: string;
    assigned_to?: string;
    /** Full task object — if present, used for direct replacement */
    task?: {
      id: string;
      title: string;
      status: string;
      assigned_to?: string | null;
      [key: string]: unknown;
    };
  };
}

/**
 * `task_completed` — A task finished successfully.
 *
 * @example
 * {
 *   "type": "task_completed",
 *   "task_id": "task-003",
 *   "agent": "dashboard_dev_1",
 *   "timestamp": "2026-03-21T20:20:00Z",
 *   "data": {
 *     "task_id": "task-003",
 *     "title": "Fix login bug",
 *     "assigned_to": "dashboard_dev_1"
 *   }
 * }
 *
 * @consumed_by TasksPage (sets status completed), AgentsPage (sets agent 'idle'),
 *              MetricsPage (refreshes), DashboardPage (refreshes + feed)
 */
export interface WsTaskCompleted {
  type: 'task_completed';
  task_id: string;
  agent?: string | null;
  timestamp?: string;
  data?: {
    task_id?: string;
    title?: string;
    assigned_to?: string;
    error?: string;
  };
}

/**
 * `task_failed` — A task execution failed.
 *
 * @example
 * {
 *   "type": "task_failed",
 *   "task_id": "task-003",
 *   "agent": "dashboard_dev_1",
 *   "timestamp": "2026-03-21T20:20:00Z",
 *   "data": {
 *     "task_id": "task-003",
 *     "title": "Fix login bug",
 *     "error": "Budget exceeded",
 *     "assigned_to": "dashboard_dev_1"
 *   }
 * }
 *
 * @consumed_by TasksPage (sets status failed), AgentsPage (sets agent 'idle'),
 *              MetricsPage (refreshes), DashboardPage (refreshes + feed)
 */
export interface WsTaskFailed {
  type: 'task_failed';
  task_id: string;
  agent?: string | null;
  timestamp?: string;
  data?: {
    task_id?: string;
    title?: string;
    error?: string;
    assigned_to?: string;
  };
}

// ─── Agent Lifecycle Events ──────────────────────────────────────────────────

/**
 * `agent_status_change` — Explicit agent status transition.
 *
 * @example
 * {
 *   "type": "agent_status_change",
 *   "agent": "dashboard_dev_1",
 *   "timestamp": "2026-03-21T20:14:00Z",
 *   "data": {
 *     "agent": "dashboard_dev_1",
 *     "from": "idle",
 *     "to": "busy",
 *     "status": "busy"
 *   }
 * }
 *
 * @consumed_by AgentsPage (updates agent status via normalizeAgentStatus),
 *              OrgChartPage (updates node status), DashboardPage (feed)
 */
export interface WsAgentStatusChange {
  type: 'agent_status_change';
  agent?: string | null;
  timestamp?: string;
  data: {
    agent?: string;
    agent_name?: string;
    from?: string;
    to?: string;
    status?: string;
  };
}

/**
 * Agent lifecycle events — less common but handled:
 *
 * - `agent_started`       → sets agent status to 'idle'
 * - `agent_stopped`       → sets agent status to 'offline'
 * - `agent_disconnected`  → sets agent status to 'offline'
 * - `agent_error`         → sets agent status to 'error'
 * - `agent_crashed`       → sets agent status to 'error'
 * - `agent_paused`        → sets agent status to 'paused'
 * - `agent_resumed`       → sets agent status to 'working'
 *
 * These all share the same minimal shape:
 *
 * @example
 * {
 *   "type": "agent_started",
 *   "agent": "dashboard_dev_1",
 *   "timestamp": "2026-03-21T20:00:00Z"
 * }
 */
export type WsAgentLifecycleType =
  | 'agent_started'
  | 'agent_stopped'
  | 'agent_disconnected'
  | 'agent_error'
  | 'agent_crashed'
  | 'agent_paused'
  | 'agent_resumed';

export interface WsAgentLifecycle {
  type: WsAgentLifecycleType;
  agent: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

// ─── Metrics & System Events ─────────────────────────────────────────────────

/**
 * `metrics_update` — Periodic or on-demand system metrics.
 *
 * @example
 * {
 *   "type": "metrics_update",
 *   "timestamp": "2026-03-21T20:15:00Z",
 *   "data": {
 *     "total_tasks": 64,
 *     "completed_tasks": 50,
 *     "failed_tasks": 3,
 *     "pending_tasks": 5,
 *     "in_progress_tasks": 6,
 *     "agents_busy": 3,
 *     "agents_idle": 6,
 *     "total_tokens_used": 1250000,
 *     "uptime_seconds": 3600
 *   }
 * }
 *
 * @consumed_by DashboardPage (feed), AgentsPage (updates tokens_used/budget per agent)
 */
export interface WsMetricsUpdate {
  type: 'metrics_update';
  agent?: string | null;
  timestamp?: string;
  data: {
    total_tasks?: number;
    completed_tasks?: number;
    failed_tasks?: number;
    pending_tasks?: number;
    in_progress_tasks?: number;
    agents_busy?: number;
    agents_idle?: number;
    total_tokens_used?: number;
    uptime_seconds?: number;
    /** Per-agent fields (when agent is specified) */
    tokens_used?: number;
    budget?: number;
  };
}

/**
 * `circuit_breaker_tripped` — Circuit breaker activated after consecutive failures.
 *
 * @example
 * {
 *   "type": "circuit_breaker_tripped",
 *   "timestamp": "2026-03-21T20:25:00Z",
 *   "data": {
 *     "consecutive_failures": 3,
 *     "last_error": "Agent budget exceeded",
 *     "threshold": 3
 *   }
 * }
 *
 * @consumed_by MetricsPage (sets tripped state + error), DashboardPage (feed)
 */
export interface WsCircuitBreakerTripped {
  type: 'circuit_breaker_tripped';
  timestamp?: string;
  data: {
    consecutive_failures?: number;
    last_error?: string;
    threshold?: number;
  };
}

/**
 * `circuit_breaker_reset` — Circuit breaker recovered.
 *
 * @example
 * {
 *   "type": "circuit_breaker_reset",
 *   "timestamp": "2026-03-21T20:26:00Z",
 *   "data": {}
 * }
 *
 * @consumed_by MetricsPage (clears tripped state), DashboardPage (feed)
 */
export interface WsCircuitBreakerReset {
  type: 'circuit_breaker_reset';
  timestamp?: string;
  data?: Record<string, unknown>;
}

/**
 * `heartbeat` — Keep-alive ping from backend.
 *
 * Accepted by the normalizer but filtered from EventFeed display.
 *
 * @example
 * {
 *   "type": "heartbeat",
 *   "timestamp": "2026-03-21T20:15:30Z"
 * }
 *
 * @consumed_by Silently accepted; not displayed.
 */
export interface WsHeartbeat {
  type: 'heartbeat';
  timestamp?: string;
  data?: Record<string, unknown>;
}

/**
 * `system` — Generic system-level notification.
 *
 * @example
 * {
 *   "type": "system",
 *   "timestamp": "2026-03-21T20:00:00Z",
 *   "data": "Server started successfully"
 * }
 *
 * @consumed_by DashboardPage (feed)
 */
export interface WsSystem {
  type: 'system';
  timestamp?: string;
  data: string | Record<string, unknown>;
}

// ─── Company Events ──────────────────────────────────────────────────────────

/**
 * Company lifecycle events — trigger company list refresh in App.vue.
 *
 * - `company_created`
 * - `company_updated`
 * - `company_deleted`
 * - `company_status_change`
 *
 * @example
 * {
 *   "type": "company_created",
 *   "timestamp": "2026-03-21T20:00:00Z",
 *   "data": {
 *     "company": "Shazam",
 *     "name": "Shazam"
 *   }
 * }
 *
 * @consumed_by App.vue (triggers loadCompanies refresh)
 */
export type WsCompanyEventType =
  | 'company_created'
  | 'company_updated'
  | 'company_deleted'
  | 'company_status_change';

export interface WsCompanyEvent {
  type: WsCompanyEventType;
  timestamp?: string;
  data?: {
    company?: string;
    name?: string;
    [key: string]: unknown;
  };
}

// ─── Union Type ──────────────────────────────────────────────────────────────

/**
 * All known WebSocket message types.
 *
 * The dashboard also accepts unknown event types (via `| string` on EventType)
 * and renders them generically in the EventFeed.
 */
export type WsMessage =
  | WsAgentTextDelta
  | WsAgentTextComplete
  | WsAgentOutput
  | WsToolUse
  | WsToolResult
  | WsTaskCreated
  | WsTaskStarted
  | WsTaskStatusChange
  | WsTaskCompleted
  | WsTaskFailed
  | WsAgentStatusChange
  | WsAgentLifecycle
  | WsMetricsUpdate
  | WsCircuitBreakerTripped
  | WsCircuitBreakerReset
  | WsHeartbeat
  | WsSystem
  | WsCompanyEvent;

// ─── Consumer Reference ──────────────────────────────────────────────────────
//
// Which pages consume which event types:
//
// ┌────────────────────────┬──────┬───────┬────────┬──────────┬─────────┬─────┐
// │ Event Type             │ Dash │ Tasks │ Agents │ OrgChart │ Metrics │ App │
// ├────────────────────────┼──────┼───────┼────────┼──────────┼─────────┼─────┤
// │ agent_text_delta       │  ●   │       │   ●    │          │         │     │
// │ agent_text_complete    │  ●   │       │   ●    │          │         │     │
// │ agent_output           │  ●   │       │   ●    │          │         │     │
// │ tool_use               │  ●   │       │   ●    │          │         │     │
// │ tool_result            │  ●   │       │   ●    │          │         │     │
// │ task_created           │  ●   │   ●   │        │          │    ●    │     │
// │ task_started           │  ●   │   ●   │   ●    │    ●     │    ●    │     │
// │ task_status_change     │  ●   │   ●   │   ●    │    ●     │    ●    │     │
// │ task_completed         │  ●   │   ●   │   ●    │    ●     │    ●    │     │
// │ task_failed            │  ●   │   ●   │   ●    │    ●     │    ●    │     │
// │ agent_status_change    │  ●   │       │   ●    │    ●     │         │     │
// │ agent_started/stopped  │      │       │   ●    │          │         │     │
// │ metrics_update         │  ●   │       │   ●    │          │         │     │
// │ circuit_breaker_*      │  ●   │       │        │          │    ●    │     │
// │ heartbeat              │  ○   │       │        │          │         │     │
// │ system                 │  ●   │       │        │          │         │     │
// │ company_*              │      │       │        │          │         │  ●  │
// └────────────────────────┴──────┴───────┴────────┴──────────┴─────────┴─────┘
//
// ● = actively consumed    ○ = accepted but filtered from display
