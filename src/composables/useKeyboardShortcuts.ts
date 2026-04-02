import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSpotlight } from './useSpotlight';

export function useKeyboardShortcuts() {
  const router = useRouter();
  const spotlight = useSpotlight();

  function handleKeyDown(e: KeyboardEvent) {
    // Cmd+K should work even in inputs (standard behavior for command palettes)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      spotlight.open();
      return;
    }

    // Escape closes spotlight
    if (e.key === 'Escape' && spotlight.isOpen.value) {
      e.preventDefault();
      spotlight.close();
      return;
    }

    // Don't trigger other shortcuts in inputs/textareas
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
    if (target.isContentEditable) return;

    // Don't trigger navigation shortcuts while spotlight is open
    if (spotlight.isOpen.value) return;

    // Cmd/Ctrl shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case '1': e.preventDefault(); router.push('/'); break; // Projects
        case '2': e.preventDefault(); router.push('/dashboard'); break;
        case '3': e.preventDefault(); router.push('/tasks'); break;
        case '4': e.preventDefault(); router.push('/agents'); break;
        case '5': e.preventDefault(); router.push('/plans'); break;
      }
      return;
    }

    // Plain key shortcuts (only when not in input)
    switch (e.key) {
      case '?': // Show shortcuts help
        // Could open a modal, for now just log
        break;
    }
  }

  onMounted(() => document.addEventListener('keydown', handleKeyDown));
  onUnmounted(() => document.removeEventListener('keydown', handleKeyDown));
}
