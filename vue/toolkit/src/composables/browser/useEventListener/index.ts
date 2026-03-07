import type { Arrayable, VoidFunction } from '@robonen/stdlib';
import { first, isArray, isFunction, isObject, isString, noop } from '@robonen/stdlib';
import { isRef, toValue, watch } from 'vue';
import { defaultWindow } from '@/types';
import type { MaybeRefOrGetter } from 'vue';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

interface InferEventTarget<Events> {
  addEventListener: (event: Events, listener?: any, options?: any) => any;
  removeEventListener: (event: Events, listener?: any, options?: any) => any;
}

export type GeneralEventListener<E = Event> = (evt: E) => void;

export type WindowEventName = keyof WindowEventMap;
export type DocumentEventName = keyof DocumentEventMap;
export type ElementEventName = keyof HTMLElementEventMap;

type ListenerOptions = boolean | AddEventListenerOptions;

/**
 * @name useEventListener
 * @category Browser
 * @description Registers an event listener using the `addEventListener` on mounted and removes it automatically on unmounted
 *
 * Overload 1: Omitted window target
 */
export function useEventListener<E extends WindowEventName>(
  event: Arrayable<E>,
  listener: Arrayable<(this: Window, ev: WindowEventMap[E]) => any>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>,
): VoidFunction;

/**
 * @name useEventListener
 * @category Browser
 * @description Registers an event listener using the `addEventListener` on mounted and removes it automatically on unmounted
 *
 * Overload 2: Explicit window target
 */
export function useEventListener<E extends WindowEventName>(
  target: Window,
  event: Arrayable<E>,
  listener: Arrayable<(this: Window, ev: WindowEventMap[E]) => any>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>,
): VoidFunction;

/**
 * @name useEventListener
 * @category Browser
 * @description Registers an event listener using the `addEventListener` on mounted and removes it automatically on unmounted
 *
 * Overload 3: Explicit document target
 */
export function useEventListener<E extends DocumentEventName>(
  target: Document,
  event: Arrayable<E>,
  listener: Arrayable<(this: Document, ev: DocumentEventMap[E]) => any>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>,
): VoidFunction;

/**
 * @name useEventListener
 * @category Browser
 * @description Registers an event listener using the `addEventListener` on mounted and removes it automatically on unmounted
 *
 * Overload 4: Explicit HTMLElement target
 */
export function useEventListener<E extends ElementEventName>(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  event: Arrayable<E>,
  listener: Arrayable<(this: HTMLElement, ev: HTMLElementEventMap[E]) => any>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>,
): VoidFunction;

/**
 * @name useEventListener
 * @category Browser
 * @description Registers an event listener using the `addEventListener` on mounted and removes it automatically on unmounted
 *
 * Overload 5: Custom target with inferred event type
 */
export function useEventListener<Names extends string, EventType = Event>(
  target: MaybeRefOrGetter<InferEventTarget<Names> | null | undefined>,
  event: Arrayable<Names>,
  listener: Arrayable<GeneralEventListener<EventType>>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>,
): VoidFunction;

/**
 * @name useEventListener
 * @category Browser
 * @description Registers an event listener using the `addEventListener` on mounted and removes it automatically on unmounted
 *
 * Overload 6: Custom event target fallback
 */
export function useEventListener<EventType = Event>(
  target: MaybeRefOrGetter<EventTarget | null | undefined>,
  event: Arrayable<string>,
  listener: Arrayable<GeneralEventListener<EventType>>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>,
): VoidFunction;

export function useEventListener(...args: any[]) {
  let target: MaybeRefOrGetter<EventTarget> | undefined = defaultWindow;
  let _events: Arrayable<string>;
  let _listeners: Arrayable<EventListener>;
  let _options: MaybeRefOrGetter<ListenerOptions> | undefined;

  if (isString(first(args)) || isArray(first(args))) {
    [_events, _listeners, _options] = args;
  }
  else {
    [target, _events, _listeners, _options] = args;
  }

  if (!target)
    return noop;

  const events = isArray(_events) ? _events : [_events];
  const listeners = isArray(_listeners) ? _listeners : [_listeners];

  const cleanups: VoidFunction[] = [];

  const _cleanup = () => {
    cleanups.forEach(fn => fn());
    cleanups.length = 0;
  };

  const _register = (el: EventTarget, event: string, listener: EventListener, options: ListenerOptions | undefined) => {
    el.addEventListener(event, listener, options);
    return () => el.removeEventListener(event, listener, options);
  };

  const _registerAll = (el: EventTarget, options: ListenerOptions | undefined) => {
    // Clone object options to avoid reactive mutation between add/remove
    const optionsClone = isObject(options) ? { ...options } : options;

    for (const event of events) {
      for (const listener of listeners) {
        cleanups.push(_register(el, event, listener, optionsClone));
      }
    }
  };

  const isTargetReactive = isRef(target) || isFunction(target);
  const isOptionsReactive = isRef(_options) || isFunction(_options);

  // Reactive path: use watch for ref/getter targets (e.g., template refs)
  if (isTargetReactive || isOptionsReactive) {
    const stopWatch = watch(
      () => [toValue(target), toValue(_options)] as const,
      ([el, options]) => {
        _cleanup();

        if (!el)
          return;

        _registerAll(el, options);
      },
      { immediate: true, flush: 'post' },
    );

    const stop = () => {
      stopWatch();
      _cleanup();
    };

    tryOnScopeDispose(stop);

    return stop;
  }

  // Fast path: static target — register synchronously, no watch overhead
  _registerAll(target as EventTarget, _options as ListenerOptions);

  tryOnScopeDispose(_cleanup);

  return _cleanup;
}
