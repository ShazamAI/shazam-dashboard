<script setup lang="ts">
/**
 * TaskTimeline — vertical timeline showing the lifecycle of a task.
 * Renders events derived from task data: creation, pipeline stages, updates.
 */
import { computed } from 'vue';
import type { Task, PipelineStage } from '@/types';

const props = defineProps<{
  task: Task;
}>();

interface TimelineEvent {
  id: string;
  label: string;
  description: string;
  actor: string | null;
  timestamp: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  icon: 'create' | 'approve' | 'start' | 'stage' | 'complete' | 'fail' | 'update';
}

const events = computed<TimelineEvent[]>(() => {
  const items: TimelineEvent[] = [];
  const t = props.task;

  // 1. Task created
  items.push({
    id: 'created',
    label: 'Task Created',
    description: `"${t.title}" was created`,
    actor: t.created_by,
    timestamp: t.created_at,
    status: 'completed',
    icon: 'create',
  });

  // 2. If the task was approved (moved from awaiting_approval to another state)
  // Infer approval if status is beyond pending and there's a pipeline
  if (t.pipeline && t.pipeline.length > 0) {
    // Show each pipeline stage
    for (let i = 0; i < t.pipeline.length; i++) {
      const stage = t.pipeline[i] as PipelineStage;
      const isCurrent = t.current_stage === i;

      let stageStatus: TimelineEvent['status'] = 'pending';
      if (stage.status === 'completed') stageStatus = 'completed';
      else if (stage.status === 'in_progress' || isCurrent) stageStatus = 'in_progress';
      else if (stage.status === 'rejected') stageStatus = 'failed';

      // Stage started event
      if (stage.started_at) {
        items.push({
          id: `stage-start-${i}`,
          label: `${stage.name} Started`,
          description: `Stage "${stage.name}" (${stage.role}) began`,
          actor: stage.assigned_to,
          timestamp: stage.started_at,
          status: stageStatus === 'completed' ? 'completed' : stageStatus,
          icon: 'start',
        });
      }

      // Stage completed event
      if (stage.completed_at && stage.status === 'completed') {
        items.push({
          id: `stage-done-${i}`,
          label: `${stage.name} Completed`,
          description: stage.output ? `Output: ${stage.output.slice(0, 80)}...` : `Stage "${stage.name}" completed`,
          actor: stage.completed_by,
          timestamp: stage.completed_at,
          status: 'completed',
          icon: 'stage',
        });
      }

      // Stage rejected
      if (stage.status === 'rejected') {
        items.push({
          id: `stage-reject-${i}`,
          label: `${stage.name} Rejected`,
          description: stage.output || `Stage "${stage.name}" was rejected`,
          actor: stage.completed_by,
          timestamp: stage.completed_at || t.updated_at,
          status: 'failed',
          icon: 'fail',
        });
      }

      // Current in-progress stage (no completed_at yet)
      if (isCurrent && stage.status === 'in_progress' && !stage.completed_at) {
        items.push({
          id: `stage-progress-${i}`,
          label: `${stage.name} In Progress`,
          description: `Currently being worked on by ${stage.assigned_to || stage.role}`,
          actor: stage.assigned_to,
          timestamp: stage.started_at || t.updated_at,
          status: 'in_progress',
          icon: 'stage',
        });
      }
    }
  }

  // 3. Terminal state
  if (t.status === 'completed') {
    items.push({
      id: 'completed',
      label: 'Task Completed',
      description: 'Task finished successfully',
      actor: t.assigned_to,
      timestamp: t.updated_at,
      status: 'completed',
      icon: 'complete',
    });
  } else if (t.status === 'failed') {
    items.push({
      id: 'failed',
      label: 'Task Failed',
      description: typeof t.result === 'string' ? t.result : 'Task execution failed',
      actor: t.assigned_to,
      timestamp: t.updated_at,
      status: 'failed',
      icon: 'fail',
    });
  }

  // 4. Latest activity if different from last event
  const lastTimestamp = items[items.length - 1]?.timestamp;
  if (lastTimestamp && t.updated_at !== lastTimestamp && t.status !== 'completed' && t.status !== 'failed') {
    items.push({
      id: 'updated',
      label: 'Latest Activity',
      description: `Status: ${t.status.replace(/_/g, ' ')}`,
      actor: t.assigned_to,
      timestamp: t.updated_at,
      status: t.status === 'in_progress' ? 'in_progress' : 'pending',
      icon: 'update',
    });
  }

  // Sort by timestamp
  return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
});

function formatTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const statusDotClass: Record<string, string> = {
  completed: 'bg-emerald-500 shadow-emerald-500/30',
  in_progress: 'bg-shazam-500 shadow-shazam-500/30 animate-pulse',
  pending: 'bg-gray-600',
  failed: 'bg-red-500 shadow-red-500/30',
};

const statusLineClass: Record<string, string> = {
  completed: 'bg-emerald-500/30',
  in_progress: 'bg-shazam-500/30',
  pending: 'bg-gray-700',
  failed: 'bg-red-500/30',
};
</script>

<template>
  <div class="rounded-xl border border-gray-800 bg-gray-900 p-4">
    <h3 class="text-sm font-medium text-white mb-4">Timeline</h3>

    <div v-if="events.length === 0" class="text-center py-6">
      <p class="text-xs text-gray-600">No timeline events</p>
    </div>

    <div v-else class="relative">
      <div
        v-for="(event, i) in events"
        :key="event.id"
        class="relative flex gap-3 pb-5 last:pb-0"
      >
        <!-- Vertical line -->
        <div class="flex flex-col items-center">
          <!-- Dot -->
          <div
            class="relative z-10 h-3 w-3 rounded-full shrink-0 shadow-sm"
            :class="statusDotClass[event.status]"
          />
          <!-- Line segment -->
          <div
            v-if="i < events.length - 1"
            class="w-0.5 flex-1 mt-1"
            :class="statusLineClass[event.status]"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0 -mt-0.5">
          <div class="flex items-start justify-between gap-2">
            <p class="text-xs font-medium text-gray-200">{{ event.label }}</p>
            <span class="text-[10px] text-gray-600 shrink-0 tabular-nums">{{ formatTime(event.timestamp) }}</span>
          </div>
          <p class="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{{ event.description }}</p>
          <p v-if="event.actor" class="text-[10px] text-gray-600 mt-0.5">
            by <span class="text-gray-400">{{ event.actor }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
