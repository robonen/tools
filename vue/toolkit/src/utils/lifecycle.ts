import { nextTick } from 'vue';
import type { ComponentInternalInstance } from 'vue';
import type { VoidFunction } from '@robonen/stdlib';
import { getLifeCycleTarger } from './components';

/**
 * Shared options for the `tryOn*` lifecycle helpers.
 */
export interface TryOnLifecycleOptions {
  /**
   * Run the callback synchronously when invoked outside a component instance
   * (i.e. when there is no lifecycle hook to defer to). When `false`, the
   * callback is scheduled on the next microtask via `nextTick`.
   *
   * @default true
   */
  sync?: boolean;
  /**
   * The component instance the lifecycle hook should be bound to. Defaults to
   * the current active instance.
   */
  target?: ComponentInternalInstance;
}

/**
 * The shape shared by Vue's lifecycle registrars (`onMounted`, `onBeforeMount`, …):
 * a callback plus an optional target instance.
 */
type LifecycleHook = (hook: VoidFunction, target?: ComponentInternalInstance | null) => void;

/**
 * Register `fn` on the given Vue lifecycle `hook` when called inside a component
 * instance; otherwise run it immediately (or on the next tick when `sync` is
 * `false`). Factored out so the `tryOnMounted` / `tryOnBeforeMount` helpers share
 * one implementation of the instance-resolution and fallback branching.
 */
export function runTryOnLifecycle(
  hook: LifecycleHook,
  fn: VoidFunction,
  options: TryOnLifecycleOptions = {},
): void {
  const { sync = true, target } = options;
  const instance = getLifeCycleTarger(target);

  if (instance)
    hook(fn, instance);
  else if (sync)
    fn();
  else
    nextTick(fn);
}
