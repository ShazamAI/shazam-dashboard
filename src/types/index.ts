// ===== Project Types =====
export interface Project {
  name: string;
  path: string;
  status: 'running' | 'stopped';
  config_file: string;
  agents_count: number;
  last_used: string | null;
  registered_at: string | null;
}

// ===== Task Types =====
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'awaiting_approval'
  | 'paused';

export interface PipelineStage {
  name: string;
  role: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  assigned_to: string | null;
  completed_by: string | null;
  output: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowStage {
  name: string;
  role: string;
  prompt_suffix: string | null;
  on_reject: string | null;
}

export interface Workflow {
  name: string;
  stages: WorkflowStage[];
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string | null;
  parent_task_id: string | null;
  depends_on: string | null;
  company: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
  // Pipeline/workflow fields
  workflow?: string | null;
  pipeline: PipelineStage[] | null;
  current_stage?: number | null;
  required_role?: string | null;
}

// ===== Agent Types =====
export type AgentStatus =
  | 'idle'
  | 'busy'
  | 'working'
  | 'executing'
  | 'waiting'
  | 'paused'
  | 'error'
  | 'offline';

export interface AgentWorker {
  name: string;
  role: string;
  supervisor: string | null;
  domain: string | null;
  system_prompt: string | null;
  model: string | null;
  fallback_model: string | null;
  provider: string | null;
  tools: string[];
  skills: string[];
  modules: string[];
  budget: number;
  tokens_used: number;
  heartbeat_interval: number;
  status: AgentStatus;
  context: Record<string, unknown>;
  task_history: string[];
  company_ref: string | null;
}

// ===== Company Types =====
export interface Company {
  name: string;
  mission: string | null;
  domain: Record<string, unknown>;
  agents: AgentWorker[];
  task_count: number;
  status: string;
}

// ===== Event Types =====
export type EventType =
  | 'agent_text_delta'
  | 'agent_text_complete'
  | 'agent_output'
  | 'tool_use'
  | 'tool_result'
  | 'task_status_change'
  | 'task_completed'
  | 'task_started'
  | 'task_failed'
  | 'task_created'
  | 'metrics_update'
  | 'agent_status_change'
  | 'system'
  | 'circuit_breaker_tripped'
  | 'circuit_breaker_reset'
  | 'heartbeat'
  | 'agent_started'
  | 'agent_stopped'
  | 'agent_disconnected'
  | 'agent_error'
  | 'agent_crashed'
  | 'agent_paused'
  | 'agent_resumed'
  | 'ralph_paused'
  | 'ralph_resumed'
  | 'company_started'
  | 'company_stopped'
  | 'company_updated'
  | 'task_stage_advanced'
  | 'unknown';

export interface ShazamEvent {
  type: EventType;
  agent: string | null;
  company: string | null;
  task_id: string | null;
  data: unknown;
  timestamp: string;
}

// ===== Event Data Types =====

export interface AgentTextDeltaData {
  text: string;
  agent?: string;
}

export interface TaskStatusChangeData {
  task_id?: string;
  title?: string;
  from?: string;
  to?: string;
  assigned_to?: string;
  status?: string;
  error?: string;
}

export interface ToolUseData {
  tool_name?: string;
  name?: string;
  input?: unknown;
  arguments?: unknown;
  result?: unknown;
  output?: unknown;
  content?: unknown;
}

export interface CircuitBreakerData {
  consecutive_failures?: number;
  last_error?: string;
  threshold?: number;
}

export interface MetricsUpdateData {
  total_tokens_used?: number;
  total_tasks?: number;
  agents_busy?: number;
}

export interface AgentStatusChangeData {
  agent?: string;
  agent_name?: string;
  from?: string;
  to?: string;
  status?: string;
}

export type EventData =
  | AgentTextDeltaData
  | TaskStatusChangeData
  | ToolUseData
  | CircuitBreakerData
  | MetricsUpdateData
  | AgentStatusChangeData
  | Record<string, unknown>;

// ===== Metrics Types =====
export interface Metrics {
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  agents_busy: number;
  agents_idle: number;
  total_tokens_used: number;
  uptime_seconds: number;
  circuit_breaker_tripped: boolean;
}

// ===== Org Chart Types =====
export interface OrgChartNode {
  name: string;
  role: string;
  status: AgentStatus;
  supervisor: string | null;
  domain: string | null;
  reports: OrgChartNode[];
  subagents?: string[];
}

// ===== Circuit Breaker Types =====
export interface CircuitBreakerStatus {
  consecutive_failures: number;
  last_error: string | null;
  tripped: boolean;
  threshold: number;
}

// ===== RalphLoop Types =====
export interface RalphLoopState {
  max_concurrent: number;
  running: Record<string, { agent_name: string; task_id: string }>;
  company_name: string | null;
  paused: boolean;
  auto_approve: boolean;
  module_lock: boolean;
  peer_reassign: boolean;
  poll_interval: number;
  auto_retry: boolean;
  max_retries: number;
  status: string;
}

// ===== API Response Types =====
export interface ApiResponse<T> {
  data: T;
  ok: boolean;
  error?: string;
}

// ===== WebSocket Message Types =====
export interface WsMessage {
  event: EventType;
  payload: unknown;
}

// ===== Task Filter =====
export interface TaskFilter {
  status?: TaskStatus;
  assigned_to?: string;
  company?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ===== Agent Role Presets =====
export const AGENT_ROLE_PRESETS = [
  'pm',
  'senior_dev',
  'junior_dev',
  'qa',
  'designer',
  'researcher',
  'devops',
  'writer',
  'market_analyst',
  'competitor_analyst',
  'pr_reviewer',
] as const;

export type AgentRolePreset = typeof AGENT_ROLE_PRESETS[number];

// ===== Create Agent Payload =====
export interface CreateAgentPayload {
  name: string;
  role: string;
  supervisor?: string | null;
  domain?: string | null;
  system_prompt?: string | null;
  model?: string | null;
  provider?: string | null;
  tools?: string[];
  modules?: string[];
  budget?: number;
}

// ===== Create Task Payload =====
export interface CreateTaskPayload {
  title: string;
  description?: string;
  assigned_to?: string;
  depends_on?: string;
  workflow?: string;
}

// ===== Event Feed Display Item =====
export interface FeedItem {
  id: string;
  type: EventType;
  agent: string | null;
  content: string;
  timestamp: string;
  isStreaming: boolean;
  taskId: string | null;
  meta: Record<string, unknown>;
}

// ===== Session Pool Info =====
export interface SessionPoolInfo {
  active_sessions: number;
  sessions: Record<string, {
    agent_name: string;
    task_count: number;
    last_used: string;
    idle: boolean;
  }>;
}

// ===== Configuration Types =====
export interface ShazamConfig {
  provider: string;
  company: {
    name: string;
    mission: string | null;
    workspace: string | null;
  };
  domains: Record<string, DomainConfig>;
  workspaces: Record<string, WorkspaceConfig>;
  tech_stack: Record<string, string | Record<string, string>>;
  agents: Record<string, AgentYamlConfig>;
  config: RalphLoopConfig;
  plugins: PluginConfig[];
}

export interface DomainConfig {
  description: string;
  paths: string[];
}

export interface WorkspaceConfig {
  path: string;
  domains: string[];
}

export interface AgentYamlConfig {
  role: string;
  supervisor: string | null;
  budget: number;
  model: string | null;
  fallback_model: string | null;
  provider: string | null;
  tools: string[];
  skills: string[];
  modules: string[];
  domain: string | null;
  workspace: string | null;
  system_prompt: string | null;
  heartbeat_interval: number;
}

export interface RalphLoopConfig {
  auto_approve: boolean;
  auto_retry: boolean;
  max_concurrent: number;
  max_retries: number;
  poll_interval: number;
  module_lock: boolean;
  peer_reassign: boolean;
  qa_auto: boolean;
  context_history: number;
  team_activity: number;
  context_budget: number;
}

export interface PluginConfig {
  name: string;
  enabled: boolean;
  events: string[];
  config: Record<string, unknown>;
}

// ===== Workspace Types =====
export interface WorkspaceInfo {
  name: string;
  path: string;
  domains: string[];
  git: GitContext;
  is_active: boolean;
}

export interface GitContext {
  branch: string;
  clean: boolean;
  recent_commits: GitCommit[];
  modified_files: string[];
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
}

// ===== Memory/Context Types =====
export interface MemoryTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: MemoryTreeNode[];
}

export interface MemoryFileContent {
  path: string;
  content: string;
  frontmatter: Record<string, string>;
}

// ===== System Health =====
export interface SystemHealth {
  memory_mb: number;
  poll_interval: number;
  max_concurrent: number;
  uptime_seconds: number;
}

// ===== Canvas Types =====
export interface CanvasStatsData {
  totalTasks: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cost: string;
}

export interface CanvasGitData {
  branch: string;
  status: string;
}

export interface CanvasBudgetData {
  agents: Array<{ name: string; used: number; total: number }>;
  totalCost: string;
}

export interface CanvasApprovalTask {
  id: string;
  title: string;
  assignedTo: string;
}

export interface CanvasLiveEvent {
  time: string;
  agent: string;
  text: string;
  type: string;
}

export interface CanvasAgentOutput {
  time: string;
  type: string;
  text: string;
}

export interface CanvasFileDiff {
  path: string;
  diffs: Array<{ type: 'add' | 'remove' | 'context'; text: string }>;
}

export interface CanvasContextMenu {
  agent: string;
  x: number;
  y: number;
}

// ===== OrgChart Display Types =====
export interface DomainInfo {
  name: string;
  count: number;
  color: { dot: string; text: string; bg: string; hex?: string };
}

export interface StatusDisplayConfig {
  dot: string;
  label: string;
}

// ===== Plan Types =====
export interface PlanTask {
  title: string;
  assigned_to: string;
  depends_on: string | null;
  description: string;
  phase?: string;
  phase_goal?: string;
}

export interface Plan {
  id: string;
  title: string;
  summary?: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  tasks: PlanTask[];
  architecture?: {
    files_created?: string[];
    files_modified?: string[];
    interactions?: string;
    decisions?: { decision: string; reason: string }[];
    dependencies?: string[];
  };
  risks?: { risk: string; mitigation: string }[];
}
