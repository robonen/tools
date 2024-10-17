import { onBeforeMount, nextTick, type ComponentInternalInstance } from 'vue';
import { getLifeCycleTarger } from '../..';
import type { VoidFunction } from '@robonen/stdlib';

// TODO: test

export interface TryOnBeforeMountOptions {
  sync?: boolean;
  target?: ComponentInternalInstance;
}

/**
 * @name tryOnBeforeMount
 * @category Components
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
 */
export function tryOnBeforeMount(fn: VoidFunction, options: TryOnBeforeMountOptions = {}) {
  const {
    sync = true,
    target,
  } = options;
  
  const instance = getLifeCycleTarger(target);

  if (instance)
    onBeforeMount(fn, instance);
  else if (sync)
    fn();
  else
    nextTick(fn);
}