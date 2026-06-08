import { computed, shallowReactive, shallowRef, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRef, Ref, ShallowRef, WritableComputedRef } from 'vue';
import { isObject, noop, omit } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { useSupported } from '@/composables/utilities/useSupported';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useRafFn } from '@/composables/animation/useRafFn';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseAnimateOptions extends KeyframeAnimationOptions, ConfigurableWindow {
  /**
   * Automatically call `play()` once the target element is resolved.
   *
   * @default true
   */
  immediate?: boolean;

  /**
   * Commit the end styling state of the animation to the element when it finishes.
   * Usually paired with the `fill` option.
   *
   * @default false
   */
  commitStyles?: boolean;

  /**
   * Persist the animation so it is not automatically removed by the browser.
   *
   * @default false
   */
  persist?: boolean;

  /**
   * Called once the underlying `Animation` instance has been created.
   */
  onReady?: (animation: Animation) => void;

  /**
   * Called when an error is thrown while controlling the animation.
   *
   * @default noop
   */
  onError?: (error: unknown) => void;
}

export type UseAnimateKeyframes
  = MaybeRef<Keyframe[] | PropertyIndexedKeyframes | null>;

export interface UseAnimateReturn {
  /**
   * Whether the Web Animations API is supported in the current environment
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * The underlying `Animation` instance, or `undefined` before it is created
   */
  animate: ShallowRef<Animation | undefined>;

  /**
   * Start or resume the animation
   */
  play: () => void;

  /**
   * Suspend playback of the animation
   */
  pause: () => void;

  /**
   * Reverse the playback direction of the animation
   */
  reverse: () => void;

  /**
   * Seek the animation to the end of its active duration
   */
  finish: () => void;

  /**
   * Abort the animation, clearing its effects
   */
  cancel: () => void;

  /**
   * Whether the animation is currently waiting for an asynchronous operation
   */
  pending: ComputedRef<boolean>;

  /**
   * The current playback state of the animation
   */
  playState: ComputedRef<AnimationPlayState>;

  /**
   * The current replace state of the animation
   */
  replaceState: ComputedRef<AnimationReplaceState>;

  /**
   * The scheduled time at which the animation should begin (writable)
   */
  startTime: WritableComputedRef<CSSNumberish | number | null>;

  /**
   * The current time value of the animation in milliseconds (writable)
   */
  currentTime: WritableComputedRef<CSSNumberish | null>;

  /**
   * The timeline associated with the animation (writable)
   */
  timeline: WritableComputedRef<AnimationTimeline | null>;

  /**
   * The playback rate of the animation (writable)
   */
  playbackRate: WritableComputedRef<number>;
}

interface AnimateStore {
  startTime: CSSNumberish | number | null;
  currentTime: CSSNumberish | null;
  timeline: AnimationTimeline | null;
  playbackRate: number;
  pending: boolean;
  playState: AnimationPlayState;
  replaceState: AnimationReplaceState;
}

const RESERVED_KEYS = [
  'window',
  'immediate',
  'commitStyles',
  'persist',
  'onReady',
  'onError',
] as const;

/**
 * @name useAnimate
 * @category Animation
 * @description Reactive [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
 * wrapper for a single element. Exposes imperative controls (`play`, `pause`, `reverse`,
 * `finish`, `cancel`) alongside reactive state (`playState`, `currentTime`, `playbackRate`, ...).
 * The reactive state is synced via `requestAnimationFrame` only while the animation is running,
 * so an idle animation costs nothing. SSR-safe: nothing touches the DOM until the element resolves.
 *
 * @param {MaybeComputedElementRef} target Element to animate (reactive ref, getter, or element)
 * @param {UseAnimateKeyframes} keyframes Keyframes to animate, reactive
 * @param {number | UseAnimateOptions} [options] Duration in ms, or full options object
 * @returns {UseAnimateReturn} Support flag, the `Animation` instance, controls, and reactive state
 *
 * @example
 * const el = useTemplateRef<HTMLElement>('el');
 * const { playState, play, pause } = useAnimate(
 *   el,
 *   [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }],
 *   { duration: 1000, iterations: Infinity },
 * );
 *
 * @example
 * // Shorthand: third argument is the duration in milliseconds
 * useAnimate(el, { opacity: [0, 1] }, 500);
 *
 * @since 0.0.15
 */
export function useAnimate(
  target: MaybeComputedElementRef,
  keyframes: UseAnimateKeyframes,
  options?: number | UseAnimateOptions,
): UseAnimateReturn {
  let config: UseAnimateOptions;
  let animateOptions: number | KeyframeAnimationOptions | undefined;

  if (isObject(options)) {
    config = options;
    animateOptions = omit(options, RESERVED_KEYS as unknown as Array<keyof UseAnimateOptions>);
  }
  else {
    config = { duration: options };
    animateOptions = options;
  }

  const {
    immediate = true,
    commitStyles = false,
    persist = false,
    playbackRate: initialPlaybackRate = 1,
    onReady,
    onError = noop,
  } = config;

  // Honor an explicit `window: undefined` (SSR / opt-out) rather than letting a
  // default parameter silently restore `defaultWindow`.
  const window = 'window' in config ? config.window : defaultWindow;

  const isSupported = useSupported(() =>
    Boolean(window) && typeof HTMLElement !== 'undefined' && 'animate' in HTMLElement.prototype);

  const animate = shallowRef<Animation | undefined>(undefined);

  const store = shallowReactive<AnimateStore>({
    startTime: null,
    currentTime: null,
    timeline: null,
    playbackRate: initialPlaybackRate,
    pending: false,
    playState: immediate ? 'idle' : 'paused',
    replaceState: 'active',
  });

  const pending = computed(() => store.pending);
  const playState = computed(() => store.playState);
  const replaceState = computed(() => store.replaceState);

  const startTime = computed<CSSNumberish | number | null>({
    get: () => store.startTime,
    set(value) {
      store.startTime = value;
      if (animate.value)
        animate.value.startTime = value;
    },
  });

  const currentTime = computed<CSSNumberish | null>({
    get: () => store.currentTime,
    set(value) {
      store.currentTime = value;
      if (animate.value) {
        animate.value.currentTime = value;
        syncResume();
      }
    },
  });

  const timeline = computed<AnimationTimeline | null>({
    get: () => store.timeline,
    set(value) {
      store.timeline = value;
      if (animate.value)
        animate.value.timeline = value;
    },
  });

  const playbackRate = computed<number>({
    get: () => store.playbackRate,
    set(value) {
      store.playbackRate = value;
      if (animate.value)
        animate.value.playbackRate = value;
    },
  });

  function update(init?: boolean): void {
    const el = unrefElement(target);
    if (!isSupported.value || !el)
      return;

    if (!animate.value)
      animate.value = (el as HTMLElement).animate(toValue(keyframes), animateOptions);

    if (persist)
      animate.value.persist();

    if (initialPlaybackRate !== 1)
      animate.value.playbackRate = initialPlaybackRate;

    if (init && !immediate)
      animate.value.pause();
    else
      syncResume();

    onReady?.(animate.value);
  }

  function play(): void {
    if (!animate.value) {
      update();
      return;
    }

    try {
      animate.value.play();
      syncResume();
    }
    catch (error) {
      syncPause();
      onError(error);
    }
  }

  function pause(): void {
    try {
      animate.value?.pause();
      syncPause();
    }
    catch (error) {
      onError(error);
    }
  }

  function reverse(): void {
    if (!animate.value)
      update();

    try {
      animate.value?.reverse();
      syncResume();
    }
    catch (error) {
      syncPause();
      onError(error);
    }
  }

  function finish(): void {
    try {
      animate.value?.finish();
      syncPause();
    }
    catch (error) {
      onError(error);
    }
  }

  function cancel(): void {
    try {
      animate.value?.cancel();
      syncPause();
    }
    catch (error) {
      onError(error);
    }
  }

  // Sync the reactive store from the live Animation on every frame. The loop is
  // paused by default and only resumed while the animation is actually playing,
  // so an idle (or finished) animation incurs zero per-frame cost.
  const { resume: resumeRaf, pause: pauseRaf } = useRafFn(() => {
    const a = animate.value;
    if (!a)
      return;

    store.pending = a.pending;
    store.playState = a.playState;
    store.replaceState = a.replaceState;
    store.startTime = a.startTime;
    store.currentTime = a.currentTime;
    store.timeline = a.timeline;
    store.playbackRate = a.playbackRate;
  }, { immediate: false, window });

  function syncResume(): void {
    if (isSupported.value)
      resumeRaf();
  }

  function syncPause(): void {
    // Defer the stop by one frame so the final state (e.g. 'finished') is captured
    // before the loop halts.
    if (isSupported.value && window)
      window.requestAnimationFrame(pauseRaf);
  }

  watch(() => unrefElement(target), (el) => {
    if (el)
      update(true);
    else
      animate.value = undefined;
  });

  watch(() => keyframes, (value) => {
    if (!animate.value)
      return;

    update();

    const el = unrefElement(target);
    if (el && typeof KeyframeEffect !== 'undefined')
      animate.value.effect = new KeyframeEffect(el as HTMLElement, toValue(value), animateOptions);
  }, { deep: true });

  const listenerOptions = { passive: true };
  useEventListener(animate, ['cancel', 'finish', 'remove'], syncPause, listenerOptions);
  useEventListener(animate, 'finish', () => {
    if (commitStyles)
      animate.value?.commitStyles();
  }, listenerOptions);

  tryOnMounted(() => update(true), { sync: false });

  tryOnScopeDispose(cancel);

  return {
    isSupported,
    animate,

    play,
    pause,
    reverse,
    finish,
    cancel,

    pending,
    playState,
    replaceState,
    startTime,
    currentTime,
    timeline,
    playbackRate,
  };
}
