import { computed } from 'vue';
import { useMounted } from '../useMounted';

/**
 * @name useSupported
 * @category Utilities
 * @description SSR-friendly way to check if a feature is supported
 * 
 * @param {Function} feature The feature to check for support
 * @returns {ComputedRef<boolean>} Whether the feature is supported
 * 
 * @example
 * const isSupported = useSupported(() => 'IntersectionObserver' in window);
 * 
 * @example
 * const isSupported = useSupported(() => 'ResizeObserver' in window);
 */
export function useSupported(feature: () => unknown) {
    const isMounted = useMounted();

    return computed(() => {
      // add reactive dependency on isMounted
      isMounted.value;

      return Boolean(feature());
    });
}