<script setup lang="ts">
import { ref } from 'vue';
import {
  AVAILABLE_TOOLS,
  AVAILABLE_PROVIDERS,
} from '@/api/agentService';
import AppButton from '@/components/common/Button.vue';
import type { AgentWorker, CreateAgentPayload } from '@/types';
import { AGENT_ROLE_PRESETS } from '@/types';

const nameTouched = ref(false);

interface Props {
  formData: CreateAgentPayload;
  agents: AgentWorker[];
  isEditing: boolean;
  isSubmitting: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  submit: [];
  cancel: [];
  'update:formData': [data: CreateAgentPayload];
  toggleTool: [tool: string];
}>();

function updateField<K extends keyof CreateAgentPayload>(key: K, value: CreateAgentPayload[K]) {
  emit('update:formData', { ...props.formData, [key]: value });
}

function handleModulesInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  const modules = value.split(',').map(s => s.trim()).filter(Boolean);
  emit('update:formData', { ...props.formData, modules });
}
</script>

<template>
  <form class="space-y-4 p-4 sm:space-y-5 sm:p-6" @submit.prevent="emit('submit')">
    <!-- Name + Role row -->
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="form-label">Name *</label>
        <input
          :value="formData.name"
          type="text"
          :disabled="isEditing"
          placeholder="e.g., senior_dev_1"
          class="form-input w-full rounded-xl border bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition focus:outline-none focus:ring-1 disabled:opacity-50"
          :class="nameTouched && !formData.name.trim()
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
            : 'border-gray-700 focus:border-shazam-500 focus:ring-shazam-500/30'"
          @input="updateField('name', ($event.target as HTMLInputElement).value)"
          @blur="nameTouched = true"
        />
        <p v-if="nameTouched && !formData.name.trim()" class="mt-1 text-xs text-red-400">Name is required</p>
      </div>

      <div>
        <label class="form-label">Role *</label>
        <select
          :value="formData.role"
          class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
          @change="updateField('role', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="preset in AGENT_ROLE_PRESETS" :key="preset" :value="preset">{{ preset }}</option>
          <option value="custom">Custom Role</option>
        </select>
      </div>
    </div>

    <!-- Supervisor -->
    <div>
      <label class="form-label">Supervisor</label>
      <select
        :value="formData.supervisor ?? ''"
        class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
        @change="updateField('supervisor', ($event.target as HTMLSelectElement).value || null)"
      >
        <option value="">None</option>
        <option
          v-for="a in agents.filter(a => a.name !== formData.name)"
          :key="a.name"
          :value="a.name"
        >
          {{ a.name }} ({{ a.role }})
        </option>
      </select>
    </div>

    <!-- Model + Provider row -->
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="form-label">Model</label>
        <input
          :value="formData.model ?? ''"
          type="text"
          placeholder="e.g., claude-sonnet-4-20250514"
          class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
          @input="updateField('model', ($event.target as HTMLInputElement).value || null)"
        />
      </div>

      <div>
        <label class="form-label">Provider</label>
        <select
          :value="formData.provider ?? ''"
          class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
          @change="updateField('provider', ($event.target as HTMLSelectElement).value || null)"
        >
          <option value="">Default</option>
          <option v-for="p in AVAILABLE_PROVIDERS" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
    </div>

    <!-- Budget + Domain row -->
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="form-label">Token Budget</label>
        <input
          :value="formData.budget"
          type="number"
          min="0"
          step="10000"
          class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
          @input="updateField('budget', Math.max(0, Number(($event.target as HTMLInputElement).value)))"
        />
      </div>

      <div>
        <label class="form-label">Domain</label>
        <input
          :value="formData.domain ?? ''"
          type="text"
          placeholder="e.g., frontend, backend"
          class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
          @input="updateField('domain', ($event.target as HTMLInputElement).value || null)"
        />
      </div>
    </div>

    <!-- Modules -->
    <div>
      <label class="form-label">Modules (comma-separated)</label>
      <input
        :value="formData.modules?.join(', ') ?? ''"
        type="text"
        placeholder="e.g., src/components/, src/pages/"
        class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
        @input="handleModulesInput"
      />
    </div>

    <!-- Tools -->
    <div>
      <label class="form-label">Tools</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tool in AVAILABLE_TOOLS"
          :key="tool"
          type="button"
          class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200"
          :class="
            formData.tools?.includes(tool)
              ? 'border-shazam-500/50 bg-shazam-500/15 text-shazam-400 shadow-sm shadow-shazam-500/10'
              : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
          "
          @click="emit('toggleTool', tool)"
        >
          {{ tool }}
        </button>
      </div>
    </div>

    <!-- System Prompt -->
    <div>
      <label class="form-label">System Prompt</label>
      <textarea
        :value="formData.system_prompt ?? ''"
        rows="3"
        placeholder="Custom instructions for this agent..."
        class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
        @input="updateField('system_prompt', ($event.target as HTMLTextAreaElement).value || null)"
      />
    </div>

    <!-- Actions -->
    <div class="flex gap-3 border-t border-gray-800 pt-5">
      <AppButton
        variant="primary"
        type="submit"
        :loading="isSubmitting"
        :disabled="isSubmitting || !formData.name.trim()"
      >
        {{ isEditing ? 'Update Agent' : 'Deploy Agent' }}
      </AppButton>
      <AppButton variant="ghost" type="button" @click="emit('cancel')">
        Cancel
      </AppButton>
    </div>
  </form>
</template>
