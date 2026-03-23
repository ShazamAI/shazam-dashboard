# Contributing to Shazam Dashboard

Thank you for contributing to the Shazam Dashboard! This document outlines our development standards, code patterns, and workflow to keep our codebase clean, maintainable, and professional.

## Code Style

### Vue 3 & TypeScript
- **Vue 3 Composition API exclusively** — no Options API
- **TypeScript strict mode enabled** — all files must have explicit type annotations
- **No `any` types** without clear justification (document why if necessary)
- **Explicit return types** on all exported functions

### Styling
- **Tailwind CSS utility classes only** — use predefined utilities from our design system
- **No inline styles** — use Tailwind classes or keyframe animations in `<style>` blocks
- **No scoped CSS** unless for keyframe animations specific to a component
- **Typography**: Inter font for body text, JetBrains Mono for code

### Language & Formatting
- **Imperative mood** in code comments and commit messages ("add" not "added", "fix" not "fixed")
- **Clear variable names** — prefer `isLoading` over `loading`, `hasError` over `error`
- **Consistent quotes** — use double quotes for strings (enforced by project config)

---

## Component Patterns

### File Organization
Components follow this structure based on their scope:
- **Common components** → `src/components/common/` (Button, StatusBadge, LoadingSpinner, etc.)
- **Feature components** → `src/components/features/` (AgentCard, OrgTreeNode, EventFeed, etc.)
- **Layout components** → `src/components/layouts/` (AppLayout, TopHeader, Sidebar, etc.)
- **Page components** → `src/pages/` (DashboardPage, OrgChartPage, etc.)

### Script Setup Syntax
All Vue components use `<script setup lang="ts">` with TypeScript interfaces:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Agent } from '@/types'

interface Props {
  agents: Agent[]
  isLoading?: boolean
}

interface Emits {
  (e: 'select', agent: Agent): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
})

const emit = defineEmits<Emits>()

const selectedAgent = ref<Agent | null>(null)
const filteredAgents = computed(() => {
  return props.agents.filter(a => a.status !== 'inactive')
})

const handleSelect = (agent: Agent) => {
  selectedAgent.value = agent
  emit('select', agent)
}
</script>

<template>
  <!-- Template content -->
</template>

<style scoped>
/* Keyframe animations only, if needed */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
```

### Component Structure in SFCs
Follow this ordering: **Template → Script → Style**

```vue
<template>
  <!-- Markup -->
</template>

<script setup lang="ts">
  // Logic
</script>

<style scoped>
  /* Styles (minimal) */
</style>
```

### Props & Emits
- Define **Props** with `defineProps<T>()` using TypeScript interfaces
- Define **Emits** with `defineEmits<T>()` with proper event typing
- Use `withDefaults()` for optional props with defaults
- Avoid mutations of props — use `const` for readonly refs

---

## Composable Patterns

### Naming & Location
- **Prefix all composables with `use`** (e.g., `useAgents.ts`, `useWebSocket.ts`)
- **Store in `src/composables/`** directory
- **One composable per file** unless closely related

### Implementation Pattern
```typescript
// src/composables/useAgents.ts
import { ref, computed, watch, onUnmounted } from 'vue'
import { agentService } from '@/api/agentService'
import type { Agent } from '@/types'

export function useAgents() {
  const agents = ref<Agent[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const activeAgents = computed(() => {
    return agents.value.filter(a => a.status === 'active')
  })

  const fetchAgents = async () => {
    isLoading.value = true
    error.value = null
    try {
      agents.value = await agentService.list()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  watch(() => agents.value.length, () => {
    // React to changes
  })

  onUnmounted(() => {
    // Clean up side effects (timers, subscriptions, etc.)
  })

  return {
    agents,
    isLoading,
    error,
    activeAgents,
    fetchAgents,
  }
}
```

### Animation Composables
- **Respect `prefers-reduced-motion`** system preference
- Use `useReducedMotion()` composable to check system settings
- Return animation configs or skip animations if user prefers reduced motion

---

## Service Layer

### API Services
- **Isolate API calls** in `src/api/` directory
- **Use the HTTP client** from `src/api/http.ts` for all requests
- **Use `extractKey` pattern** for consistent response parsing
- **Type request/response shapes** in `src/types/index.ts`

```typescript
// src/api/agentService.ts
import { http, extractKey } from './http'
import type { Agent, ListAgentsResponse } from '@/types'

export const agentService = {
  async list(): Promise<Agent[]> {
    const response = await http.get<ListAgentsResponse>('/api/agents')
    return extractKey(response, 'agents', [])
  },

  async get(id: string): Promise<Agent | null> {
    try {
      const response = await http.get<Agent>(`/api/agents/${id}`)
      return response.data ?? null
    } catch {
      return null
    }
  },
}
```

---

## State Management (Pinia)

### Store Organization
- **Stores in `src/stores/`** directory
- **Follow layered architecture** — see `src/stores/ARCHITECTURE.md` for detailed patterns
- **Composables wrap store access** — components use composables, not stores directly

### Store Patterns
```typescript
// src/stores/agents.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { agentService } from '@/api/agentService'
import type { Agent } from '@/types'

export const useAgentStore = defineStore('agents', () => {
  const agents = ref<Agent[]>([])
  const isLoading = ref(false)

  const activeAgents = computed(() => {
    return agents.value.filter(a => a.status === 'active')
  })

  const fetchAgents = async () => {
    isLoading.value = true
    try {
      agents.value = await agentService.list()
    } finally {
      isLoading.value = false
    }
  }

  return { agents, isLoading, activeAgents, fetchAgents }
})
```

---

## Naming Conventions

### Files
- **Vue components**: `PascalCase` (e.g., `AgentCard.vue`, `TopHeader.vue`)
- **TypeScript files**: `camelCase` (e.g., `useAgents.ts`, `agentService.ts`)
- **Types/interfaces**: `PascalCase` in `src/types/index.ts`

### Code
- **Components in templates**: `PascalCase` (e.g., `<AgentCard />`, `<StatusBadge />`)
- **Variables/functions**: `camelCase` (e.g., `isLoading`, `handleClick`, `fetchAgents`)
- **Types/interfaces**: `PascalCase` (e.g., `Agent`, `TaskStatus`, `ApiResponse`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_AGENTS`, `DEFAULT_TIMEOUT`)
- **Boolean variables**: `is*` or `has*` prefix (e.g., `isActive`, `hasError`)

### Directories
- `src/components/` → component files
- `src/composables/` → composable logic
- `src/pages/` → page components
- `src/api/` → API services
- `src/stores/` → Pinia stores
- `src/types/` → TypeScript types & interfaces
- `src/styles/` → global CSS, design tokens

---

## TypeScript Requirements

### Strict Mode
All files follow **strict TypeScript configuration**:
- No implicit `any` types
- Explicit return types on exported functions
- Null/undefined must be explicitly handled

### Type Definitions
- **Use `interface`** for object shapes (prefer for extensibility)
- **Use `type`** for unions, intersections, and aliases
- **Import types** at component tops with `import type { ... }`

```typescript
// ✅ Good
interface Agent {
  id: string
  name: string
  status: 'active' | 'inactive'
}

type AgentStatus = 'active' | 'inactive' | 'pending'

const agent = ref<Agent | null>(null)

// ❌ Bad
const agent = ref<any>(null) // No any!
const status: string = 'active' // Should be AgentStatus
```

### Props & Emits Typing
Always type props and emits:

```typescript
// ✅ Good
interface Props {
  agents: Agent[]
  selectedId?: string
  isLoading?: boolean
}

interface Emits {
  (e: 'select', agent: Agent): void
  (e: 'refresh'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// ❌ Bad
const props = defineProps({
  agents: Array, // No type info!
})
```

---

## Commit Messages

### Format
```
type: short description
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring (no behavior change)
- `chore` - Build, dependencies, tooling
- `docs` - Documentation updates
- `style` - Formatting, missing semicolons, etc.
- `perf` - Performance improvements

### Examples
```
feat: add agent status polling with 5s interval
fix: prevent task overview zero flash on rapid updates
refactor: extract task filters to computed properties
perf: debounce websocket event handlers
docs: update CONTRIBUTING.md with animation patterns
chore: upgrade tailwind to v3.4
```

### Guidelines
- **Subject line**: under 72 characters
- **Imperative mood**: "add" not "added" or "adds"
- **No period** at end of subject line
- **Body** (optional): explain _why_, not _what_

---

## Pull Request Process

### Branch Naming
```
feature/description     # New feature
fix/description         # Bug fix
refactor/description    # Code refactoring
chore/description       # Tooling, dependencies, config
```

### PR Checklist
- [ ] **Branch name** follows convention
- [ ] **PR title** matches commit convention
- [ ] **Commit messages** are clear and follow format
- [ ] **TypeScript check passes**: `vue-tsc --noEmit`
- [ ] **Build succeeds**: `vite build`
- [ ] **Bundle size** doesn't increase >10% without justification
- [ ] **Description** includes bullet points and test plan
- [ ] **No console.logs** or debug code
- [ ] **Components are accessible** (proper ARIA labels, keyboard navigation)

### PR Description Template
```markdown
## Summary
- Brief description of changes
- What feature/fix this implements

## Test Plan
- [ ] Tested on desktop viewport
- [ ] Tested on mobile (< 640px)
- [ ] Tested on tablet (640px - 1024px)
- [ ] TypeScript type-check passes
- [ ] Production build succeeds
- [ ] No visual regressions

## Related Issues
Closes #123
```

---

## Testing Policy

### For Developers
- **You write testable code** with good separation of concerns
- **Composables are independently testable** (pure functions when possible)
- **Components are modular** and avoid tight coupling
- **You do NOT write tests** — QA handles all testing

### For QA
- QA team owns all testing (unit, integration, E2E)
- Report bugs through the issue tracker with reproduction steps
- Verify fixes in follow-up testing

---

## Development Setup

### Prerequisites
- Node.js 18+ (check `.nvmrc` or `package.json` for exact version)
- npm 9+ or yarn 3+

### Installation
```bash
# Install dependencies
npm install

# Start development server (opens at http://localhost:5173)
npm run dev

# Type check (runs before every commit)
vue-tsc --noEmit

# Build for production
vite build

# Preview production build locally
vite preview
```

### Environment Variables
Create a `.env.local` file in the project root (ignored by git):
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### Common Issues

**Port 5173 already in use**
```bash
npm run dev -- --port 3000
```

**Stale cache causing hot reload issues**
```bash
rm -rf .vite node_modules/.vite
npm run dev
```

**TypeScript errors in editor but build passes**
- Restart your IDE's TypeScript server (Cmd+Shift+P → "Restart TS Server" in VS Code)

---

## Code Review Checklist

When reviewing PRs, check:
- ✅ Code follows Vue 3 Composition API patterns
- ✅ TypeScript is strict (no `any` without justification)
- ✅ Tailwind only (no inline styles except animations)
- ✅ Props/emits are typed
- ✅ Composables use `use` prefix and are in correct folder
- ✅ API calls use `agentService`/`http.ts` pattern
- ✅ Components are in correct directory
- ✅ Naming follows conventions (camelCase, PascalCase, etc.)
- ✅ No console.logs or debug code
- ✅ Commit messages are clear and follow format
- ✅ Bundle size impact is acceptable

---

## Questions?

For architecture questions, see `src/stores/ARCHITECTURE.md`. For design system details, check `src/styles/design-tokens.ts`. For motion/animation patterns, review `src/composables/useMotion.ts`.

Welcome to the team! 🚀
