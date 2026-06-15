<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A visually-hidden, `aria-live="polite"` region that announces the visible
 * window after it settles — the accessible alternative to announcing every tick.
 *
 * It debounces on every `offset` / `zoom` / `mode` / `fps` change and, once the
 * viewport stops moving for `settleDelay` ms, writes a single human summary:
 * the visible time range, the seconds-per-tick (zoom granularity), and the
 * frame rate (in frame-based modes). Provide `formatMessage` to fully customise
 * the announcement.
 */
export interface TimeRulerScreenReaderSummaryProps extends PrimitiveProps {
  /** Debounce before announcing, in milliseconds. @default 400 */
  settleDelay?: number;
  /**
   * Build the announcement string. Receives the settled view (visible `start` /
   * `end` seconds, `secondsPerTick`, `zoom`, `fps`, `mode`) and the bound
   * `formatTime` helper. Defaults to a `"Showing <a> to <b>, …"` sentence.
   */
  formatMessage?: (view: {
    start: number;
    end: number;
    secondsPerTick: number;
    zoom: number;
    fps: number;
    mode: string;
    formatTime: (seconds: number) => string;
  }) => string;
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDebounceFn, useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useTimeRulerContext } from './context';

const {
  settleDelay = 400,
  formatMessage,
  as = 'div',
} = defineProps<TimeRulerScreenReaderSummaryProps>();

const { forwardRef } = useForwardExpose();

const ctx = useTimeRulerContext();

// The visually-hidden style; same recipe as `VisuallyHidden`.
const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: '0',
} as const;

const message = ref('');

/** Seconds between adjacent ticks — the announced zoom granularity. */
const secondsPerTick = computed(() => {
  const t = ctx.ticks.value;
  if (t.length >= 2) return Math.abs(t[1]!.value - t[0]!.value);
  return 0;
});

/** The visible window `[start, end]` in seconds (from the first/last tick spread + offset/zoom). */
function visibleRange(): [number, number] {
  const start = ctx.offset.value;
  // `invert` is unavailable here without width; derive end from the ticks when
  // possible, else fall back to the offset. The end is best-effort for SR text.
  const t = ctx.ticks.value;
  const end = t.length > 0 ? Math.max(start, t[t.length - 1]!.value) : start;
  return [start, end];
}

function defaultMessage(view: {
  start: number;
  end: number;
  secondsPerTick: number;
  zoom: number;
  fps: number;
  mode: string;
  formatTime: (s: number) => string;
}): string {
  const range = `Showing ${view.formatTime(view.start)} to ${view.formatTime(view.end)}`;
  const grain = view.secondsPerTick > 0
    ? `, ${view.secondsPerTick.toFixed(view.secondsPerTick < 1 ? 2 : 0)} seconds per tick`
    : '';
  const rate = view.mode === 'seconds' ? '' : `, ${view.fps} frames per second`;
  return `${range}${grain}${rate}.`;
}

function announce(): void {
  const [start, end] = visibleRange();
  const view = {
    start,
    end,
    secondsPerTick: secondsPerTick.value,
    zoom: ctx.zoom.value,
    fps: ctx.fps.value,
    mode: ctx.mode.value,
    formatTime: ctx.formatTime,
  };
  message.value = formatMessage ? formatMessage(view) : defaultMessage(view);
}

const debouncedAnnounce = useDebounceFn(announce, settleDelay);

watch(
  () => [ctx.offset.value, ctx.zoom.value, ctx.mode.value, ctx.fps.value],
  () => { void debouncedAnnounce(); },
  { immediate: true },
);
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    :style="visuallyHidden"
  >
    <slot :message="message">{{ message }}</slot>
  </Primitive>
</template>
