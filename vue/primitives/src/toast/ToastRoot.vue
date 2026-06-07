<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ToastRootProps extends PrimitiveProps {
  /** Override the provider's auto-dismiss duration. Use `Infinity` to disable. */
  duration?: number;
  /** Toast type — controls the `aria-live` politeness. @default 'background' */
  type?: 'foreground' | 'background';
}

export interface ToastRootEmits {
  'update:open': [open: boolean];
  escapeKeyDown: [event: KeyboardEvent];
  pause: [];
  resume: [];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, toRef, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';
import { Presence } from '../presence';
import { Primitive } from '../primitive';
import { provideToastContext, useToastProviderContext } from './context';
import { VIEWPORT_PAUSE, VIEWPORT_RESUME } from './utils';

const {
  as = 'li',
  duration,
  type = 'background',
} = defineProps<ToastRootProps>();

const emit = defineEmits<ToastRootEmits>();

const { forwardRef } = useForwardExpose();
const providerCtx = useToastProviderContext();
const toastId = useId(undefined, 'toast');
const durationRef = toRef(() => duration);

const open = defineModel<boolean>('open', {
  default: true,
});

let closeTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function startTimer(ms: number) {
  clearTimer();
  if (ms === Infinity || ms <= 0 || !Number.isFinite(ms)) return;
  closeTimer = setTimeout(() => {
    open.value = false;
    emit('update:open', false);
  }, ms);
}

function handleClose() {
  open.value = false;
  emit('update:open', false);
}

function pauseTimer() {
  clearTimer();
  providerCtx.isClosePausedRef.value = true;
  emit('pause');
}

function resumeTimer() {
  providerCtx.isClosePausedRef.value = false;
  const ms = durationRef.value ?? providerCtx.duration.value;
  startTimer(ms);
  emit('resume');
}

// Restart timer when reactive duration changes (and we are not paused).
watch(
  [durationRef, () => providerCtx.duration.value],
  () => {
    if (!open.value) return;
    if (providerCtx.isClosePausedRef.value) return;
    const ms = durationRef.value ?? providerCtx.duration.value;
    startTimer(ms);
  },
);

onMounted(() => {
  providerCtx.onToastAdd();
  const ms = durationRef.value ?? providerCtx.duration.value;
  startTimer(ms);

  const viewport = providerCtx.viewportRef.value;
  if (viewport) {
    viewport.addEventListener(VIEWPORT_PAUSE, pauseTimer);
    viewport.addEventListener(VIEWPORT_RESUME, resumeTimer);
  }
});

onBeforeUnmount(() => {
  providerCtx.onToastRemove();
  clearTimer();

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
  <Presence :present="open">
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="status"
      :aria-live="type === 'foreground' ? 'assertive' : 'polite'"
      :aria-atomic="true"
      :data-state="open ? 'open' : 'closed'"
      :data-type="type"
      tabindex="-1"
      @keydown.escape="emit('escapeKeyDown', $event)"
    >
      <slot />
    </Primitive>
  </Presence>
</template>
