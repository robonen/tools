import { onBeforeMount } from 'vue';
import type { ComponentInternalInstance } from 'vue';
import { runTryOnLifecycle } from '@/utils/lifecycle';
import type { VoidFunction } from '@robonen/stdlib';

export interface TryOnBeforeMountOptions {
  sync?: boolean;
  target?: ComponentInternalInstance;
}

/**
 * @name tryOnBeforeMount
 * @category Lifecycle
 * @description Call onBeforeMount if it's inside a component lifecycle hook, otherwise just calls it
 *
 * @param {VoidFunction} fn - The function to run on before mount.
 * @param {TryOnBeforeMountOptions} options - The options for the function.
 * @param {boolean} [options.sync=true] - If true, the function will run synchronously, otherwise it will run asynchronously.
 * @param {ComponentInternalInstance} [options.target] - The target component instance to run the function on.
 * @returns {void}
 *
 * @example
 * tryOnBeforeMount(() => console.log('Before mount'));
 *
 * @example
 * tryOnBeforeMount(() => console.log('Before mount async'), { sync: false });
 *
 * @since 0.0.1
 */
export function tryOnBeforeMount(fn: VoidFunction, options: TryOnBeforeMountOptions = {}) {
  runTryOnLifecycle(onBeforeMount, fn, options);
}
