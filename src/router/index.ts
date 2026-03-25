import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useActiveCompany } from '@/composables/useActiveCompany';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Projects',
    component: () => import('@/pages/ProjectsPage.vue'),
    meta: { title: 'Projects', icon: 'projects' },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: { title: 'Dashboard', icon: 'home' },
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/pages/TasksPage.vue'),
    meta: { title: 'Tasks', icon: 'tasks' },
  },
  {
    path: '/agents',
    name: 'Agents',
    component: () => import('@/pages/AgentsPage.vue'),
    meta: { title: 'Agents', icon: 'agents' },
  },
  {
    path: '/org-chart',
    name: 'OrgChart',
    component: () => import('@/pages/OrgChartPage.vue'),
    meta: { title: 'Org Chart', icon: 'org-chart' },
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('@/pages/ConfigPage.vue'),
    meta: { title: 'Config', icon: 'config' },
  },
  {
    path: '/metrics',
    name: 'Metrics',
    component: () => import('@/pages/MetricsPage.vue'),
    meta: { title: 'Metrics', icon: 'metrics' },
  },
  {
    path: '/memory',
    name: 'Memory',
    component: () => import('@/pages/MemoryBrowserPage.vue'),
    meta: { title: 'Memory', icon: 'memory' },
  },
  {
    path: '/sessions',
    name: 'Sessions',
    component: () => import('@/pages/SessionsPage.vue'),
    meta: { title: 'Sessions', icon: 'sessions' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Update document title on route change — uses the active project name dynamically
router.afterEach((to) => {
  const { projectName } = useActiveCompany();
  const title = (to.meta?.title as string) ?? 'Dashboard';
  document.title = `${title} — ${projectName.value}`;
});

export default router;
export { routes };
