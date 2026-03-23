# Shazam Dashboard — Architecture Guide

> Vue 3 + TypeScript + Tailwind CSS | Vite | Pinia

## Quick Start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build → dist/
npm run typecheck  # vue-tsc --noEmit
```

The dev server proxies `/api` → `http://localhost:4040` and `/ws` → `ws://localhost:4040`.
When the backend is unavailable, a Vite mock API plugin (`src/dev/mockApi.ts`) serves fallback data.

---

## Project Structure

```
shazam-dashboard/
├── index.html                  # Vite entry HTML
├── vite.config.ts              # Vite config: Vue plugin, @ alias, proxy, mock API
├── tailwind.config.js          # Design system: colors, easings, shadows, animations
├── tsconfig.json               # TypeScript strict mode config
├── package.json                # Dependencies and scripts
│
├── public/
│   └── vite.svg                # Static favicon
│
└── src/
    ├── main.ts                 # App bootstrap: createApp, Pinia, Router, CSS
    ├── App.vue                 # Root component: <RouterView> inside AppLayout
    │
    ├── router/
    │   └── index.ts            # 8 lazy-loaded routes, document title updates
    │
    ├── types/
    │   ├── index.ts            # Domain types: Task, Agent, Company, Config, Memory
    │   └── ws-contract.ts      # WebSocket event type definitions
    │
    ├── api/                    # Stateless HTTP service layer
    │   ├── http.ts             # Base fetch client (get, post, put, del)
    │   ├── utils.ts            # extractKey, ensureArray, normalizeError
    │   ├── index.ts            # Barrel re-exports
    │   ├── agentService.ts     # Agent CRUD and status endpoints
    │   ├── companyService.ts   # Company listing with agent token defaults
    │   ├── configService.ts    # Config, workspaces, sessions, memory tree
    │   ├── eventService.ts     # Recent events endpoint
    │   ├── memoryService.ts    # Memory browser file content
    │   ├── metricsService.ts   # Metrics computation helpers
    │   └── taskService.ts      # Task CRUD with backend shape mapping
    │
    ├── stores/                 # Pinia stores (shared reactive state)
    │   ├── index.ts            # Re-exports: useTaskStore, useAgentStore, useEventStore, useMetricsStore
    │   ├── tasks.ts            # Task list, pagination, filters, status counts
    │   ├── agents.ts           # Agent list, status tracking, heartbeat
    │   ├── events.ts           # Event feed, streaming, cost calculation
    │   ├── metrics.ts          # Aggregated metrics, circuit breaker pattern
    │   └── ARCHITECTURE.md     # Detailed store patterns and migration guide
    │
    ├── composables/            # Vue composables (component-scoped logic)
    │   ├── useActiveCompany.ts # Singleton: auto-resolves company from backend
    │   ├── useAgents.ts        # Agent list loading and filtering
    │   ├── useAgentStatus.ts   # Real-time agent status via WebSocket
    │   ├── useApi.ts           # Generic API call wrapper with loading/error
    │   ├── useAsyncState.ts    # Async data loader with retry support
    │   ├── useConfigForm.ts    # Config form state management and save logic
    │   ├── useDashboard.ts     # Dashboard page orchestration
    │   ├── useEventFeed.ts     # Live event stream with cost aggregation
    │   ├── useMemoryTree.ts    # Memory browser tree expand/collapse state
    │   ├── useMetrics.ts       # Metrics page data loading
    │   ├── useMotion.ts        # Animation composables (see Motion System below)
    │   ├── useOrgChart.ts      # Org chart data fetching and tree building
    │   ├── useSidebar.ts       # Sidebar open/close state
    │   ├── useTaskActions.ts   # Task CRUD actions with toast feedback
    │   ├── useTaskPagination.ts# Task page orchestration + WS refresh
    │   ├── useToast.ts         # Toast notification queue
    │   ├── useWebSocket.ts     # WS connection singleton with auto-reconnect
    │   └── useWorkspaces.ts    # Workspace list and switching
    │
    ├── components/
    │   ├── common/             # Reusable UI primitives (no business logic)
    │   │   ├── Button.vue      # Design system button with variants and loading
    │   │   ├── ConnectionIndicator.vue  # WebSocket connection status dot
    │   │   ├── EmptyState.vue  # Placeholder with floating icon animation
    │   │   ├── ErrorBoundary.vue # Dismissable error banner with transitions
    │   │   ├── LoadingSpinner.vue # Dual-layer spinner with pulse ring
    │   │   ├── Pagination.vue  # Page navigation with transition effects
    │   │   ├── StatusBadge.vue # Status pill with indicator dots and flash
    │   │   └── ToastContainer.vue # Toast stack with progress bar
    │   │
    │   ├── features/           # Domain-specific components
    │   │   ├── AgentCard.vue         # Single agent display card
    │   │   ├── AgentList.vue         # Filterable agent grid
    │   │   ├── ConfigAgentsTab.vue   # Config → Agents tab
    │   │   ├── ConfigGeneralTab.vue  # Config → General tab
    │   │   ├── ConfigPluginsTab.vue  # Config → Plugins tab
    │   │   ├── ConfigRalphTab.vue    # Config → Ralph AI tab
    │   │   ├── ConfigTechStackTab.vue# Config → Tech Stack tab
    │   │   ├── ConfigWorkspacesTab.vue# Config → Workspaces tab
    │   │   ├── EventFeed.vue         # Real-time event stream list
    │   │   ├── MemoryTreeNode.vue    # Recursive file tree node
    │   │   ├── OrgTreeNode.vue       # Recursive org chart node
    │   │   ├── RecentTasks.vue       # Dashboard recent tasks widget
    │   │   ├── StatusBar.vue         # Top status bar with task counts
    │   │   ├── TaskCreateForm.vue    # New task creation form
    │   │   ├── TaskDetailPanel.vue   # Task detail slide-out panel
    │   │   ├── TaskOverview.vue      # Dashboard task status summary
    │   │   ├── TaskTable.vue         # Sortable task data table
    │   │   └── WorkspaceTabs.vue     # Workspace tab selector
    │   │
    │   └── layouts/            # App shell and navigation
    │       ├── AppLayout.vue   # Main layout: sidebar + header + content
    │       ├── MobileSidebar.vue # Off-canvas mobile navigation
    │       ├── SidebarNav.vue  # Desktop sidebar with route links
    │       └── TopHeader.vue   # Top bar: company name, hamburger menu
    │
    ├── pages/                  # Route-level components (thin shells)
    │   ├── DashboardPage.vue   # Task overview, event feed, cost tracking
    │   ├── TasksPage.vue       # Task table, create form, detail panel
    │   ├── AgentsPage.vue      # Agent cards with workspace/domain separation
    │   ├── OrgChartPage.vue    # Organizational tree visualization
    │   ├── ConfigPage.vue      # Tabbed settings (6 tabs)
    │   ├── MetricsPage.vue     # Analytics and statistics
    │   ├── MemoryBrowserPage.vue # File tree + content preview
    │   └── SessionsPage.vue    # Session list with live updates
    │
    ├── styles/
    │   ├── main.css            # Tailwind layers, Vue transitions, utility classes
    │   ├── design-tokens.ts    # Programmatic tokens: colors, spacing, shadows
    │   └── colors.ts           # Color palette constants
    │
    └── dev/
        └── mockApi.ts          # Vite plugin: fallback mock API responses
```

---

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | DashboardPage | Task overview, event feed, real-time cost |
| `/tasks` | TasksPage | Task CRUD, table, filters, detail panel |
| `/agents` | AgentsPage | Agent cards grouped by workspace/domain |
| `/org-chart` | OrgChartPage | Hierarchical org visualization |
| `/config` | ConfigPage | Settings across 6 tabs |
| `/metrics` | MetricsPage | Aggregated analytics |
| `/memory` | MemoryBrowserPage | File tree explorer with preview |
| `/sessions` | SessionsPage | Active session monitoring |

All routes are **lazy-loaded** via dynamic `import()`. Document title updates automatically on navigation.

---

## Data Flow

```
┌─────────────┐     HTTP/WS      ┌──────────────┐
│   Backend    │◄────────────────►│  api/         │  Stateless services
│  :4040       │                  │  http.ts      │  (no refs, no reactivity)
└─────────────┘                  └──────┬───────┘
                                        │ Promise<T>
                                        ▼
                                 ┌──────────────┐
                                 │  stores/      │  Pinia reactive state
                                 │  (shared)     │  (ref, computed, actions)
                                 └──────┬───────┘
                                        │ reactive refs
                                        ▼
                                 ┌──────────────┐
                                 │ composables/  │  Component-scoped logic
                                 │ (orchestrate) │  (WS wiring, debounce, UI)
                                 └──────┬───────┘
                                        │ return { ... }
                                        ▼
                                 ┌──────────────┐
                                 │  pages/       │  Thin shells — bind to template
                                 │  components/  │  Props down, events up
                                 └──────────────┘
```

**Layer rules:**
- **api/** — Pure async functions. No Vue imports, no reactivity.
- **stores/** — Shared state via Pinia. Call API services, never fetch directly.
- **composables/** — Wire stores + WebSocket + side effects. Can use lifecycle hooks and toasts.
- **pages/** — Import composables/stores, bind to template. Target < 250 lines.
- **components/common/** — Reusable UI. No business logic, no API calls.
- **components/features/** — Domain widgets. Receive data via props, emit events up.

---

## Pinia Stores

| Store | Key State | Purpose |
|-------|-----------|---------|
| `useTaskStore` | `tasks`, `currentPage`, `filters` | Task list with pagination and status counts |
| `useAgentStore` | `agents`, `statusMap` | Agent registry and real-time status tracking |
| `useEventStore` | `events`, `totalCost` | Live event feed with streaming cost aggregation |
| `useMetricsStore` | `metrics`, `circuitBreaker` | Aggregated dashboard metrics with error protection |

Import from barrel: `import { useTaskStore } from '@/stores'`

See `src/stores/ARCHITECTURE.md` for detailed patterns, typing conventions, and migration guides.

---

## API Service Catalog

| Service | Endpoints | Notes |
|---------|-----------|-------|
| `agentService` | Agent CRUD, status | Maps backend agents to typed `AgentWorker` |
| `companyService` | Company listing | Adds default token usage fields |
| `configService` | Config, workspaces, sessions, memory | Multi-resource service |
| `eventService` | Recent events | Feeds EventFeed component |
| `memoryService` | Memory file content | Used by MemoryBrowserPage |
| `metricsService` | Metrics helpers | Computation utilities for MetricsPage |
| `taskService` | Task CRUD | `extractKey` + `ensureArray` for safe parsing |

**Response parsing pattern:** All services use `extractKey()` to safely extract nested data from backend responses, and `ensureArray()` to guarantee array shape even when the backend returns unexpected formats.

---

## Composable Catalog

### Data & State
| Composable | Description |
|------------|-------------|
| `useActiveCompany` | Singleton — auto-resolves active company from backend |
| `useAgents` | Agent list loading with filtering |
| `useAgentStatus` | Real-time agent status via WebSocket events |
| `useDashboard` | Dashboard page data orchestration |
| `useEventFeed` | Live event stream with cost calculation |
| `useMetrics` | Metrics page data loading |
| `useOrgChart` | Org chart tree building from agent hierarchy |

### UI & Interaction
| Composable | Description |
|------------|-------------|
| `useApi` | Generic API wrapper with loading/error states |
| `useAsyncState` | Async data loader with retry and error handling |
| `useConfigForm` | Form state + validation + save logic for ConfigPage |
| `useMemoryTree` | Tree expand/collapse state for MemoryBrowserPage |
| `useSidebar` | Sidebar open/close toggle |
| `useTaskActions` | Task CRUD with toast feedback |
| `useTaskPagination` | Task page orchestration with WS-triggered refresh |
| `useToast` | Toast notification queue (success, error, info) |
| `useWebSocket` | WS connection singleton with auto-reconnect |
| `useWorkspaces` | Workspace listing and switching |

### Motion & Animation
| Composable | Description |
|------------|-------------|
| `useReducedMotion` | Singleton — detects `prefers-reduced-motion` media query |
| `useInView` | IntersectionObserver wrapper with SSR fallback |
| `useProgressAnimation` | Animated progress bar with ease-out timing |
| `useStaggeredEntrance` | Delayed entrance for list items |
| `useCountUp` | Animated number counter |
| `usePageEntrance` | Page-level fade-in orchestration |

---

## Motion System

### Vue Transitions (11 total, defined in `main.css`)
`v-fade` · `v-fade-up` · `v-fade-down` · `v-scale` · `v-slide-right` · `v-slide-bottom` · `v-expand` · `v-list` · `v-modal` · `v-notification` · `v-switch` · `v-collapse`

### CSS Architecture
- **Base layer:** Reset, `prefers-reduced-motion` support
- **Component layer:** Typography utilities, card styles, status colors
- **Utility layer:** Responsive helpers, animation keyframes
- **Transitions section:** All Vue `<Transition>` classes organized with ASCII headers

### Accessibility
All animations respect `prefers-reduced-motion` through:
1. CSS `@media (prefers-reduced-motion: reduce)` — disables declarative animations
2. `useReducedMotion()` composable — disables programmatic animations at runtime

---

## Design System

### Tailwind Config (`tailwind.config.js`)
- **Colors:** `shazam-*` brand palette, `surface-*` semantic background tokens
- **Shadows:** `elevation-1` through `elevation-4` layered depth shadows
- **Easings:** `ease-bounce-in`, `ease-bounce-out` for polished transitions
- **Animations:** `pulse-soft`, `float`, `shimmer`, `slide-in-right`

### Design Tokens (`src/styles/design-tokens.ts`)
Programmatic access to colors, spacing, typography, and shadow values for use in composables and dynamic styles.

---

## Type System

### Core Types (`src/types/index.ts`)
- `Task`, `TaskStatus` — Task domain with 6 statuses
- `AgentWorker`, `AgentStatus` — Agent with tools, skills, budget, heartbeat
- `Company` — Company entity with agent token tracking
- `Config`, `Session`, `MemoryTreeNode` — Supporting domain types

### WebSocket Contract (`src/types/ws-contract.ts`)
Typed event definitions for all real-time WebSocket messages between backend and frontend.

### TypeScript Conventions
- **Strict mode** enabled — no `any`, no implicit returns
- **`as const` assertions** for literal object maps (see `LoadingSpinner.vue` sizeMap)
- **Interface over type** for object shapes
- **Explicit function signatures** on all exported functions

---

## Conventions

### Component Organization
```vue
<script setup lang="ts">
// 1. Imports (Vue, types, services, components)
// 2. Props interface + defineProps
// 3. Emits interface + defineEmits
// 4. State (ref, reactive)
// 5. Computed
// 6. Methods
// 7. Lifecycle hooks
</script>

<template>
  <!-- Single root recommended, Tailwind utilities -->
</template>

<style scoped>
/* Component-specific keyframes only */
</style>
```

### Naming
- **Files:** PascalCase for components (`AgentCard.vue`), camelCase for logic (`useAgents.ts`)
- **Components:** `common/` = reusable UI, `features/` = domain-specific, `layouts/` = shell
- **Composables:** `use` prefix, verb-noun pattern (`useTaskActions`, `useEventFeed`)
- **Stores:** lowercase plural nouns (`tasks`, `agents`, `events`, `metrics`)
- **Services:** camelCase with `Service` suffix (`taskService.ts`)

### Props & Events
- Props flow **down**, events flow **up**
- Use typed `defineProps<Props>()` and `defineEmits<{ event: [payload] }>()`
- Prefer `withDefaults()` for optional props with defaults
