import type { AnyFunction } from '@robonen/stdlib';
import { isClient } from '@robonen/platform/multi';
import { effectScope } from 'vue';
import type { EffectScope } from 'vue';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export type CreateSharedComposableReturn<Fn extends AnyFunction>
  = Fn;

/**
 * @name createSharedComposable
 * @category State
 * @description Promotes a composable to a shared one: every call reuses the same instance backed by a single effect scope. The scope is created lazily on the first consumer and is ref-counted, so it is disposed only when the last consumer's scope unmounts. State is recreated on the next call after a full dispose.
 *
 * @param {Fn} composable The composable to share across consumers.
 * @returns {CreateSharedComposableReturn<Fn>} A shared variant of the composable with the same signature.
 *
 * @example
 * const useSharedMouse = createSharedComposable(useMouse);
 * // Both components share a single set of listeners and reactive state.
 * const { x, y } = useSharedMouse();
 *
 * @since 0.0.15
 */
export function createSharedComposable<Fn extends AnyFunction>(
  composable: Fn,
): CreateSharedComposableReturn<Fn> {
  // SSR: there is no scope lifecycle to ref-count against, so fall back to the
  // raw composable. Each request gets a fresh instance, which is what we want.
  if (!isClient)
    return composable;

  let subscribers = 0;
  let state: ReturnType<Fn> | undefined;
  let scope: EffectScope | undefined;

  const dispose = (): void => {
    subscribers -= 1;

    if (scope && subscribers <= 0) {
      scope.stop();
      state = undefined;
      scope = undefined;
    }
  };

  return ((...args: Parameters<Fn>): ReturnType<Fn> => {
    subscribers += 1;

    if (!scope) {
      scope = effectScope(true);
      state = scope.run(() => composable(...args)) as ReturnType<Fn>;
    }

    tryOnScopeDispose(dispose);

    return state as ReturnType<Fn>;
  }) as Fn;
}
