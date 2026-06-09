<script lang="ts">
import type { SwipeDirection } from './context';

/**
 * Toast — a succinct, non-disruptive notification that appears in a corner of the
 * screen and auto-dismisses after a timeout. Use it to confirm actions or surface
 * background events without interrupting the user's flow.
 *
 * `ToastProvider` is the top-level wrapper that holds shared settings (label, default
 * duration) and coordinates timer pausing across all toasts. Wrap your app (or the
 * region that renders toasts) in a single provider, render one `ToastViewport` for
 * placement, and mount a `ToastRoot` per notification.
 */
export interface ToastProviderProps {
  /** Accessible label for the toast region. @default 'Notifications' */
  label?: string;
  /** Auto-dismiss duration in ms. Use `Infinity` to disable auto-dismiss. @default 5000 */
  duration?: number;
  /**
   * Swipe direction to dismiss.
   *
   * NOTE: swipe-to-dismiss is not yet implemented. This value is stored and exposed via
   * context for forward compatibility, but no swipe gesture is currently wired up.
   * @default 'right'
   */
  swipeDirection?: SwipeDirection;
  /**
   * Minimum swipe distance before a dismiss gesture is recognised.
   *
   * NOTE: swipe-to-dismiss is not yet implemented (see `swipeDirection`); this value has
   * no effect until a swipe gesture is added.
   * @default 50
   */
  swipeThreshold?: number;
}
</script>

<script setup lang="ts">
import { ref, shallowRef, toRef } from 'vue';

import { provideToastProviderContext } from './context';

const {
  label = 'Notifications',
  duration = 5000,
  swipeDirection = 'right',
  swipeThreshold = 50,
} = defineProps<ToastProviderProps>();

const labelRef = toRef(() => label);
const durationRef = toRef(() => duration);
const swipeDirectionRef = toRef(() => swipeDirection);
const swipeThresholdRef = toRef(() => swipeThreshold);

const toastCount = ref(0);
const viewportRef = shallowRef<HTMLElement | undefined>(undefined);
const isFocusedToastEscapeKeyDownRef = ref(false);
const isClosePausedRef = ref(false);

provideToastProviderContext({
  label: labelRef,
  duration: durationRef,
  swipeDirection: swipeDirectionRef,
  swipeThreshold: swipeThresholdRef,
  toastCount,
  viewportRef,
  onViewportChange: (el) => { viewportRef.value = el; },
  onToastAdd: () => { toastCount.value++; },
  onToastRemove: () => { toastCount.value--; },
  isFocusedToastEscapeKeyDownRef,
  isClosePausedRef,
});
</script>

<template>
  <slot />
</template>
