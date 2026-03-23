# Shazam Dashboard — Setup & Development Guide

## Prerequisites

| Tool       | Minimum Version | Recommended   |
|------------|-----------------|---------------|
| Node.js    | 18.x            | 24.x LTS      |
| npm        | 9.x             | 11.x          |

Verify your versions:

```bash
node -v   # v18.0.0+
npm -v    # 9.0.0+
```

## Quick Start

```bash
# 1. Clone & navigate
cd shazam-dashboard

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

The dashboard opens at **http://localhost:3000**.

## Available Scripts

| Command            | Description                                            |
|--------------------|--------------------------------------------------------|
| `npm run dev`      | Start Vite dev server on port 3000 with HMR            |
| `npm run build`    | Type-check with `vue-tsc` then build for production     |
| `npm run preview`  | Preview the production build locally                    |

## Tech Stack

| Layer            | Technology                      |
|------------------|---------------------------------|
| Framework        | Vue 3 (Composition API, `<script setup>`) |
| Language         | TypeScript (strict mode)         |
| Build            | Vite 6                           |
| Styling          | Tailwind CSS 3                   |
| State Management | Pinia + Vue composables          |
| Routing          | Vue Router 4                     |

## Project Structure

```
shazam-dashboard/
├── src/
│   ├── api/              # HTTP client & service layer
│   ├── components/
│   │   ├── common/       # Reusable UI (Button, StatusBadge, Pagination, etc.)
│   │   ├── features/     # Feature-specific components (TaskTable, AgentCard, etc.)
│   │   └── layouts/      # AppLayout, TopHeader, SidebarNav, MobileSidebar
│   ├── composables/      # Shared reactive logic (useWebSocket, useMotion, etc.)
│   ├── dev/              # Dev-only tooling (mock API plugin)
│   ├── pages/            # Route-level views
│   ├── router/           # Vue Router configuration
│   ├── stores/           # Pinia stores
│   ├── styles/           # Global CSS, design tokens, color utilities
│   └── types/            # TypeScript interfaces and type definitions
├── public/               # Static assets
├── tailwind.config.js    # Tailwind theme (brand colors, surfaces, animations)
├── tsconfig.json         # App TypeScript config (browser)
├── tsconfig.node.json    # Tooling TypeScript config (Node/Vite)
├── vite.config.ts        # Vite plugins, proxy, dev server
└── postcss.config.js     # PostCSS pipeline (Tailwind + Autoprefixer)
```

## API Proxy Configuration

The dev server proxies API and WebSocket requests to the backend:

| Path   | Target                        | Protocol |
|--------|-------------------------------|----------|
| `/api` | `http://localhost:4040`       | HTTP     |
| `/ws`  | `ws://localhost:4040`         | WebSocket|

This is configured in `vite.config.ts`:

```ts
server: {
  port: 3000,
  proxy: {
    '/api': { target: 'http://localhost:4040', changeOrigin: true },
    '/ws':  { target: 'ws://localhost:4040', ws: true },
  },
},
```

### Running Without a Backend (Mock API)

The dashboard includes a built-in mock API plugin (`src/dev/mockApi.ts`) that activates **automatically** when the backend is unreachable:

- Checks backend health every 10 seconds via `HEAD /api/health`
- When backend is **down**: intercepts `/api/*` requests and returns mock data
- When backend is **up**: all requests pass through to the real proxy
- Mock responses include the `X-Mock-Api: true` header for identification

**You do not need the backend running to develop UI features.** The mock API provides sample data for tasks, agents, companies, config, metrics, and events.

Mock routes served:

| Endpoint          | Mock Data                          |
|-------------------|------------------------------------|
| `/api/tasks`      | 5 sample tasks (various statuses)  |
| `/api/agents`     | 4 sample agents (various states)   |
| `/api/companies`  | 1 company with nested agents       |
| `/api/config`     | Empty config object                |
| `/api/health`     | `{ status: "ok" }`                 |
| `/api/metrics`    | Zeroed metrics counters            |
| `/api/events`     | Empty events array                 |

## Building for Production

```bash
npm run build
```

This runs two steps sequentially:
1. **`vue-tsc`** — Full TypeScript type-check (zero errors required)
2. **`vite build`** — Bundles to `dist/` with code-splitting per page

Output structure:
```
dist/
├── index.html
└── assets/
    ├── index-*.js          # Core framework (~132 kB, ~50 kB gzipped)
    ├── index-*.css         # Global styles + Tailwind (~72 kB, ~12 kB gzipped)
    ├── DashboardPage-*.js  # Per-page lazy chunks
    ├── TasksPage-*.js
    ├── AgentsPage-*.js
    └── ...
```

Preview the production build:
```bash
npm run preview
```

## TypeScript Configuration

The project uses two TypeScript configs:

| File                  | Scope                                     |
|-----------------------|-------------------------------------------|
| `tsconfig.json`       | App code (`src/**`) — browser environment  |
| `tsconfig.node.json`  | Tooling (`vite.config.ts`, `src/dev/**`) — Node environment |

Key compiler options:
- `strict: true` — Full strict mode
- `noUncheckedIndexedAccess: true` — Indexed access returns `T | undefined`
- `noUnusedLocals` / `noUnusedParameters` — No dead code allowed
- Path alias: `@/` maps to `src/`

## Design System

The dashboard uses a custom design system built on Tailwind:

- **Brand colors**: `shazam-50` through `shazam-900` (golden-amber palette)
- **Surface system**: Layered dark theme (`surface`, `surface-card`, `surface-raised`, `surface-overlay`)
- **Domain colors**: Per-workspace accents (dashboard=violet, vscode=sky, backend=emerald, etc.)
- **Motion system**: 11 Vue transitions, `useMotion` composables, `prefers-reduced-motion` support
- **Design tokens**: Programmatic token definitions in `src/styles/design-tokens.ts`
- **Color utilities**: Centralized in `src/styles/colors.ts` — use these instead of ad-hoc color maps

See `src/BUTTON_DESIGN_SPEC.md` for the component design specification.

## Troubleshooting

### `Cannot find module './src/dev/mockApi'`

The mock API plugin file is missing. Ensure `src/dev/mockApi.ts` exists. This file is required by `vite.config.ts` for both dev and build.

### Build fails with TypeScript errors

```bash
# Run type-check separately for better error output
npx vue-tsc --noEmit
```

Common causes:
- Using `any` type (strict mode forbids it)
- Unused variables or parameters
- Missing null checks on indexed access (`noUncheckedIndexedAccess`)

### Port 3000 already in use

```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or start on a different port
npx vite --port 3001
```

### API requests return 404 or timeout

1. Check if the backend is running on port 4040
2. If developing without a backend, verify mock API is active — look for `X-Mock-Api: true` header in browser DevTools Network tab
3. The mock API health check runs every 10s, so there may be a brief delay on startup before it detects the backend is down

### Tailwind classes not applying

- Verify the class exists in Tailwind's default set or is defined in `tailwind.config.js`
- Custom classes (e.g., `bg-surface-card`, `text-shazam-400`) are defined in the theme extension
- Run a clean build if HMR seems stale: stop the server and restart with `npm run dev`

### WebSocket connection fails

The WebSocket proxy (`/ws`) requires the backend to be running on `ws://localhost:4040`. Without a backend, WebSocket features (real-time event feed, live status updates) will not function — the mock API only covers HTTP endpoints.

### HMR (Hot Module Replacement) not working

- Ensure you're accessing the dashboard via `http://localhost:3000` (not a production build)
- Check browser console for WebSocket connection errors to the Vite HMR server
- Try a hard refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`)
