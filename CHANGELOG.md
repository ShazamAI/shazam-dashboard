# Changelog

## v1.0.0 (2026-04-02) — Subagents & Intelligence Release

### Major Features
- **Subagents Page** — configure 12 specialized subagent presets, assign per-agent, team presets, model selection, direct YAML save
- **Spotlight Search (Cmd+K)** — global search across pages, agents, actions with keyboard navigation
- **Create Task Modal** — create tasks directly from Dashboard without navigating away
- **Agent Output Messaging** — send messages to agents, quick actions (Continue, Fix, Explain, Test, Commit)
- **Diff Viewer** — inline code diff visualization with +/- coloring in Agent Output and Task Detail
- **Cost Trend Chart** — SVG line chart tracking cost over time in Metrics
- **Agent Performance Scoring** — grade A-F cards with suggestions per agent
- **Task Dependency Graph** — interactive DAG visualization with SVG
- **Export/Import Tasks** — JSON and CSV export, JSON import with bulk creation
- **Context Window Monitor** — per-agent token usage progress bars
- **Plans Page** — create, edit, refine, approve plans (no task creation until approval)
- **Browser Notifications** — OS-level notifications for task complete/fail/circuit breaker
- **Keyboard Shortcuts** — Cmd+1-5 for navigation
- **Daemon Auto-Start** — Tauri app detects and starts daemon automatically
- **Markdown Output Viewer** — formatted task results with delegate-to-agent dropdown

### Architecture Improvements
- **Stores eliminated** — removed 4 duplicate Pinia stores (agents, tasks, metrics, events), composables are the single pattern
- **Event type safety** — eventGuards.ts with getEventData/getDataString/getDataNumber helpers
- **Debounce centralized** — useRealtimeSync with tick-based refresh, no competing timers
- **API response validation** — runtime validation with console.warn fallbacks
- **Error handling standardized** — useErrorHandler composable, ErrorBoundary on all pages, normalizeError everywhere
- **Full refactoring** — 25+ components/composables extracted, pages reduced 60-80%
- **Shared constants** — colors.ts, languages.ts, timing.ts centralized

### Bug Fixes
- OrgChart status properly normalized
- Configure agent loads and saves all fields
- Token usage displays real costs per model
- Task click on home opens detail panel
- Agent edit no longer wipes other agents
- Tasks load after daemon restart
- Tool events show real names (not "unknown")
- Spotlight scroll follows selection
- Plan creation doesn't create tasks until approval
- Delegate dropdown opens upward (not clipped)

### Dashboard UX
- Subagent hierarchy with mini-nodes in OrgChart
- Subagent badge count in Canvas AgentNode
- Toggle switches with correct sizing
- Team presets informational (not clickable)
- Inline confirmation bars (no native confirm())
- Aria-labels throughout for accessibility

## v0.5.0 (2026-03-25)

### Features — Workflow Pipelines
- **Pipeline visualization** — task table shows stage column with progress indicator (colored dots per stage)
- **Pipeline progress in canvas** — TaskNode displays mini progress bar and current stage label
- **Workflow browser page** — `/workflows` page to browse, create, edit, and delete workflow templates with interactive node-graph canvas
- **Workflow selection in task creation** — dropdown to select a workflow with live pipeline preview
- **Stage approve/reject API** — taskService supports `approveStage` and `rejectStage` actions
- **Workflow stage nodes** — custom Vue Flow node for workflow canvas visualization

### Features — Dashboard Enhancements
- **Event timeline** — real-time event timeline widget on dashboard with null-safe rendering
- **Circuit breaker management** — reset button, resume + retry failed, resume only actions via HTTP API
- **Health indicators** — circuit breaker status shown in dashboard health widget
- **Notification bell** — notification center component
- **Budget tracker** — budget tracking widget
- **Task dependency tree** — dependency visualization component
- **Task timeline** — timeline view for task progress
- **Onboarding wizard** — first-run setup wizard component
- **Agent output page** — dedicated page for viewing agent output

### Features — File Browser
- **Enhanced file browser** — improved Monaco editor integration and file tree navigation

### Bug Fixes
- **Ralph endpoint paths** — fixed pause/resume endpoints to use `/ralph-loop/` prefix
- **Null safety** — added null/undefined handling to timeline helper functions and event type display
- **TypeScript fixes** — resolved type safety issues in PipelineSteps, WorkflowsPage, and TaskTable

### Real-time
- **Pipeline stage events** — real-time sync handles `task_stage_advanced` and `task_stage_rejected` events
- **WebSocket improvements** — enhanced reconnection and event handling

## v0.4.0 (2026-03-25)

### Features — Canvas Mode
- **Infinite canvas** with Vue Flow — pan, zoom, drag agents and tasks
- **Agent nodes** with hierarchy edges (PM → Devs), notification badges (running/pending/failed)
- **Task nodes** connected to agents, drag to reassign
- **Agent Output Tile** — double-click agent to expand terminal-like live output
- **File Diff Tile** — right-click agent → View Changes, shows modified files
- **Domain group nodes** — colored areas grouping agents by domain
- **Agent context menu** — right-click: View Output, View Changes, Pause, Remove
- **Drag edges** to change hierarchy — persists in localStorage
- **Save/restore layout** — node positions persist between sessions
- **Canvas fullscreen** — hide sidebar for full-screen canvas
- **Floating panels** — QuickTask, Stats, Git, Budget, Live Events, Approval Queue
- **Real-time updates** via WebSocket (debounced 2s)
- **Auto layout** with dagre (directed graph)

### Features — File Browser
- **Monaco Editor** with syntax highlighting (TypeScript, Vue, Elixir, Rust, etc.)
- **File tree** with expandable directories and file type icons
- **Live file binding** — files auto-update when agents make changes
- **Edit mode** — toggle read-only/edit, save changes to daemon

### Features — General
- **Sentry error tracking** — Vue runtime errors sent to Sentry (production only)
- **Tauri HTTP + WebSocket plugins** — fixes mixed-content block in native app
- **Tasks filtered by company** across all pages (Dashboard, Tasks, Metrics)
- **Agent dropdown** in Create Task uses agentStore
- **Project switch** reloads all data correctly

### Bug Fixes
- Agent zeroing on F5 — localStorage overrides preserve hierarchy
- Duplicate edge on hierarchy change — now removes old edge first
- Mock API intercepting when daemon is running — disabled mock

## v0.2.1 (2026-03-24)

### Features
- ProjectsPage: list, start, stop, add projects from dashboard
- Tauri native app with Vue + Tauri v2
- Multi-project support via project selector in sidebar

## v0.1.0 (2026-03-21)

### Initial Release
- Vue 3 + Tailwind dashboard
- 8 pages: Dashboard, Tasks, Agents, Org Chart, Config, Metrics, Memory, Sessions
- WebSocket real-time events
- Pinia stores for state management
