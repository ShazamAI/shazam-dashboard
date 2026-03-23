import { ref, readonly } from 'vue';

const isCollapsed = ref(false);
const isMobileOpen = ref(false);

function toggle() {
  isCollapsed.value = !isCollapsed.value;
}

function collapse() {
  isCollapsed.value = true;
}

function expand() {
  isCollapsed.value = false;
}

function openMobile() {
  isMobileOpen.value = true;
}

function closeMobile() {
  isMobileOpen.value = false;
}

function toggleMobile() {
  isMobileOpen.value = !isMobileOpen.value;
}

export function useSidebar() {
  return {
    isCollapsed: readonly(isCollapsed),
    isMobileOpen: readonly(isMobileOpen),
    toggle,
    collapse,
    expand,
    openMobile,
    closeMobile,
    toggleMobile,
  };
}
