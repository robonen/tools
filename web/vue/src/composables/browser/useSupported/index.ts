import { computed } from 'vue';
import { useMounted } from '@/composables/lifecycle/useMounted';

/**
 * @name useSupported
 * @category Browser
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
 * 
 * @since 0.0.1
 */
export function useSupported(feature: () => unknown) {
    const isMounted = useMounted();

    return computed(() => {
      // add reactive dependency on isMounted
      // eslint-disable-next-line no-unused-expressions
      isMounted.value;

      return Boolean(feature());
    });
}