import { computed, shallowRef } from 'vue';
import type { ShallowRef, WritableComputedRef } from 'vue';
import { pick } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';

export type UsePointerType = 'mouse' | 'touch' | 'pen';

export interface UsePointerState {
  x: number;
  y: number;
  pressure: number;
  pointerId: number;
  tiltX: number;
  tiltY: number;
  width: number;
  height: number;
  twist: number;
  pointerType: UsePointerType | null;
}

export interface UsePointerOptions extends ConfigurableWindow {
  /**
   * Pointer types that should be listened to.
   *
   * @default ['mouse', 'touch', 'pen']
   */
  pointerTypes?: UsePointerType[];

  /**
   * Initial pointer state.
   */
  initialValue?: Partial<UsePointerState>;

  /**
   * Target to attach the listeners to. Accepts a window, document, element ref,
   * getter, or component instance.
   *
   * @default window
   */
  target?: MaybeComputedElementRef | Window | Document;
}

export interface UsePointerReturn {
  x: WritableComputedRef<number>;
  y: WritableComputedRef<number>;
  pressure: WritableComputedRef<number>;
  pointerId: WritableComputedRef<number>;
  tiltX: WritableComputedRef<number>;
  tiltY: WritableComputedRef<number>;
  width: WritableComputedRef<number>;
  height: WritableComputedRef<number>;
  twist: WritableComputedRef<number>;
  pointerType: WritableComputedRef<UsePointerType | null>;
  isInside: ShallowRef<boolean>;
}

const defaultState: UsePointerState = {
  x: 0,
  y: 0,
  pointerId: 0,
  pressure: 0,
  tiltX: 0,
  tiltY: 0,
  width: 0,
  height: 0,
  twist: 0,
  pointerType: null,
};

const keys = Object.keys(defaultState) as Array<keyof UsePointerState>;

/**
 * @name usePointer
 * @category Browser
 * @description Reactive pointer state (position, pressure, tilt, size, and
 * pointer type) sourced from pointer events on a target, plus whether the
 * pointer is currently inside it.
 *
 * @param {UsePointerOptions} [options={}] Options
 * @returns {UsePointerReturn} Reactive pointer state refs and `isInside`
 *
 * @example
 * const { x, y, pressure, pointerType, isInside } = usePointer();
 *
 * @example
 * // Track a specific element, pen only
 * const { x, y, tiltX, tiltY } = usePointer({ target: el, pointerTypes: ['pen'] });
 *
 * @since 0.0.15
 */
export function usePointer(options: UsePointerOptions = {}): UsePointerReturn {
  const {
    pointerTypes,
    initialValue = {},
    window = defaultWindow,
    target = window,
  } = options;

  const isInside = shallowRef(false);

  const state = shallowRef<UsePointerState>({
    ...defaultState,
    ...initialValue,
  });

  const handler = (event: PointerEvent) => {
    isInside.value = true;

    if (pointerTypes && !pointerTypes.includes(event.pointerType as UsePointerType))
      return;

    state.value = pick(event, keys) as UsePointerState;
  };

  // A raw window/document/EventTarget is used directly (fast, non-reactive path
  // in useEventListener). Refs/getters/element instances are resolved lazily via
  // a getter so the listeners re-bind when the underlying element changes.
  const listenTarget = isTarget(target)
    ? target
    : (): EventTarget | null | undefined => unrefElement(target as MaybeComputedElementRef) as EventTarget | null | undefined;

  if (target) {
    const listenerOptions = { passive: true };

    useEventListener(listenTarget, ['pointerdown', 'pointermove', 'pointerup'], handler as (e: Event) => void, listenerOptions);
    useEventListener(listenTarget, 'pointerleave', () => (isInside.value = false), listenerOptions);
  }

  // Derive a writable ref per field that reads/writes through the single
  // shallowRef holding the whole state, matching VueUse's `toRefs(shallowRef)`.
  const toField = <K extends keyof UsePointerState>(key: K): WritableComputedRef<UsePointerState[K]> =>
    computed({
      get: () => state.value[key],
      set: value => (state.value = { ...state.value, [key]: value }),
    });

  return {
    x: toField('x'),
    y: toField('y'),
    pressure: toField('pressure'),
    pointerId: toField('pointerId'),
    tiltX: toField('tiltX'),
    tiltY: toField('tiltY'),
    width: toField('width'),
    height: toField('height'),
    twist: toField('twist'),
    pointerType: toField('pointerType'),
    isInside,
  };
}

/**
 * `true` for an object that is itself an event target (window/document/element)
 * and should be attached to directly, rather than unwrapped from a ref/getter.
 */
function isTarget(value: unknown): value is EventTarget {
  return typeof value === 'object' && value !== null && 'addEventListener' in value;
}
