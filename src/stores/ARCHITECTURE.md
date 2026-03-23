# Dashboard State Management Architecture

## Directory Structure

```
src/
├── api/                    # HTTP service layer (stateless)
│   ├── http.ts             # Base fetch client
│   ├── utils.ts            # extractKey, ensureArray, normalizeError
│   ├── taskService.ts      # Task CRUD operations
│   ├── companyService.ts   # Company + Agent API calls
│   ├── configService.ts    # Config, workspaces, sessions, memory
│   ├── eventService.ts     # Recent events endpoint
│   └── metricsService.ts   # Metrics computation helpers
│
├── stores/                 # Pinia stores (shared reactive state)
│   ├── index.ts            # Re-exports all stores
│   ├── tasks.ts            # Task list, pagination, filters
│   ├── agents.ts           # Agent list, status tracking
│   ├── events.ts           # Event feed, streaming, cost
│   └── metrics.ts          # Aggregated metrics, circuit breaker
│
├── composables/            # Vue composables (component-scoped logic)
│   ├── useWebSocket.ts     # WS connection singleton
│   ├── useActiveCompany.ts # Active company singleton
│   ├── useToast.ts         # Toast notifications
│   ├── useAsyncState.ts    # Generic async data loader
│   ├── useTaskPagination.ts # Task page-specific orchestration
│   ├── useTaskActions.ts   # Task CRUD actions with toast feedback
│   ├── useConfigForm.ts    # Config form state + save logic
│   └── useWorkspaces.ts    # Workspace list + switching
│
├── components/
│   ├── common/             # Reusable UI primitives
│   └── features/           # Domain-specific components
│
└── pages/                  # Route-level components (thin shells)
```

---

## Layer Responsibilities

### 1. API Services (`src/api/`)

**Purpose**: Stateless HTTP calls. No refs, no reactivity.

```typescript
// ✅ Correct: pure async function, returns typed data
export async function fetchTasks(filters?: TaskFilter): Promise<PaginatedResult<Task>> {
  const response = await get<unknown>('/tasks');
  const raw = extractKey<BackendTask[]>(response, 'tasks');
  return ensureArray<BackendTask>(raw).map(mapTask);
}

// ❌ Wrong: service should NOT hold reactive state
export const tasks = ref<Task[]>([]);  // belongs in store or composable
```

**Rules**:
- Functions are `async`, return `Promise<T>`
- Map backend shapes to frontend types
- Use `extractKey()` / `ensureArray()` from `api/utils.ts`
- No `ref()`, no `computed()`, no Vue imports

---

### 2. Pinia Stores (`src/stores/`)

**Purpose**: Shared reactive state accessed by multiple components.

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchTasks } from '@/api/taskService';

export const useTaskStore = defineStore('tasks', () => {
  // State
  const tasks = ref<Task[]>([]);
  const isLoading = ref(false);

  // Getters (computed)
  const completedCount = computed(() =>
    tasks.value.filter(t => t.status === 'completed').length
  );

  // Actions
  async function load(): Promise<void> {
    isLoading.value = true;
    try {
      const result = await fetchTasks();
      tasks.value = result.items;
    } finally {
      isLoading.value = false;
    }
  }

  return { tasks, isLoading, completedCount, load };
});
```

**Rules**:
- Use **Composition API** style (`defineStore('id', () => { ... })`)
- State = `ref()`, Getters = `computed()`, Actions = `async function`
- Call API services — never make HTTP calls directly
- No UI concerns (no toasts, no router navigation)
- Store names: lowercase plural nouns (`tasks`, `agents`, `events`, `metrics`)

**When to use a store**:
- State shared across ≥2 components or pages
- Data that persists across route changes
- WebSocket-updated data consumed by multiple views

---

### 3. Composables (`src/composables/`)

**Purpose**: Component-scoped logic, lifecycle hooks, side effects.

```typescript
export function useTaskPagination() {
  const store = useTaskStore();
  const ws = useWebSocket();

  // Wire WS events to store
  ws.on('*', (event) => {
    if (isTaskEvent(event)) {
      store.patchTaskStatus(event.task_id, event.data.to, event.timestamp);
    }
  });

  // Page-specific orchestration
  function scheduleRefresh() { ... }

  onUnmounted(() => { /* cleanup */ });

  return { ...store, scheduleRefresh };
}
```

**Rules**:
- Can use `onMounted`, `onUnmounted`, `watch`, `watchEffect`
- Can compose stores + other composables
- Can handle side effects (WS subscriptions, timers, debouncing)
- Can include UI feedback (toasts, router navigation)
- Returned values are consumed by a single component

**When to use a composable vs a store**:
- **Composable**: page-specific orchestration, WS wiring, form state, debouncing
- **Store**: data shared across pages, global state, cache-worthy data

---

### 4. Pages (`src/pages/`)

**Purpose**: Thin shells — import composables/stores, bind to template.

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useTaskStore } from '@/stores';
import { useTaskPagination } from '@/composables/useTaskPagination';
import TaskTable from '@/components/features/TaskTable.vue';
import Pagination from '@/components/common/Pagination.vue';

const store = useTaskStore();
const { scheduleRefresh } = useTaskPagination();

onMounted(() => store.load());
</script>

<template>
  <TaskTable :tasks="store.filteredTasks" />
  <Pagination :page="store.currentPage" :total-items="store.total" />
</template>
```

**Rules**:
- Target: **<250 lines** per page
- Script section: imports, composable calls, `onMounted`
- No business logic — delegate to composables/stores
- Break large templates into feature components

---

## Typing Patterns

### API Response Mapping

```typescript
// Define backend shape (may differ from frontend)
interface BackendTask {
  id: string;
  status: string;         // raw string from backend
  assigned_to?: string | null;
}

// Map to frontend type with strict typing
function mapTask(raw: BackendTask): Task {
  return {
    id: raw.id,
    status: raw.status as TaskStatus,
    assigned_to: raw.assigned_to ?? null,
  };
}
```

### Store Typing

```typescript
// Stores use Composition API — types flow from ref/computed
const tasks = ref<Task[]>([]);                    // Ref<Task[]>
const count = computed(() => tasks.value.length);  // ComputedRef<number>

// Actions return void or the mutation result
async function load(): Promise<void> { ... }
function updateTask(id: string, task: Task): void { ... }
```

### Composable Return Types

```typescript
// Return object with explicit reactive types
export function useTaskPagination() {
  return {
    tasks: readonly(tasks),          // DeepReadonly<Ref<Task[]>>
    isLoading: readonly(isLoading),  // DeepReadonly<Ref<boolean>>
    load,                            // () => Promise<void>
  };
}
```

---

## Error Handling

```typescript
import { normalizeError } from '@/api/utils';

// In stores: set error state, don't throw on silent operations
async function load(opts: { silent?: boolean } = {}): Promise<void> {
  try {
    data.value = await fetchData();
    error.value = null;
  } catch (err) {
    error.value = normalizeError(err, 'Failed to load data');
    if (!opts.silent) throw err;
  }
}

// In composables: add UI feedback
async function handleAction() {
  try {
    await store.load();
    toast.success('Loaded');
  } catch (err) {
    toast.error(normalizeError(err, 'Failed'));
  }
}
```

---

## Migration Path (Composable → Store)

When migrating existing singleton composables to Pinia stores:

1. **Move state** from module-level `ref()` to store body
2. **Move computed** to store getters
3. **Move mutations** to store actions
4. **Keep composable** as orchestration wrapper that uses the store
5. **Update imports** in consuming components

```typescript
// BEFORE: singleton composable
const tasks = ref<Task[]>([]);  // module-level
export function useTasks() {
  return { tasks: readonly(tasks), load };
}

// AFTER: Pinia store + thin composable wrapper
export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  return { tasks, load };
});

// Composable wraps store + adds page-specific behavior
export function useTaskPage() {
  const store = useTaskStore();
  const ws = useWebSocket();
  ws.on('task_completed', () => store.load({ silent: true }));
  return store;
}
```

---

## Reference Pages

| Page | Lines | Pattern |
|------|-------|---------|
| `SessionsPage.vue` | 114 | `useAsyncState` + API service |
| `ConfigPage.vue` | 108 | `useConfigForm` + `useWorkspaces` composables |
| `TasksPage.vue` | 180 | `useTaskPagination` + `useTaskActions` + sub-components |
| `OrgChartPage.vue` | 60 | Minimal page with recursive component |

Use `SessionsPage.vue` or `ConfigPage.vue` as the simplest reference for new pages.
