import { ref, readonly, computed } from 'vue';
import type { Company } from '@/types';
import { fetchCompanies } from '@/api/companyService';

// ─── Singleton state ──────────────────────────────────────
const companies = ref<Company[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const initialized = ref(false);
const selectedCompanyName = ref<string | null>(null);
let loadPromise: Promise<Company[]> | null = null;

// ─── Derived state ────────────────────────────────────────
const activeCompany = computed<Company | null>(() => {
  // If user selected a company, use that
  if (selectedCompanyName.value) {
    const selected = companies.value.find((c) => c.name === selectedCompanyName.value);
    if (selected) return selected;
  }
  // Fallback: backend-active first, then first available
  const backendActive = companies.value.find((c) => c.status === 'active');
  return backendActive ?? companies.value[0] ?? null;
});

const projectName = computed(() => activeCompany.value?.name ?? 'Dashboard');

async function loadCompanies(): Promise<Company[]> {
  if (loadPromise) return loadPromise;

  isLoading.value = true;
  error.value = null;

  loadPromise = fetchCompanies()
    .then((result) => {
      companies.value = Array.isArray(result) ? result : [];

      // Also try health endpoint for daemon-managed companies
      return fetchHealthCompanies().then((healthCompanies) => {
        // Merge: add any companies from health that aren't in the list
        for (const name of healthCompanies) {
          if (!companies.value.find((c) => c.name === name)) {
            companies.value.push({
              name,
              status: 'active',
              agents: [],
              mission: '',
            } as unknown as Company);
          }
        }
        initialized.value = true;
        return companies.value;
      });
    })
    .catch((err) => {
      error.value = err instanceof Error ? err.message : 'Failed to load companies';
      // Try health endpoint as fallback
      return fetchHealthCompanies().then((healthCompanies) => {
        companies.value = healthCompanies.map((name) => ({
          name,
          status: 'active',
          agents: [],
          mission: '',
        } as unknown as Company));
        initialized.value = true;
        return companies.value;
      }).catch(() => companies.value);
    })
    .finally(() => {
      isLoading.value = false;
      loadPromise = null;
    });

  return loadPromise;
}

async function fetchHealthCompanies(): Promise<string[]> {
  try {
    const isTauri = '__TAURI__' in window;
    const base = isTauri ? 'http://127.0.0.1:4040' : '';
    const res = await fetch(`${base}/api/health`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.companies) ? data.companies : [];
  } catch {
    return [];
  }
}

function selectCompany(name: string | null) {
  selectedCompanyName.value = name;
}

// ─── Public composable ───────────────────────────────────
export function useActiveCompany() {
  return {
    activeCompany,
    projectName,
    companies: readonly(companies),
    isLoading: readonly(isLoading),
    error: readonly(error),
    initialized: readonly(initialized),
    selectedCompanyName: readonly(selectedCompanyName),
    loadCompanies,
    selectCompany,
  };
}
