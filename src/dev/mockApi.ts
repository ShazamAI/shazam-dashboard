/**
 * Vite plugin that serves mock API responses when the backend is unreachable.
 *
 * - Checks backend health every 10 seconds (HEAD request to /api/health)
 * - When backend is DOWN, intercepts /api/* requests and returns mock data
 * - When backend is UP, all requests pass through to the real proxy
 * - Responses use { data: [...] } wrapper (extractKey in http utils handles both formats)
 */
import type { Plugin } from 'vite';

let backendAvailable = true;
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

const BACKEND_URL = 'http://localhost:4040';
const HEALTH_CHECK_MS = 10_000;

async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════

const mockTasks = [
  { id: 'task-001', title: 'Initialize project structure', status: 'completed', assigned_to: 'senior_1', priority: 'high', created_at: new Date().toISOString() },
  { id: 'task-002', title: 'Set up CI/CD pipeline', status: 'in_progress', assigned_to: 'senior_2', priority: 'medium', created_at: new Date().toISOString() },
  { id: 'task-003', title: 'Design database schema', status: 'pending', assigned_to: 'senior_3', priority: 'high', created_at: new Date().toISOString() },
  { id: 'task-004', title: 'Implement authentication', status: 'awaiting_approval', assigned_to: 'senior_1', priority: 'high', created_at: new Date().toISOString() },
  { id: 'task-005', title: 'Write API documentation', status: 'failed', assigned_to: 'senior_2', priority: 'low', created_at: new Date().toISOString() },
];

const mockAgents = [
  { id: 'manager', name: 'Engineering Manager', role: 'manager', status: 'idle', domain: 'management' },
  { id: 'senior_1', name: 'Senior Dev 1', role: 'developer', status: 'busy', domain: 'dashboard' },
  { id: 'senior_2', name: 'Senior Dev 2', role: 'developer', status: 'idle', domain: 'vscode' },
  { id: 'senior_3', name: 'Senior Dev 3', role: 'developer', status: 'executing', domain: 'backend' },
];

const mockCompanies = [
  { id: 'company-001', name: 'Shazam AI', slug: 'shazam-ai', agents: mockAgents },
];

const mockRoutes: Record<string, unknown> = {
  '/api/tasks': { data: mockTasks },
  '/api/agents': { data: mockAgents },
  '/api/companies': { data: mockCompanies },
  '/api/config': { data: {} },
  '/api/health': { status: 'ok' },
  '/api/metrics': { data: { total_tokens: 0, total_cost: 0, tasks_completed: 0 } },
  '/api/events': { data: [] },
};

// ═══════════════════════════════════════════════════════════
// PLUGIN
// ═══════════════════════════════════════════════════════════

export function mockApiPlugin(): Plugin {
  return {
    name: 'shazam-mock-api',
    configureServer(server) {
      // Start health check loop
      const runCheck = async () => {
        backendAvailable = await checkBackendHealth();
      };
      runCheck();
      healthCheckInterval = setInterval(runCheck, HEALTH_CHECK_MS);

      // Clean up on server close
      server.httpServer?.on('close', () => {
        if (healthCheckInterval) {
          clearInterval(healthCheckInterval);
          healthCheckInterval = null;
        }
      });

      // Intercept API requests when backend is down
      server.middlewares.use((req, res, next) => {
        const reqUrl = req.url ?? '';
        if (backendAvailable || !reqUrl.startsWith('/api')) {
          return next();
        }

        // Strip query params for route matching
        const path = reqUrl.split('?')[0];
        const mockData = mockRoutes[path];

        if (mockData) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('X-Mock-Api', 'true');
          res.statusCode = 200;
          res.end(JSON.stringify(mockData));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: `Mock route not found: ${path}` }));
        }
      });
    },
  };
}
