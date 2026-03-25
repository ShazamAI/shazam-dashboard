# Changelog

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
