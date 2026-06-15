<script lang="ts">
import type { SwipeDirection } from './context';

/**
 * Toast — a succinct, non-disruptive notification that appears in a corner of the
 * screen and auto-dismisses after a timeout. Use it to confirm actions or surface
 * background events without interrupting the user's flow.
 *
 * `ToastProvider` is the top-level wrapper that holds shared settings (label, default
 * duration, swipe behaviour) and coordinates timer pausing across all toasts. Wrap
 * your app (or the region that renders toasts) in a single provider, render one
 * `ToastViewport` for placement, and mount a `ToastRoot` per notification.
 */
export interface ToastProviderProps {
  /** Accessible label for the toast region. @default 'Notifications' */
  label?: string;
  /** Auto-dismiss duration in ms. Use `Infinity` to disable auto-dismiss. @default 5000 */
  duration?: number;
  /** Swipe direction that dismisses a toast. @default 'right' */
  swipeDirection?: SwipeDirection;
  /** Minimum swipe distance (px) before a dismiss gesture is recognised. @default 50 */
  swipeThreshold?: number;
  /** Disable swipe-to-dismiss gestures for every toast. @default false */
  disableSwipe?: boolean;
}
</script>

<script setup lang="ts">
import { ref, shallowRef, toRef } from 'vue';

import { useCollectionProvider } from '../../utilities/collection';
import { provideToastProviderContext } from './context';
import { TOAST_COLLECTION_KEY } from './shared';

const {
  label = 'Notifications',
  duration = 5000,
  swipeDirection = 'right',
  swipeThreshold = 50,
  disableSwipe = false,
} = defineProps<ToastProviderProps>();

if (typeof label === 'string' && label.trim() === '')
  throw new Error('Invalid prop `label` supplied to `ToastProvider`. Expected a non-empty string.');

const labelRef = toRef(() => label);
const durationRef = toRef(() => duration);
const swipeDirectionRef = toRef(() => swipeDirection);
const swipeThresholdRef = toRef(() => swipeThreshold);
const disableSwipeRef = toRef(() => disableSwipe);

const toastCount = ref(0);
const viewportRef = shallowRef<HTMLElement | undefined>(undefined);
const isFocusedToastEscapeKeyDownRef = ref(false);
const isClosePausedRef = ref(false);

// Dedicated collection key so a nested collection provider (or another toast
// provider) does not shadow this one for descendant toasts/viewports.
useCollectionProvider(TOAST_COLLECTION_KEY);

provideToastProviderContext({
  label: labelRef,
  duration: durationRef,
  swipeDirection: swipeDirectionRef,
  swipeThreshold: swipeThresholdRef,
  disableSwipe: disableSwipeRef,
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
