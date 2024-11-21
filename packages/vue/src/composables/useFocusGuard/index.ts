import { focusGuard } from '@robonen/platform/browsers';
import { onMounted, onUnmounted } from 'vue';

// Global counter to drop the focus guards when the last instance is unmounted
let counter = 0;

/**
 * @name useFocusGuard
 * @category Utilities
 * @description Adds a pair of focus guards at the boundaries of the DOM tree to ensure consistent focus behavior
 * 
 * @param {string} [namespace] - A namespace to group the focus guards
 * @returns {void}
 * 
 * @example
 * useFocusGuard();
 * 
 * @example
 * useFocusGuard('my-namespace');
 * 
 * @since 0.0.2
 */
export function useFocusGuard(namespace?: string) {
  const manager = focusGuard(namespace);

  const createGuard = () => {
    manager.createGuard();
    counter++;
  };

  const removeGuard = () => {
    if (counter <= 1)
      manager.removeGuard();
      
    counter = Math.max(0, counter - 1);
  };

  onMounted(createGuard);
  onUnmounted(removeGuard);
}
