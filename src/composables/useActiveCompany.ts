import { ref, readonly, computed } from 'vue';
import type { Company } from '@/types';
import { fetchCompanies } from '@/api/companyService';

// ─── Singleton state ──────────────────────────────────────
const companies = ref<Company[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const initialized = ref(false);
let loadPromise: Promise<Company[]> | null = null;

// ─── Derived state ────────────────────────────────────────
// Company is automatically resolved: backend-active first, then first available.
// No manual selection — the dashboard always reflects the current Shazam project.
const activeCompany = computed<Company | null>(() => {
  const backendActive = companies.value.find((c) => c.status === 'active');
  return backendActive ?? companies.value[0] ?? null;
});

async function loadCompanies(): Promise<Company[]> {
  // Deduplicate concurrent calls
  if (loadPromise) return loadPromise;

  isLoading.value = true;
  error.value = null;

  loadPromise = fetchCompanies()
    .then((result) => {
      companies.value = Array.isArray(result) ? result : [];
      initialized.value = true;
      return companies.value;
    })
    .catch((err) => {
      error.value = err instanceof Error ? err.message : 'Failed to load companies';
      return companies.value;
    })
    .finally(() => {
      isLoading.value = false;
      loadPromise = null;
    });

  return loadPromise;
}

// ─── Public composable ───────────────────────────────────
export function useActiveCompany() {
  return {
    activeCompany,
    companies: readonly(companies),
    isLoading: readonly(isLoading),
    error: readonly(error),
    initialized: readonly(initialized),
    loadCompanies,
  };
}
