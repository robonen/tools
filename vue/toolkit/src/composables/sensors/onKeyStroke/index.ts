import type { VoidFunction } from '@robonen/stdlib';
import { isArray, isFunction, isString, noop } from '@robonen/stdlib';
import { toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { useEventListener } from '@/composables/browser/useEventListener';
import { defaultWindow } from '@/types';

export type KeyPredicate = (event: KeyboardEvent) => boolean;
export type KeyFilter = true | string | string[] | KeyPredicate;
export type KeyStrokeEventName = 'keydown' | 'keypress' | 'keyup';

export interface OnKeyStrokeOptions {
  /**
   * The keyboard event to listen for.
   *
   * @default 'keydown'
   */
  eventName?: KeyStrokeEventName;

  /**
   * The element to attach the listener to.
   *
   * @default window
   */
  target?: MaybeRefOrGetter<EventTarget | null | undefined>;

  /**
   * Register the listener as passive (cannot call `preventDefault`).
   *
   * @default false
   */
  passive?: boolean;

  /**
   * Ignore auto-repeated keydown events while a key is held down.
   *
   * @default false
   */
  dedupe?: MaybeRefOrGetter<boolean>;
}

/**
 * Build a predicate from a key filter.
 *
 * - `function` → used as-is.
 * - `string`   → matches `event.key`.
 * - `string[]` → matches any key in the list.
 * - `true`/anything else → matches every event.
 */
function createKeyPredicate(keyFilter: KeyFilter): KeyPredicate {
  if (isFunction(keyFilter))
    return keyFilter;

  if (isString(keyFilter))
    return (event: KeyboardEvent) => event.key === keyFilter;

  if (isArray(keyFilter))
    return (event: KeyboardEvent) => keyFilter.includes(event.key);

  return () => true;
}

/**
 * @name onKeyStroke
 * @category Sensors
 * @description Listen for keyboard strokes. Accepts a key, list of keys, or a predicate and
 * fires the handler for matching events. Auto-cleans up on scope dispose.
 *
 * Overload 1: Explicit key filter
 */
export function onKeyStroke(key: KeyFilter, handler: (event: KeyboardEvent) => void, options?: OnKeyStrokeOptions): VoidFunction;

/**
 * @name onKeyStroke
 * @category Sensors
 * @description Listen for every keyboard stroke (no key filter).
 *
 * Overload 2: Omitted key filter (matches all keys)
 *
 * @param {(event: KeyboardEvent) => void} handler Callback invoked on a matching key event
 * @param {OnKeyStrokeOptions} [options] Listener configuration
 * @returns {VoidFunction} Stop handle that removes the listener
 *
 * @example
 * onKeyStroke('ArrowDown', (e) => { e.preventDefault(); });
 * onKeyStroke(['a', 'b', 'c'], (e) => console.log(e.key));
 * onKeyStroke((e) => e.metaKey && e.key === 's', save, { eventName: 'keydown' });
 *
 * @since 0.0.15
 */
export function onKeyStroke(handler: (event: KeyboardEvent) => void, options?: OnKeyStrokeOptions): VoidFunction;

export function onKeyStroke(...args: any[]): VoidFunction {
  let key: KeyFilter;
  let handler: (event: KeyboardEvent) => void;
  let options: OnKeyStrokeOptions = {};

  if (args.length === 3) {
    key = args[0];
    handler = args[1];
    options = args[2];
  }
  else if (args.length === 2) {
    if (typeof args[1] === 'object') {
      key = true;
      handler = args[0];
      options = args[1];
    }
    else {
      key = args[0];
      handler = args[1];
    }
  }
  else {
    key = true;
    handler = args[0];
  }

  const {
    target = defaultWindow,
    eventName = 'keydown',
    passive = false,
    dedupe = false,
  } = options;

  if (!target)
    return noop;

  const predicate = createKeyPredicate(key);

  const listener = (event: KeyboardEvent) => {
    if (event.repeat && toValue(dedupe))
      return;

    if (predicate(event))
      handler(event);
  };

  return useEventListener(target, eventName, listener, { passive });
}

/**
 * @name onKeyDown
 * @category Sensors
 * @description Listen for `keydown` strokes. Shorthand for `onKeyStroke` with `eventName: 'keydown'`.
 *
 * @param {KeyFilter} key Key, list of keys, or predicate to match
 * @param {(event: KeyboardEvent) => void} handler Callback invoked on a matching key event
 * @param {Omit<OnKeyStrokeOptions, 'eventName'>} [options] Listener configuration
 * @returns {VoidFunction} Stop handle that removes the listener
 *
 * @example
 * onKeyDown('Enter', submit);
 *
 * @since 0.0.15
 */
export function onKeyDown(key: KeyFilter, handler: (event: KeyboardEvent) => void, options: Omit<OnKeyStrokeOptions, 'eventName'> = {}): VoidFunction {
  return onKeyStroke(key, handler, { ...options, eventName: 'keydown' });
}

/**
 * @name onKeyUp
 * @category Sensors
 * @description Listen for `keyup` strokes. Shorthand for `onKeyStroke` with `eventName: 'keyup'`.
 *
 * @param {KeyFilter} key Key, list of keys, or predicate to match
 * @param {(event: KeyboardEvent) => void} handler Callback invoked on a matching key event
 * @param {Omit<OnKeyStrokeOptions, 'eventName'>} [options] Listener configuration
 * @returns {VoidFunction} Stop handle that removes the listener
 *
 * @example
 * onKeyUp('Escape', close);
 *
 * @since 0.0.15
 */
export function onKeyUp(key: KeyFilter, handler: (event: KeyboardEvent) => void, options: Omit<OnKeyStrokeOptions, 'eventName'> = {}): VoidFunction {
  return onKeyStroke(key, handler, { ...options, eventName: 'keyup' });
}

/**
 * @name onKeyPressed
 * @category Sensors
 * @description Listen for `keypress` strokes. Shorthand for `onKeyStroke` with `eventName: 'keypress'`.
 *
 * @param {KeyFilter} key Key, list of keys, or predicate to match
 * @param {(event: KeyboardEvent) => void} handler Callback invoked on a matching key event
 * @param {Omit<OnKeyStrokeOptions, 'eventName'>} [options] Listener configuration
 * @returns {VoidFunction} Stop handle that removes the listener
 *
 * @example
 * onKeyPressed('a', type);
 *
 * @since 0.0.15
 */
export function onKeyPressed(key: KeyFilter, handler: (event: KeyboardEvent) => void, options: Omit<OnKeyStrokeOptions, 'eventName'> = {}): VoidFunction {
  return onKeyStroke(key, handler, { ...options, eventName: 'keypress' });
}
