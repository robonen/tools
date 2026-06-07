<script lang="ts">
import type { SwipeDirection } from './context';

export interface ToastProviderProps {
  /** Accessible label for the toast region. @default 'Notifications' */
  label?: string;
  /** Auto-dismiss duration in ms. Use `Infinity` to disable auto-dismiss. @default 5000 */
  duration?: number;
  /** Swipe direction to dismiss. @default 'right' */
  swipeDirection?: SwipeDirection;
  /** Minimum swipe distance before a dismiss gesture is recognised. @default 50 */
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
