import type { VoidFunction } from '@robonen/stdlib';
import { getCurrentScope, onScopeDispose } from 'vue';

/**
 * @name tryOnScopeDispose
 * @category Components
 * @description A composable that will run a callback when the scope is disposed or do nothing if the scope isn't available.
 * 
 * @param {VoidFunction} callback - The callback to run when the scope is disposed.
 * @returns {boolean} - Returns true if the callback was run, otherwise false.
 * 
 * @example
 * tryOnScopeDispose(() => console.log('Scope disposed'));
 * 
 * @since 0.0.1
 */
export function tryOnScopeDispose(callback: VoidFunction) {
  if (getCurrentScope()) {
    onScopeDispose(callback);
    return true;
  }

  return false;
}
