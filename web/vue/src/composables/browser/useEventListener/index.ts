import { isArray, isObject, isString, noop } from '@robonen/stdlib';
import type { Arrayable, VoidFunction } from '@robonen/stdlib';
import { first } from '@robonen/stdlib';
import { toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { defaultWindow } from '@/types';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

interface InferEventTarget<Events> {
  addEventListener: (event: Events, listener?: any, options?: any) => any;
  removeEventListener: (event: Events, listener?: any, options?: any) => any;
}

export type GeneralEventListener<E = Event> = (evt: E) => void;

export type WindowEventName = keyof WindowEventMap;
export type DocumentEventName = keyof DocumentEventMap;
export type ElementEventName = keyof HTMLElementEventMap;

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
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
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
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
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
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
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
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
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
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
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
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
): VoidFunction;

export function useEventListener(...args: any[]) {
  let target: MaybeRefOrGetter<EventTarget> | undefined;
  let events: Arrayable<string>;
  let listeners: Arrayable<Function>;
  let _options: MaybeRefOrGetter<boolean | AddEventListenerOptions> | undefined;

  if (isString(first(args)) || isArray(first(args))) {
    [events, listeners, _options] = args;
    target = defaultWindow;
  } else {
    [target, events, listeners, _options] = args;
  }

  if (!target)
    return noop;

  if (!isArray(events))
    events = [events];

  if (!isArray(listeners))
    listeners = [listeners];

  const cleanups: Function[] = [];
  
  const _cleanup = () => {
    cleanups.forEach(fn => fn());
    cleanups.length = 0;
  }

  const _register = (el: EventTarget, event: string, listener: Function, options: boolean | AddEventListenerOptions | undefined) => {
    el.addEventListener(event, listener as EventListener, options);
    return () => el.removeEventListener(event, listener as EventListener, options);
  }

  const stopWatch = watch(
    () => [toValue(target), toValue(_options)] as const,
    ([el, options]) => {
      _cleanup();

      if (!el)
        return;

      // Clone object options to avoid reactive mutation between add/remove
      const optionsClone = isObject(options) ? { ...options } : options;

      const eventsArray = events as string[];
      const listenersArray = listeners as Function[];

      cleanups.push(
        ...eventsArray.flatMap((event) =>
          listenersArray.map((listener) => _register(el, event, listener, optionsClone)),
        ),
      );
    },
    { immediate: true, flush: 'post' },
  );

  const stop = () => {
    stopWatch();
    _cleanup();
  }

  tryOnScopeDispose(stop);

  return stop;
}