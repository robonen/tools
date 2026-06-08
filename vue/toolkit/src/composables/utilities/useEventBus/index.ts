import type { VoidFunction } from '@robonen/stdlib';
import { PubSub } from '@robonen/stdlib';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

/**
 * A listener invoked when its bus emits. Receives the emitted `event`
 * value and an optional `payload`.
 */
export type EventBusListener<T = unknown, P = any>
  = (event: T, payload?: P) => void;

/**
 * A branded `Symbol` that carries the bus' event type so a typed key can be
 * shared across modules without re-declaring generics at every call site.
 *
 * @example
 * const fooKey: EventBusKey<{ id: number }> = Symbol('foo');
 * const bus = useEventBus(fooKey); // inferred as UseEventBusReturn<{ id: number }>
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-wrapper-object-types
export interface EventBusKey<T> extends Symbol {}

/**
 * Anything usable to identify a shared bus. Buses with an equal identifier
 * share their listener set, regardless of how many times `useEventBus` runs.
 */
export type EventBusIdentifier<T = unknown>
  = EventBusKey<T> | string | number;

export interface UseEventBusReturn<T, P> {
  /**
   * Subscribe to the bus. Every `emit` invokes the listener.
   *
   * @param {EventBusListener<T, P>} listener The listener to register
   * @returns {VoidFunction} A stop function that removes this listener
   */
  on: (listener: EventBusListener<T, P>) => VoidFunction;

  /**
   * Subscribe to the bus for a single emit, then auto-unsubscribe.
   *
   * @param {EventBusListener<T, P>} listener The listener to register
   * @returns {VoidFunction} A stop function that removes this listener early
   */
  once: (listener: EventBusListener<T, P>) => VoidFunction;

  /**
   * Remove a previously registered listener.
   *
   * @param {EventBusListener<T, P>} listener The listener to remove
   */
  off: (listener: EventBusListener<T, P>) => void;

  /**
   * Emit an event to every listener on this bus.
   *
   * @param {T} [event] The value sent to listeners
   * @param {P} [payload] An optional secondary payload
   */
  emit: (event?: T, payload?: P) => void;

  /**
   * Remove every listener on this bus.
   */
  reset: () => void;
}

/**
 * The single internal channel name every bus multiplexes onto. Each
 * identifier owns its own {@link PubSub}, so the channel can be constant.
 */
const CHANNEL = '*';

/**
 * Global registry of buses keyed by identifier. Shared at module scope so
 * separate `useEventBus(sameKey)` calls observe the same listener set. This is
 * lazily populated, side-effect-free at import time, and SSR-safe (no global
 * access — a `Map` works identically on server and client).
 */
const registry = new Map<EventBusIdentifier<any>, PubSub<{ '*': EventBusListener }>>();

/**
 * @name useEventBus
 * @category Utilities
 * @description A typed, SSR-safe event bus. Calls sharing an identifier share
 * listeners, giving cross-component (and cross-module) communication without
 * prop drilling or provide/inject. Backed by stdlib `PubSub` for stable
 * snapshot-based emit semantics, and auto-removes the current scope's
 * listeners on dispose so components never leak subscriptions.
 *
 * @template T The event value type
 * @template P The optional payload type
 * @param {EventBusIdentifier<T>} key Identifier shared across buses; equal keys share listeners
 * @returns {UseEventBusReturn<T, P>} The bus controls: `on`, `once`, `off`, `emit`, `reset`
 *
 * @example
 * // shared key (typically exported from a module)
 * const busKey: EventBusKey<string> = Symbol('messages');
 *
 * // component A
 * const bus = useEventBus(busKey);
 * const unsubscribe = bus.on((msg) => console.log(msg));
 *
 * // component B
 * useEventBus(busKey).emit('hello');
 *
 * @example
 * // payloads and one-shot listeners
 * const bus = useEventBus<'open' | 'close', { id: number }>('modal');
 * bus.once((event, payload) => console.log(event, payload?.id));
 * bus.emit('open', { id: 1 });
 *
 * @since 0.0.15
 */
export function useEventBus<T = unknown, P = any>(
  key: EventBusIdentifier<T>,
): UseEventBusReturn<T, P> {
  function getBus(): PubSub<{ '*': EventBusListener }> {
    let bus = registry.get(key);

    if (!bus) {
      bus = new PubSub();
      registry.set(key, bus);
    }

    return bus;
  }

  function off(listener: EventBusListener<T, P>): void {
    const bus = registry.get(key);

    if (!bus)
      return;

    bus.off(CHANNEL, listener as EventBusListener);
  }

  function on(listener: EventBusListener<T, P>): VoidFunction {
    getBus().on(CHANNEL, listener as EventBusListener);

    const stop = (): void => off(listener);

    // Auto-unsubscribe when the owning scope is disposed.
    tryOnScopeDispose(stop);

    return stop;
  }

  function once(listener: EventBusListener<T, P>): VoidFunction {
    function wrapper(event: T, payload?: P): void {
      off(wrapper);
      listener(event, payload);
    }

    return on(wrapper);
  }

  function emit(event?: T, payload?: P): void {
    registry.get(key)?.emit(CHANNEL, event as unknown, payload);
  }

  function reset(): void {
    registry.delete(key);
  }

  return { on, once, off, emit, reset };
}
