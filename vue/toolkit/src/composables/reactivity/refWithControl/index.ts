import { customRef } from 'vue';
import type { Ref, ShallowUnwrapRef } from 'vue';
import { extendRef } from '@/composables/reactivity/extendRef';

export interface RefWithControlOptions<T> {
  /**
   * Called right before the value is about to change.
   *
   * Return `false` to reject the change and keep the current value.
   *
   * @param value The incoming value
   * @param oldValue The current value
   */
  onBeforeChange?: (value: T, oldValue: T) => void | boolean;

  /**
   * Called after the value has changed and (optionally) the ref has triggered.
   *
   * @param value The new value
   * @param oldValue The previous value
   */
  onChanged?: (value: T, oldValue: T) => void;
}

export interface ControlledRefMethods<T> {
  /**
   * Read the value, optionally registering reactive tracking.
   *
   * @param tracking Whether to register the dependency. Defaults to `true`.
   */
  get: (tracking?: boolean) => T;

  /**
   * Write the value, optionally triggering reactive effects.
   *
   * @param value The new value
   * @param triggering Whether to trigger effects. Defaults to `true`.
   */
  set: (value: T, triggering?: boolean) => void;

  /**
   * Read the value without registering reactive tracking. Alias of `get(false)`.
   */
  peek: () => T;

  /**
   * Write the value without triggering reactive effects. Alias of `set(v, false)`.
   */
  lay: (value: T) => void;

  /**
   * Read the value without registering reactive tracking. Alias of `peek`.
   */
  untrackedGet: () => T;

  /**
   * Write the value without triggering reactive effects. Alias of `lay`.
   */
  silentSet: (value: T) => void;
}

export type RefWithControlReturn<T>
  = Ref<T> & ShallowUnwrapRef<ControlledRefMethods<T>>;

/**
 * @name refWithControl
 * @category Reactivity
 * @description A ref with fine-grained control over its reactivity: read/write
 * without tracking or triggering, plus `onBeforeChange` (vetoable) and
 * `onChanged` hooks. Built on `customRef`, so there are no extra watchers.
 *
 * @param {T} initial The initial value
 * @param {RefWithControlOptions<T>} [options={}] `onBeforeChange` (return `false` to veto) and `onChanged` hooks
 * @returns {RefWithControlReturn<T>} A ref extended with `get`/`set`/`peek`/`lay`/`untrackedGet`/`silentSet`
 *
 * @example
 * const num = refWithControl(0);
 * num.value++; // tracked + triggered, like a normal ref
 * num.peek(); // read without tracking
 * num.lay(5); // write without triggering effects
 *
 * @example
 * // veto changes with onBeforeChange
 * const positive = refWithControl(1, {
 *   onBeforeChange: (value) => value > 0, // reject non-positive values
 *   onChanged: (value, old) => log(`${old} -> ${value}`),
 * });
 * positive.value = -1; // rejected, stays 1
 *
 * @since 0.0.15
 */
export function refWithControl<T>(
  initial: T,
  options: RefWithControlOptions<T> = {},
): RefWithControlReturn<T> {
  const { onBeforeChange, onChanged } = options;

  let source = initial;
  let track: () => void;
  let trigger: () => void;

  const controlled = customRef<T>((_track, _trigger) => {
    track = _track;
    trigger = _trigger;

    return {
      get: () => get(),
      set: value => set(value),
    };
  });

  function get(tracking = true): T {
    if (tracking)
      track();

    return source;
  }

  function set(value: T, triggering = true): void {
    if (value === source)
      return;

    const oldValue = source;

    if (onBeforeChange?.(value, oldValue) === false)
      return;

    source = value;
    onChanged?.(value, oldValue);

    if (triggering)
      trigger();
  }

  const peek = (): T => get(false);
  const lay = (value: T): void => set(value, false);

  return extendRef(
    controlled,
    {
      get,
      set,
      peek,
      lay,
      untrackedGet: peek,
      silentSet: lay,
    },
    { enumerable: true },
  ) as RefWithControlReturn<T>;
}

/**
 * @name controlledRef
 * @category Reactivity
 * @description Alias of {@link refWithControl}.
 *
 * @since 0.0.15
 */
export const controlledRef = refWithControl;
