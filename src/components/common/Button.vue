<script setup lang="ts">
/**
 * Reusable Button component — enforces consistent sizing, colors, and states
 * across the dashboard. Integrates with the Shazam design system tokens.
 *
 * Variants:
 *   primary   — Brand gold, high-emphasis CTA
 *   secondary — Bordered, low-emphasis alternative action
 *   danger    — Red, destructive or reject actions
 *   ghost     — Transparent, tertiary / cancel / close
 *   success   — Green, approve / confirm actions
 *   warning   — Yellow, pause / caution actions
 *   info      — Purple, informational actions
 *   outline   — Bordered with shazam accent, mid-emphasis
 *
 * Sizes:  xs | sm | md | lg
 *
 * @example
 * <AppButton variant="primary" @click="save">Save</AppButton>
 * <AppButton variant="danger" size="sm" :loading="isSaving">Delete</AppButton>
 * <AppButton variant="ghost" icon-only aria-label="Close"><XIcon /></AppButton>
 * <AppButton variant="secondary" size="lg" disabled>Unavailable</AppButton>
 * <AppButton as="a" href="/docs" variant="ghost">Docs</AppButton>
 */
import { computed, useAttrs } from 'vue';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning' | 'info' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface Props {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Disable the button */
  disabled?: boolean;
  /** Render as icon-only (square padding, no min-width) */
  iconOnly?: boolean;
  /** Render as a different element (e.g. 'a' for links) */
  as?: 'button' | 'a';
  /** Button type attribute (only for <button>) */
  type?: 'button' | 'submit' | 'reset';
  /** Full-width block button */
  block?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  iconOnly: false,
  as: 'button',
  type: 'button',
  block: false,
});

defineEmits<{
  click: [event: MouseEvent];
}>();

const attrs = useAttrs();

// ─── Variant Styling ─────────────────────────────────────
// Each variant includes: bg, text, hover, active, border (where applicable),
// focus-visible ring, and an optional glow for the primary variant.

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-shazam-500 text-gray-950 font-semibold',
    'border border-shazam-400/20',
    'hover:bg-shazam-400 hover:shadow-glow-sm',
    'active:bg-shazam-600',
    'focus-visible:ring-2 focus-visible:ring-shazam-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ].join(' '),

  secondary: [
    'bg-transparent text-gray-300',
    'border border-gray-700',
    'hover:bg-gray-800 hover:text-gray-100 hover:border-gray-600',
    'active:bg-gray-700',
    'focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ].join(' '),

  outline: [
    'bg-transparent text-shazam-400',
    'border border-shazam-500/30',
    'hover:bg-shazam-500/10 hover:border-shazam-500/50',
    'active:bg-shazam-500/15',
    'focus-visible:ring-2 focus-visible:ring-shazam-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ].join(' '),

  danger: [
    'bg-red-500/15 text-red-300',
    'border border-red-500/20',
    'hover:bg-red-500/25 hover:text-red-200 hover:border-red-500/30',
    'active:bg-red-500/30',
    'focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ].join(' '),

  ghost: [
    'bg-transparent text-gray-400',
    'border border-transparent',
    'hover:bg-gray-800 hover:text-gray-200',
    'active:bg-gray-700',
    'focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ].join(' '),

  success: [
    'bg-emerald-500/15 text-emerald-300',
    'border border-emerald-500/20',
    'hover:bg-emerald-500/25 hover:text-emerald-200 hover:border-emerald-500/30',
    'active:bg-emerald-500/30',
    'focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ].join(' '),

  warning: [
    'bg-yellow-500/15 text-yellow-300',
    'border border-yellow-500/20',
    'hover:bg-yellow-500/25 hover:text-yellow-200 hover:border-yellow-500/30',
    'active:bg-yellow-500/30',
    'focus-visible:ring-2 focus-visible:ring-yellow-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ].join(' '),

  info: [
    'bg-purple-500/15 text-purple-300',
    'border border-purple-500/20',
    'hover:bg-purple-500/25 hover:text-purple-200 hover:border-purple-500/30',
    'active:bg-purple-500/30',
    'focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ].join(' '),
};

// ─── Size Styling ────────────────────────────────────────

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2 py-1.5 text-[10px] gap-1 rounded-md min-h-[32px]',
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg min-h-[36px]',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg min-h-[44px]',
  lg: 'px-5 py-2.5 text-base gap-2.5 rounded-xl min-h-[48px]',
};

const iconOnlySizeClasses: Record<ButtonSize, string> = {
  xs: 'p-1.5 rounded-md min-h-[32px] min-w-[32px]',
  sm: 'p-2 rounded-lg min-h-[36px] min-w-[36px]',
  md: 'p-2.5 rounded-lg min-h-[44px] min-w-[44px]',
  lg: 'p-3 rounded-xl min-h-[48px] min-w-[48px]',
};

// Spinner sizes matched to button sizes
const spinnerClasses: Record<ButtonSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

// ─── Composed Class ──────────────────────────────────────

const buttonClasses = computed(() => {
  const base = [
    'inline-flex items-center justify-center',
    'font-medium select-none',
    'transition-all duration-200 ease-smooth',
    'focus:outline-none',
  ].join(' ');

  const variant = variantClasses[props.variant];
  const size = props.iconOnly ? iconOnlySizeClasses[props.size] : sizeClasses[props.size];
  const state = (props.disabled || props.loading)
    ? 'cursor-not-allowed opacity-50'
    : 'cursor-pointer active:scale-[0.97]';
  const block = props.block ? 'w-full' : '';

  return [base, variant, size, state, block, attrs.class].filter(Boolean).join(' ');
});

const isDisabled = computed(() => props.disabled || props.loading);
</script>

<template>
  <component
    :is="as"
    :class="buttonClasses"
    :disabled="as === 'button' ? isDisabled : undefined"
    :type="as === 'button' ? type : undefined"
    :aria-disabled="isDisabled || undefined"
    :aria-busy="loading || undefined"
    :tabindex="isDisabled && as === 'a' ? -1 : undefined"
    @click="!isDisabled && $emit('click', $event)"
  >
    <!-- Loading spinner — sized to match button -->
    <svg
      v-if="loading"
      :class="['animate-spin', spinnerClasses[size]]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>

    <!-- Default slot for button content -->
    <slot />
  </component>
</template>
