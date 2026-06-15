<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { SwipeEvent } from './utils';

/**
 * A single toast notification. Manages its own open state and auto-dismiss timer,
 * and provides context to its `Title`, `Description`, `Action`, and `Close` children.
 * Control visibility with `v-model:open`; rendering is gated by `Presence` so exit
 * transitions can play before the element unmounts.
 *
 * The default slot receives `{ open, remaining, duration }` so you can render a
 * progress bar or countdown synced to the dismiss timer.
 */
export interface ToastRootProps extends PrimitiveProps {
  /** Override the provider's auto-dismiss duration. Use `Infinity` to disable. */
  duration?: number;
  /** Toast type — controls the `aria-live` politeness. @default 'background' */
  type?: 'foreground' | 'background';
  /** Initial open state for the uncontrolled mode (when `v-model:open` is not bound). @default true */
  defaultOpen?: boolean;
  /** Force the toast to stay mounted regardless of `open` (useful with external animation libraries). */
  forceMount?: boolean;
  /**
   * Teleport this toast into the `ToastViewport` and register it for keyboard
   * focus ordering. Lets toasts be authored anywhere in the tree. When the
   * viewport is not mounted yet, the toast renders in place as a fallback.
   * @default false
   */
  toViewport?: boolean;
}

// Stable, stateless once-listener reused across swipe gestures so pointerup does
// not allocate a fresh closure per gesture end.
const preventClickOnce = (event: Event) => event.preventDefault();

export interface ToastRootEmits {
  escapeKeyDown: [event: KeyboardEvent];
  pause: [];
  resume: [];
  swipeStart: [event: SwipeEvent];
  swipeMove: [event: SwipeEvent];
  swipeCancel: [event: SwipeEvent];
  swipeEnd: [event: SwipeEvent];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';

import { focus, getActiveElement } from '@robonen/platform/browsers';
import { useForwardExpose, useRafFn } from '@robonen/vue';
import { useCollectionInjector } from '../../utilities/collection';
import { useId } from '../../utilities/config-provider';
import { Presence } from '../../utilities/presence';
import { Primitive } from '../../internal/primitive';
import { Teleport as TeleportPrimitive } from '../../utilities/teleport';
import ToastAnnounce from './ToastAnnounce.vue';
import { provideToastContext, useToastProviderContext } from './context';
import { TOAST_COLLECTION_KEY } from './shared';
import {
  TOAST_SWIPE_CANCEL,
  TOAST_SWIPE_END,
  TOAST_SWIPE_MOVE,
  TOAST_SWIPE_START,
  VIEWPORT_PAUSE,
  VIEWPORT_RESUME,
  getAnnounceTextContent,
  handleAndDispatchCustomEvent,
  isDeltaInDirection,
} from './utils';

defineOptions({
  inheritAttrs: false,
});

const {
  as = 'li',
  duration,
  type = 'background',
  defaultOpen = true,
  forceMount,
  toViewport = false,
} = defineProps<ToastRootProps>();

const emit = defineEmits<ToastRootEmits>();

if (type !== 'foreground' && type !== 'background')
  throw new Error('Invalid prop `type` supplied to `ToastRoot`. Expected `foreground | background`.');

const { forwardRef, currentElement } = useForwardExpose();
const providerCtx = useToastProviderContext();
const { CollectionItem } = useCollectionInjector(TOAST_COLLECTION_KEY);
const toastId = useId(undefined, 'toast');
const durationRef = toRef(() => duration);

const localOpen = ref(defaultOpen);
const open = defineModel<boolean>('open', {
  default: undefined,
  get: external => external ?? localOpen.value,
  set: (value) => {
    localOpen.value = value;
    return value;
  },
});

const resolvedDuration = computed(() => durationRef.value ?? providerCtx.duration.value);

// Swipe gesture state. Plain mutable locals — read/written only inside the JS
// pointer handlers, never bound in the template and no computed depends on them,
// so they need no reactivity. Keeping them non-reactive avoids per-pointer-move
// proxy wrapping of the fresh {x,y} object and dep track/trigger with zero subscribers.
let pointerStart: { x: number; y: number } | null = null;
let swipeDelta: { x: number; y: number } | null = null;

// Elapsed-time-preserving timer state. On pause we bank the remaining time and
// on resume we continue from it, rather than restarting the full duration.
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let closeTimerStartTime = 0;
let closeTimerRemaining = resolvedDuration.value;

const remaining = ref(resolvedDuration.value);

const remainingRaf = useRafFn(() => {
  const elapsed = Date.now() - closeTimerStartTime;
  remaining.value = Math.max(closeTimerRemaining - elapsed, 0);
}, { immediate: false, fpsLimit: 60 });

function clearTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function startTimer(ms: number) {
  clearTimer();
  if (ms === Infinity || ms <= 0 || !Number.isFinite(ms)) return;
  closeTimerStartTime = Date.now();
  closeTimer = setTimeout(() => {
    open.value = false;
  }, ms);
}

function handleClose() {
  // Move focus back to the viewport when the closing toast holds focus, so SR
  // users keep context and focus is not lost to the document body.
  const active = getActiveElement();
  const isFocusInToast = !!currentElement.value && !!active && currentElement.value.contains(active);
  if (isFocusInToast) focus(providerCtx.viewportRef.value);

  providerCtx.isClosePausedRef.value = false;
  open.value = false;
}

function handleEscapeKeyDown(event: KeyboardEvent) {
  emit('escapeKeyDown', event);
  // Pressing Escape while a toast is focused dismisses it (matches the
  // ToastClose / auto-dismiss path).
  if (!event.defaultPrevented) {
    providerCtx.isFocusedToastEscapeKeyDownRef.value = true;
    handleClose();
  }
}

function pauseTimer() {
  // Bank the time already elapsed so resume continues from the remainder.
  const elapsed = Date.now() - closeTimerStartTime;
  closeTimerRemaining = Math.max(closeTimerRemaining - elapsed, 0);
  clearTimer();
  remainingRaf.pause();
  providerCtx.isClosePausedRef.value = true;
  emit('pause');
}

function resumeTimer() {
  providerCtx.isClosePausedRef.value = false;
  startTimer(closeTimerRemaining);
  remainingRaf.resume();
  emit('resume');
}

// Restart timer when reactive duration changes (and we are not paused).
watch(
  resolvedDuration,
  (ms) => {
    closeTimerRemaining = ms;
    remaining.value = ms;
    if (!open.value) return;
    if (providerCtx.isClosePausedRef.value) return;
    startTimer(ms);
  },
);

watch(open, (value) => {
  if (value) {
    closeTimerRemaining = resolvedDuration.value;
    remaining.value = resolvedDuration.value;
    if (!providerCtx.isClosePausedRef.value) {
      startTimer(closeTimerRemaining);
      remainingRaf.resume();
    }
  }
  else {
    clearTimer();
    remainingRaf.pause();
  }
});

const dataState = computed(() => (open.value ? 'open' : 'closed'));
const ariaLive = computed(() => (type === 'foreground' ? 'assertive' : 'polite'));

// Harvested text chunks for the dedicated screen-reader announce region. Reading
// `currentElement` keeps this in sync once the visible toast has mounted; the
// announce region defers rendering with a double rAF so the harvested text is
// present by the time it lands in the accessibility tree.
const announceText = computed(() =>
  currentElement.value ? getAnnounceTextContent(currentElement.value) : [],
);

// Swipe gesture handlers — only active when swipe is enabled on the provider.
function onPointerDown(event: PointerEvent) {
  if (providerCtx.disableSwipe.value || event.button !== 0) return;
  pointerStart = { x: event.clientX, y: event.clientY };
}

function onPointerMove(event: PointerEvent) {
  if (providerCtx.disableSwipe.value || !pointerStart) return;

  const x = event.clientX - pointerStart.x;
  const y = event.clientY - pointerStart.y;
  const hasSwipeMoveStarted = Boolean(swipeDelta);
  const direction = providerCtx.swipeDirection.value;
  const isHorizontal = direction === 'left' || direction === 'right';
  const clamp = direction === 'left' || direction === 'up' ? Math.min : Math.max;
  const clampedX = isHorizontal ? clamp(0, x) : 0;
  const clampedY = !isHorizontal ? clamp(0, y) : 0;
  const moveStartBuffer = event.pointerType === 'touch' ? 10 : 2;
  const delta = { x: clampedX, y: clampedY };
  const detail = { originalEvent: event, delta };

  if (hasSwipeMoveStarted) {
    swipeDelta = delta;
    handleAndDispatchCustomEvent(TOAST_SWIPE_MOVE, onSwipeMove, detail);
  }
  else if (isDeltaInDirection(delta, direction, moveStartBuffer)) {
    swipeDelta = delta;
    handleAndDispatchCustomEvent(TOAST_SWIPE_START, onSwipeStart, detail);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }
  else if (Math.abs(x) > moveStartBuffer || Math.abs(y) > moveStartBuffer) {
    // Swiping in the wrong direction — abandon the gesture for this interaction.
    pointerStart = null;
  }
}

function onPointerUp(event: PointerEvent) {
  if (providerCtx.disableSwipe.value) return;

  const delta = swipeDelta;
  const target = event.target as HTMLElement;
  if (target.hasPointerCapture(event.pointerId))
    target.releasePointerCapture(event.pointerId);

  swipeDelta = null;
  pointerStart = null;

  if (!delta) return;

  const toast = event.currentTarget as HTMLElement | null;
  const detail = { originalEvent: event, delta };

  if (isDeltaInDirection(delta, providerCtx.swipeDirection.value, providerCtx.swipeThreshold.value))
    handleAndDispatchCustomEvent(TOAST_SWIPE_END, onSwipeEnd, detail);
  else
    handleAndDispatchCustomEvent(TOAST_SWIPE_CANCEL, onSwipeCancel, detail);

  // Prevent a click firing on toast contents when pointerup ends a swipe.
  toast?.addEventListener('click', preventClickOnce, { once: true });
}

function setSwipeVar(el: HTMLElement, name: string, value: string | null) {
  if (value === null) el.style.removeProperty(name);
  else el.style.setProperty(name, value);
}

// These run as the once-listener inside `handleAndDispatchCustomEvent`. They
// forward the Vue emit (so consumers can `preventDefault()` the SwipeEvent) and,
// unless prevented, apply the `data-swipe` state + CSS custom properties used to
// drive swipe animations.
function onSwipeStart(event: SwipeEvent) {
  emit('swipeStart', event);
  if (event.defaultPrevented) return;
  event.currentTarget.setAttribute('data-swipe', 'start');
}

function onSwipeMove(event: SwipeEvent) {
  emit('swipeMove', event);
  if (event.defaultPrevented) return;
  const { x, y } = event.detail.delta;
  const el = event.currentTarget;
  el.setAttribute('data-swipe', 'move');
  setSwipeVar(el, '--primitives-toast-swipe-move-x', `${x}px`);
  setSwipeVar(el, '--primitives-toast-swipe-move-y', `${y}px`);
}

function onSwipeCancel(event: SwipeEvent) {
  emit('swipeCancel', event);
  if (event.defaultPrevented) return;
  const el = event.currentTarget;
  el.setAttribute('data-swipe', 'cancel');
  setSwipeVar(el, '--primitives-toast-swipe-move-x', null);
  setSwipeVar(el, '--primitives-toast-swipe-move-y', null);
  setSwipeVar(el, '--primitives-toast-swipe-end-x', null);
  setSwipeVar(el, '--primitives-toast-swipe-end-y', null);
}

function onSwipeEnd(event: SwipeEvent) {
  emit('swipeEnd', event);
  if (event.defaultPrevented) return;
  const { x, y } = event.detail.delta;
  const el = event.currentTarget;
  el.setAttribute('data-swipe', 'end');
  setSwipeVar(el, '--primitives-toast-swipe-move-x', null);
  setSwipeVar(el, '--primitives-toast-swipe-move-y', null);
  setSwipeVar(el, '--primitives-toast-swipe-end-x', `${x}px`);
  setSwipeVar(el, '--primitives-toast-swipe-end-y', `${y}px`);
  open.value = false;
}

const swipeStyle = computed(() =>
  providerCtx.disableSwipe.value ? undefined : { userSelect: 'none', touchAction: 'none' } as const,
);

const useTeleport = computed(() => toViewport && !!providerCtx.viewportRef.value);

onMounted(() => {
  providerCtx.onToastAdd();
  if (open.value && !providerCtx.isClosePausedRef.value) {
    startTimer(closeTimerRemaining);
    remainingRaf.resume();
  }

  const viewport = providerCtx.viewportRef.value;
  if (viewport) {
    viewport.addEventListener(VIEWPORT_PAUSE, pauseTimer);
    viewport.addEventListener(VIEWPORT_RESUME, resumeTimer);
  }
});

onBeforeUnmount(() => {
  providerCtx.onToastRemove();
  clearTimer();
  remainingRaf.pause();

  const viewport = providerCtx.viewportRef.value;
  if (viewport) {
    viewport.removeEventListener(VIEWPORT_PAUSE, pauseTimer);
    viewport.removeEventListener(VIEWPORT_RESUME, resumeTimer);
  }
});

provideToastContext({
  onClose: handleClose,
  duration: durationRef,
  open,
  toastId,
});
</script>

<template>
  <ToastAnnounce
    v-if="open && announceText.length > 0"
    :aria-live="ariaLive"
  >
    <!--
      Render each harvested chunk as its own text node so screen readers get a
      natural pause break between the title and description. Interpolating the
      array directly would route through `toDisplayString` and announce literal
      brackets/commas instead.
    -->
    <template
      v-for="(text, i) in announceText"
      :key="i"
    >
      {{ text }}
    </template>
  </ToastAnnounce>

  <TeleportPrimitive
    v-if="useTeleport"
    :to="providerCtx.viewportRef.value"
    :force-mount="true"
  >
    <Presence :present="forceMount || open">
      <CollectionItem>
        <Primitive
          :ref="forwardRef"
          :as="as"
          v-bind="$attrs"
          role="status"
          :aria-live="ariaLive"
          :aria-atomic="true"
          :data-state="dataState"
          :data-type="type"
          :data-swipe-direction="providerCtx.swipeDirection.value"
          tabindex="-1"
          :style="swipeStyle"
          @keydown.escape="handleEscapeKeyDown"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
        >
          <slot
            :open="open"
            :remaining="remaining"
            :duration="resolvedDuration"
          />
        </Primitive>
      </CollectionItem>
    </Presence>
  </TeleportPrimitive>

  <Presence
    v-else
    :present="forceMount || open"
  >
    <CollectionItem>
      <Primitive
        :ref="forwardRef"
        :as="as"
        v-bind="$attrs"
        role="status"
        :aria-atomic="true"
        :data-state="dataState"
        :data-type="type"
        :data-swipe-direction="providerCtx.swipeDirection.value"
        tabindex="-1"
        :style="swipeStyle"
        @keydown.escape="handleEscapeKeyDown"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
      >
        <slot
          :open="open"
          :remaining="remaining"
          :duration="resolvedDuration"
        />
      </Primitive>
    </CollectionItem>
  </Presence>
</template>
