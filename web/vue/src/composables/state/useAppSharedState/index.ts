import type { AnyFunction } from '@robonen/stdlib';
import { effectScope } from 'vue';

// TODO: maybe we should control subscriptions and dispose them when the child scope is disposed

/**
 * @name useAppSharedState
 * @category State
 * @description Provides a shared state object for use across Vue instances
 * 
 * @param {Function} stateFactory A factory function that returns the shared state object
 * @returns {Function} A function that returns the shared state object
 * 
 * @example
 * const useSharedState = useAppSharedState((initValue?: number) => {
 *   const count = ref(initValue ?? 0);
 *   return { count };
 * });
 * 
 * @example
 * const useSharedState = useAppSharedState(() => {
 *   const state = reactive({ count: 0 });
 *   const increment = () => state.count++;
 *   return { state, increment };
 * });
 * 
 * @since 0.0.1
 */
export function useAppSharedState<Fn extends AnyFunction>(stateFactory: Fn) {
  let initialized = false;
  let state: ReturnType<Fn>;
  const scope = effectScope(true);

  return ((...args: Parameters<Fn>) => {
    if (!initialized) {
      state = scope.run(() => stateFactory(...args));
      initialized = true;
    }

    return state;
  });
}
