<script setup lang="ts">
/**
 * OnboardingWizard — modal overlay for first-time users.
 * Shows only if localStorage flag is unset AND no company is active.
 * Stores completion in localStorage('shazam_onboarding_complete').
 */
import { ref, computed, onMounted } from 'vue';
import { useActiveCompany } from '@/composables/useActiveCompany';
import AppButton from '@/components/common/Button.vue';

const STORAGE_KEY = 'shazam_onboarding_complete';

const { activeCompany } = useActiveCompany();
const visible = ref(false);
const currentStep = ref(0);

const steps = [
  {
    title: 'Welcome to Shazam',
    subtitle: 'Your AI-powered development team',
    description: 'Shazam orchestrates autonomous AI agents that work together to build, test, and ship code. Think of it as a virtual engineering team that never sleeps.',
    icon: 'rocket',
  },
  {
    title: 'Connect a Project',
    subtitle: 'Set up your workspace',
    description: 'Start by creating a company configuration in your project root. Run `shazam init` in your terminal or configure it through the Settings page. This tells Shazam about your codebase, tech stack, and project goals.',
    icon: 'folder',
  },
  {
    title: 'Meet Your Agents',
    subtitle: 'The team hierarchy',
    description: 'Agents are organized in a hierarchy: a PM coordinates work, senior devs handle architecture, junior devs write code, and QA agents verify quality. Each agent has a role, budget, and set of tools. You can customize everything.',
    icon: 'users',
  },
  {
    title: 'Create Your First Task',
    subtitle: 'Put your team to work',
    description: 'Head to the Task Board and create a task. Describe what you want built, optionally assign it to a specific agent or let the PM decide. Tasks flow through a pipeline: creation, approval, execution, review, and completion.',
    icon: 'task',
  },
];

const step = computed(() => steps[currentStep.value]!);
const isFirst = computed(() => currentStep.value === 0);
const isLast = computed(() => currentStep.value === steps.length - 1);
const progress = computed(() => ((currentStep.value + 1) / steps.length) * 100);

function next() {
  if (isLast.value) {
    complete();
  } else {
    currentStep.value++;
  }
}

function back() {
  if (currentStep.value > 0) currentStep.value--;
}

function skip() {
  complete();
}

function complete() {
  localStorage.setItem(STORAGE_KEY, 'true');
  visible.value = false;
}

onMounted(() => {
  const done = localStorage.getItem(STORAGE_KEY);
  if (!done && !activeCompany.value) {
    visible.value = true;
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="onboarding">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/70 backdrop-blur-sm"
          @click="skip"
        />

        <!-- Modal -->
        <div
          class="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden"
          style="animation: slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both"
        >
          <!-- Progress bar -->
          <div class="h-0.5 bg-gray-800">
            <div
              class="h-full bg-shazam-500 transition-all duration-500"
              :style="{ width: `${progress}%` }"
            />
          </div>

          <!-- Step indicator -->
          <div class="flex items-center justify-between px-6 pt-5">
            <div class="flex items-center gap-1.5">
              <div
                v-for="(_, i) in steps"
                :key="i"
                class="h-1.5 rounded-full transition-all duration-300"
                :class="i === currentStep
                  ? 'w-6 bg-shazam-500'
                  : i < currentStep
                    ? 'w-1.5 bg-shazam-500/50'
                    : 'w-1.5 bg-gray-700'"
              />
            </div>
            <button
              class="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              @click="skip"
            >
              Skip
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-8">
            <!-- Icon -->
            <div class="mb-5">
              <div class="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-shazam-500/10 border border-shazam-500/20">
                <!-- Rocket -->
                <svg v-if="step.icon === 'rocket'" class="h-6 w-6 text-shazam-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
                <!-- Folder -->
                <svg v-else-if="step.icon === 'folder'" class="h-6 w-6 text-shazam-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <!-- Users -->
                <svg v-else-if="step.icon === 'users'" class="h-6 w-6 text-shazam-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <!-- Task -->
                <svg v-else class="h-6 w-6 text-shazam-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <!-- Text -->
            <h2 class="text-xl font-semibold text-white mb-1">{{ step.title }}</h2>
            <p class="text-sm text-shazam-400 mb-4">{{ step.subtitle }}</p>
            <p class="text-sm text-gray-400 leading-relaxed">{{ step.description }}</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between px-6 pb-6">
            <AppButton
              v-if="!isFirst"
              variant="ghost"
              size="sm"
              @click="back"
            >
              Back
            </AppButton>
            <span v-else />

            <AppButton
              variant="primary"
              size="sm"
              @click="next"
            >
              {{ isLast ? 'Get Started' : 'Next' }}
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.onboarding-enter-active {
  transition: opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.onboarding-leave-active {
  transition: opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.onboarding-enter-from,
.onboarding-leave-to {
  opacity: 0;
}
</style>
