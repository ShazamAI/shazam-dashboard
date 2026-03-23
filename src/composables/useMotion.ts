import { ref, onMounted, onUnmounted, watch, readonly, type Ref } from 'vue';

// ═══════════════════════════════════════════════════════════
// REDUCED MOTION — Respects prefers-reduced-motion
// ═══════════════════════════════════════════════════════════

const _prefersReducedMotion = ref(false);
let _mediaQuery: MediaQueryList | null = null;
let _initialized = false;

function initReducedMotion() {
  if (_initialized || typeof window === 'undefined') return;
  _initialized = true;
  _mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  _prefersReducedMotion.value = _mediaQuery.matches;
  _mediaQuery.addEventListener('change', (e) => {
    _prefersReducedMotion.value = e.matches;
  });
}

/**
 * Composable: Detect if user prefers reduced motion.
 *
 * Usage:
 *   const { prefersReducedMotion } = useReducedMotion();
 *   const duration = prefersReducedMotion.value ? 0 : 300;
 */
export function useReducedMotion() {
  onMounted(initReducedMotion);
  return { prefersReducedMotion: readonly(_prefersReducedMotion) };
}

// ═══════════════════════════════════════════════════════════
// STAGGERED ENTRANCE — List animation delays
// ═══════════════════════════════════════════════════════════

/**
 * Composable: Staggered entrance animations for lists.
 *
 * Usage:
 *   const { itemStyle } = useStaggeredEntrance(items);
 *   <div v-for="(item, i) in items" :style="itemStyle(i)" class="animate-stagger-fade-in">
 */
export function useStaggeredEntrance(
  _items: Ref<unknown[]>,
  options: { delay?: number; baseDelay?: number } = {},
) {
  const { delay = 50, baseDelay = 100 } = options;
  const isVisible = ref(false);

  onMounted(() => {
    requestAnimationFrame(() => {
      isVisible.value = true;
    });
  });

  function itemStyle(index: number): Record<string, string> {
    if (!isVisible.value || _prefersReducedMotion.value) {
      return _prefersReducedMotion.value ? {} : { opacity: '0' };
    }
    return {
      animationDelay: `${baseDelay + index * delay}ms`,
    };
  }

  return { isVisible, itemStyle };
}

// ═══════════════════════════════════════════════════════════
// PAGE ENTRANCE — Mount-triggered entrance state
// ═══════════════════════════════════════════════════════════

/**
 * Composable: Page entrance animation state.
 * Returns a ref that becomes true after mount.
 */
export function usePageEntrance() {
  const entered = ref(false);

  onMounted(() => {
    requestAnimationFrame(() => {
      entered.value = true;
    });
  });

  return { entered };
}

// ═══════════════════════════════════════════════════════════
// COUNT UP — Animated number transitions
// ═══════════════════════════════════════════════════════════

/**
 * Composable: Count-up animation for numeric values.
 * Watches target and re-animates on change.
 *
 * Usage:
 *   const { displayValue } = useCountUp(targetValue);
 *   <span>{{ displayValue }}</span>
 */
export function useCountUp(
  target: Ref<number>,
  options: { duration?: number; decimals?: number } = {},
) {
  const { duration = 800, decimals = 0 } = options;
  const displayValue = ref(0);
  let animationFrame: number | null = null;

  function animate(from: number, to: number) {
    if (_prefersReducedMotion.value) {
      displayValue.value = to;
      return;
    }

    if (animationFrame) cancelAnimationFrame(animationFrame);
    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      displayValue.value = Number((from + (to - from) * eased).toFixed(decimals));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      } else {
        displayValue.value = to;
      }
    }

    animationFrame = requestAnimationFrame(step);
  }

  onMounted(() => {
    animate(0, target.value);
  });

  // Re-animate when target changes
  watch(target, (newVal, oldVal) => {
    if (newVal !== oldVal) {
      animate(displayValue.value, newVal);
    }
  });

  return { displayValue, animate };
}

// ═══════════════════════════════════════════════════════════
// INTERSECTION OBSERVER — Animate on scroll into view
// ═══════════════════════════════════════════════════════════

/**
 * Composable: Trigger animation when element enters viewport.
 *
 * Usage:
 *   const { elementRef, isInView } = useInView();
 *   <div ref="elementRef" :class="isInView ? 'animate-fade-in-up' : 'opacity-0'">
 */
export function useInView(options: { threshold?: number; once?: boolean } = {}) {
  const { threshold = 0.1, once = true } = options;
  const elementRef = ref<HTMLElement | null>(null);
  const isInView = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (!elementRef.value || typeof IntersectionObserver === 'undefined') {
      isInView.value = true; // Fallback: always visible
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            isInView.value = true;
            if (once && observer && elementRef.value) {
              observer.unobserve(elementRef.value);
            }
          } else if (!once) {
            isInView.value = false;
          }
        }
      },
      { threshold },
    );

    observer.observe(elementRef.value);
  });

  onUnmounted(() => {
    observer?.disconnect();
  });

  return { elementRef, isInView };
}

// ═══════════════════════════════════════════════════════════
// PROGRESS ANIMATION — Animated width/value fill
// ═══════════════════════════════════════════════════════════

/**
 * Composable: Animated progress bar value.
 * Returns a displayPercent that animates from 0 to target.
 */
export function useProgressAnimation(
  target: Ref<number>,
  options: { duration?: number; delay?: number } = {},
) {
  const { duration = 700, delay = 200 } = options;
  const displayPercent = ref(0);
  let animationFrame: number | null = null;

  function animate(to: number) {
    if (_prefersReducedMotion.value) {
      displayPercent.value = to;
      return;
    }

    if (animationFrame) cancelAnimationFrame(animationFrame);
    const from = displayPercent.value;
    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime - delay;
      if (elapsed < 0) {
        animationFrame = requestAnimationFrame(step);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      displayPercent.value = Math.round(from + (to - from) * eased);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      } else {
        displayPercent.value = to;
      }
    }

    animationFrame = requestAnimationFrame(step);
  }

  onMounted(() => animate(target.value));
  watch(target, (v) => animate(v));

  return { displayPercent };
}

// ═══════════════════════════════════════════════════════════
// MOTION CONSTANTS — JS-accessible timing values
// ═══════════════════════════════════════════════════════════

export const MOTION = {
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enter: 'cubic-bezier(0.22, 1, 0.36, 1)',
    exit: 'cubic-bezier(0.55, 0, 1, 0.45)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  duration: {
    instant: 100,
    fast: 150,
    normal: 250,
    moderate: 350,
    slow: 500,
  },
  stagger: {
    fast: 30,
    normal: 50,
    slow: 80,
  },
} as const;
