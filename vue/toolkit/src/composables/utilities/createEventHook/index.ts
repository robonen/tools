import { noop } from '@robonen/stdlib';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

/**
 * A listener for an event hook. `T` is the payload type:
 * - `void` -> the listener takes no arguments
 * - a tuple `[a, b]` -> the listener takes those positional arguments
 * - anything else -> the listener takes a single argument of that type
 *
 * Listeners may be sync or async; async listeners are awaited by `trigger`.
 */
export type EventHookListener<T = any>
  = [T] extends [void]
    ? () => any
    : [T] extends [any[]]
        ? (...args: T) => any
        : (arg: T) => any;

/**
 * Handle returned from {@link EventHook.on}. It is both a callable that removes
 * the listener and an object exposing an `off` method, so either of these work:
 *
 * ```ts
 * const off = on(fn); off();
 * const { off } = on(fn); off();
 * ```
 */
export interface EventHookOffHandle {
  (): void;
  off: () => void;
}

export type EventHookOn<T = any> = (listener: EventHookListener<T>) => EventHookOffHandle;
export type EventHookOff<T = any> = (listener: EventHookListener<T>) => void;
export type EventHookTrigger<T = any>
  = [T] extends [void]
    ? () => Promise<any[]>
    : [T] extends [any[]]
        ? (...args: T) => Promise<any[]>
        : (arg: T) => Promise<any[]>;

export interface CreateEventHookOptions {
  /**
   * Handler invoked when a listener throws synchronously or rejects.
   * Defaults to `noop` (errors are swallowed so one bad listener never breaks
   * the others or rejects the `trigger` promise). Provide this to surface them.
   *
   * @default noop
   */
  onError?: (error: unknown) => void;
}

export interface CreateEventHookReturn<T = any> {
  /**
   * Register a listener. Returns a handle that removes the listener when
   * called (or via its `.off` method). The listener is also removed
   * automatically when the surrounding effect scope is disposed.
   */
  on: EventHookOn<T>;

  /**
   * Remove a previously registered listener.
   */
  off: EventHookOff<T>;

  /**
   * Invoke every registered listener with the given payload and resolve once
   * all of them (including async listeners) have settled.
   */
  trigger: EventHookTrigger<T>;

  /**
   * Remove all listeners.
   */
  clear: () => void;
}

/**
 * @name createEventHook
 * @category Utilities
 * @description Lightweight, non-reactive event hook factory exposing
 * `{ on, off, trigger, clear }`. `on` returns a callable off handle (also
 * carrying an `.off` method) and auto-removes the listener on scope dispose.
 * `trigger` awaits async listeners and resolves with all their results. SSR-safe
 * (touches no browser globals) and tree-shakeable.
 *
 * @param {CreateEventHookOptions} [options={}] Options
 * @returns {CreateEventHookReturn} The event hook controls
 *
 * @example
 * const { on, trigger } = createEventHook<string>();
 * const off = on((msg) => console.log(msg));
 * await trigger('hello');
 * off();
 *
 * @example
 * // Tuple payload for multiple positional arguments
 * const hook = createEventHook<[number, number]>();
 * hook.on((x, y) => x + y);
 * const results = await hook.trigger(2, 3); // [5]
 *
 * @example
 * // trigger awaits async listeners
 * const hook = createEventHook<void>();
 * hook.on(async () => { await save(); });
 * await hook.trigger(); // resolves after save() completes
 *
 * @since 0.0.15
 */
export function createEventHook<T = any>(
  options: CreateEventHookOptions = {},
): CreateEventHookReturn<T> {
  const { onError = noop } = options;

  const listeners = new Set<EventHookListener<T>>();

  const off: EventHookOff<T> = (listener) => {
    listeners.delete(listener);
  };

  const clear = (): void => {
    listeners.clear();
  };

  const on: EventHookOn<T> = (listener) => {
    listeners.add(listener);

    const offHandle = (() => off(listener)) as EventHookOffHandle;
    offHandle.off = offHandle;

    tryOnScopeDispose(offHandle);

    return offHandle;
  };

  const trigger = ((...args: any[]) => {
    // Snapshot first: a listener that mutates the set during the trigger (e.g.
    // self-removal or registering a new one) must not affect the current pass.
    const snapshot = [...listeners];

    return Promise.all(
      snapshot.map(async (listener) => {
        try {
          return await listener(...(args as [T]));
        }
        catch (error) {
          onError(error);
          return undefined;
        }
      }),
    );
  }) as EventHookTrigger<T>;

  return {
    on,
    off,
    trigger,
    clear,
  };
}
