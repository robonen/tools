import { onMounted, nextTick, type ComponentInternalInstance } from 'vue';
import { getLifeCycleTarger } from '../..';
import type { VoidFunction } from '@robonen/stdlib';

// TODO: tests

export interface TryOnMountedOptions {
  sync?: boolean;
  target?: ComponentInternalInstance;
}

/**
 * @name tryOnMounted
 * @category Components
 * @description Call onMounted if it's inside a component lifecycle hook, otherwise just calls it
 * 
 * @param {VoidFunction} fn The function to call
 * @param {TryOnMountedOptions} options The options to use
 * @param {boolean} [options.sync=true] If the function should be called synchronously
 * @param {ComponentInternalInstance} [options.target] The target instance to use
 * @returns {void}
 * 
 * @example
 * tryOnMounted(() => console.log('Mounted!'));
 * 
 * @example
 * tryOnMounted(() => console.log('Mounted!'), { sync: false });
 */
export function tryOnMounted(fn: VoidFunction, options: TryOnMountedOptions = {}) {
  const {
    sync = true,
    target,
  } = options;

  const instance = getLifeCycleTarger(target);

  if (instance)  
    onMounted(fn, instance);
  else if (sync)
    fn();
  else
    nextTick(fn);
}