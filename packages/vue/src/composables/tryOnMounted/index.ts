import { onMounted, nextTick, type ComponentInternalInstance } from 'vue';
import { getLifeCycleTarger } from '../../utils';

export interface TryOnMountedOptions {
  sync?: boolean;
  target?: ComponentInternalInstance;
}

/**
 * @name tryOnMounted
 * @category Components
 * @description Calls a function if it's inside a component lifecycle hook, otherwise just calls it
 * 
 * @param {Function} fn The function to call
 * @param {TryOnMountedOptions} [options={}] The options for the try on mounted function
 * @returns {void}
 * 
 * @example
 * tryOnMounted(() => console.log('Mounted!'));
 * 
 * @example
 * tryOnMounted(() => console.log('Mounted!'), { sync: false });
 */
export function tryOnMounted(fn: () => void, options: TryOnMountedOptions = {}) {
  const instance = getLifeCycleTarger();

  const {
    sync = true,
    target,
  } = options;

  if (instance)
    onMounted(fn, target);
  else if (sync)
    fn();
  else
    nextTick(fn);
}