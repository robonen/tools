<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { ScrollAreaSizes } from './types';

export interface ScrollAreaScrollbarImplProps extends PrimitiveProps {
  orientation: 'horizontal' | 'vertical';
  sizes: ScrollAreaSizes;
  hasThumb: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { debounce } from '@robonen/stdlib';
import { Primitive } from '../../internal/primitive';
import { getThumbSize, toInt } from './utils';
import { useForwardExpose } from '@robonen/vue';
import { useScrollAreaRootContext } from './context';

defineOptions({ inheritAttrs: false });

const props = defineProps<ScrollAreaScrollbarImplProps>();
const emit = defineEmits<{
  sizesChange: [sizes: ScrollAreaSizes];
  wheelScroll: [event: WheelEvent, maxScroll: number];
  dragScroll: [pointerPos: number];
  thumbPositionChange: [];
  registerScrollbar: [el: HTMLElement | null];
}>();

const ctx = useScrollAreaRootContext();
const { forwardRef, currentElement } = useForwardExpose();

const isHorizontal = computed(() => props.orientation === 'horizontal');
const rectRef = ref<DOMRect | null>(null);
const prevWebkitUserSelect = ref('');
const prevPointerEvents = ref('');
const prevScrollBehavior = ref('');

/** Live viewport scroll position along this scrollbar's axis. */
const scrollPos = ref(0);

const maxScroll = computed(() =>
  Math.max(0, props.sizes.content - props.sizes.viewport),
);

const ariaValueNow = computed(() => {
  if (maxScroll.value <= 0) return 0;
  const pct = (scrollPos.value / maxScroll.value) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
});

/** Scrollbar is interactive only when content actually overflows. */
const isInteractive = computed(() => props.hasThumb && maxScroll.value > 0);

/**
 * Thumb length along this scrollbar's axis, exposed as the CSS var that
 * `ScrollAreaThumb` reads. Without this the thumb collapses to zero length.
 */
const thumbSize = computed(() => `${getThumbSize(props.sizes)}px`);

/**
 * Absolute positioning of the track. RTL flips the resting edge: the vertical
 * bar moves to the left, and the horizontal bar's corner gap swaps sides.
 */
const positionStyle = computed(() => {
  const isRtl = ctx.dir.value === 'rtl';
  if (isHorizontal.value) {
    return {
      bottom: 0,
      left: isRtl ? 'var(--scroll-area-corner-width)' : 0,
      right: isRtl ? 0 : 'var(--scroll-area-corner-width)',
      '--scroll-area-thumb-width': thumbSize.value,
    };
  }
  return {
    top: 0,
    right: isRtl ? undefined : 0,
    left: isRtl ? 0 : undefined,
    bottom: 'var(--scroll-area-corner-height)',
    '--scroll-area-thumb-height': thumbSize.value,
  };
});

function updateScrollPos() {
  const vp = ctx.viewport.value;
  if (!vp) return;
  scrollPos.value = isHorizontal.value ? vp.scrollLeft : vp.scrollTop;
}

function getPointerPosition(event: PointerEvent): number {
  const rect = rectRef.value;
  if (!rect)
    return 0;
  return isHorizontal.value ? event.clientX - rect.left : event.clientY - rect.top;
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0)
    return;
  const target = event.target as HTMLElement;
  target.setPointerCapture(event.pointerId);
  rectRef.value = currentElement.value?.getBoundingClientRect() ?? null;
  prevWebkitUserSelect.value = document.body.style.webkitUserSelect;
  document.body.style.webkitUserSelect = 'none';
  if (ctx.viewport.value) {
    prevPointerEvents.value = ctx.viewport.value.style.pointerEvents;
    ctx.viewport.value.style.pointerEvents = 'none';
    // Disable smooth scrolling during the drag so the thumb tracks the
    // pointer 1:1 instead of lagging behind a `scroll-behavior: smooth`.
    prevScrollBehavior.value = ctx.viewport.value.style.scrollBehavior;
    ctx.viewport.value.style.scrollBehavior = 'auto';
  }
  emit('dragScroll', getPointerPosition(event));
}

function onPointerMove(event: PointerEvent) {
  // `rectRef` is only set on pointerdown and cleared on pointerup, so it is the
  // natural drag flag. Without this guard `pointermove` fires on every hover
  // move over the track: each one emits `dragScroll` with a position of 0
  // (getPointerPosition returns 0 when `rectRef` is null) and forces the
  // viewport toward scroll position 0 — both wasted work and a correctness bug.
  if (!rectRef.value)
    return;
  emit('dragScroll', getPointerPosition(event));
}

function onPointerUp(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (target.hasPointerCapture(event.pointerId))
    target.releasePointerCapture(event.pointerId);
  document.body.style.webkitUserSelect = prevWebkitUserSelect.value;
  if (ctx.viewport.value) {
    ctx.viewport.value.style.pointerEvents = prevPointerEvents.value;
    ctx.viewport.value.style.scrollBehavior = prevScrollBehavior.value;
  }
  rectRef.value = null;
}

/**
 * Wheeling over the scrollbar scrolls the viewport. The listener must be
 * non-passive so `preventDefault` inside the handler can stop the page from
 * scrolling when the viewport is mid-range; an `@wheel.passive` binding would
 * make that `preventDefault` a no-op. It is scoped to wheels landing on this
 * scrollbar via `contains`.
 */
function onWheel(event: WheelEvent) {
  const sb = currentElement.value;
  if (!sb || !sb.contains(event.target as Node))
    return;
  emit('wheelScroll', event, maxScroll.value);
}

/**
 * WAI-ARIA scrollbar pattern — Arrow ±5% of the viewport size, PageUp/Down
 * jump a full viewport, Home/End to the extremes. In RTL the horizontal
 * arrow keys are visually reversed.
 */
function onKeyDown(event: KeyboardEvent) {
  if (!isInteractive.value) return;
  const vp = ctx.viewport.value;
  if (!vp) return;

  const step = Math.max(1, Math.round(props.sizes.viewport * 0.05));
  const page = Math.max(step, props.sizes.viewport);
  const dir = ctx.dir.value;

  let delta = 0;
  let absolute: number | null = null;

  if (isHorizontal.value) {
    const forwardKey = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backwardKey = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forwardKey) delta = step;
    else if (event.key === backwardKey) delta = -step;
    else if (event.key === 'PageDown' || event.key === 'PageUp')
      delta = event.key === 'PageDown' ? page : -page;
    else if (event.key === 'Home') absolute = 0;
    else if (event.key === 'End') absolute = maxScroll.value;
    else return;
  }
  else if (event.key === 'ArrowDown') delta = step;
  else if (event.key === 'ArrowUp') delta = -step;
  else if (event.key === 'PageDown') delta = page;
  else if (event.key === 'PageUp') delta = -page;
  else if (event.key === 'Home') absolute = 0;
  else if (event.key === 'End') absolute = maxScroll.value;
  else return;

  event.preventDefault();
  const current = isHorizontal.value ? vp.scrollLeft : vp.scrollTop;
  const next = absolute !== null
    ? absolute
    : Math.max(0, Math.min(maxScroll.value, current + delta));
  if (isHorizontal.value) vp.scrollLeft = next;
  else vp.scrollTop = next;
}

function measure() {
  const sb = currentElement.value;
  const vp = ctx.viewport.value;
  const co = ctx.content.value;
  if (!sb || !vp)
    return;
  const cs = globalThis.getComputedStyle(sb);
  emit('sizesChange', {
    content: co ? (isHorizontal.value ? co.scrollWidth : co.scrollHeight) : (isHorizontal.value ? vp.scrollWidth : vp.scrollHeight),
    viewport: isHorizontal.value ? vp.offsetWidth : vp.offsetHeight,
    scrollbar: {
      size: isHorizontal.value ? sb.clientWidth : sb.clientHeight,
      paddingStart: isHorizontal.value ? toInt(cs.paddingLeft) : toInt(cs.paddingTop),
      paddingEnd: isHorizontal.value ? toInt(cs.paddingRight) : toInt(cs.paddingBottom),
    },
  });
}

let sbObs: ResizeObserver | null = null;
let vpObs: ResizeObserver | null = null;
let coObs: ResizeObserver | null = null;

/**
 * A single layout change can resize more than one observed element (scrollbar,
 * viewport, content), invoking the observer callback multiple times
 * synchronously — each forcing a `getComputedStyle` + scrollWidth/offsetWidth
 * read. Debouncing (mirroring `ScrollAreaScrollbarAuto`) coalesces those into
 * one measure per burst. `attach()` still calls the undebounced `measure()`
 * once so the initial size is available immediately on mount (no thumb flash).
 */
const measureDebounced = debounce(measure, 10);

/** The element the non-passive wheel listener is currently bound to. */
let wheelEl: HTMLElement | null = null;

function attachWheel() {
  const sb = currentElement.value ?? null;
  if (wheelEl === sb)
    return;
  wheelEl?.removeEventListener('wheel', onWheel);
  wheelEl = sb;
  // Non-passive so `preventDefault` inside `onWheel` can stop the page from
  // scrolling when the viewport is mid-range. Scoped to the scrollbar element
  // itself rather than `document`, so unrelated page wheels no longer pay the
  // non-passive cost or run the handler.
  wheelEl?.addEventListener('wheel', onWheel, { passive: false });
}

function attach() {
  detach();
  if (currentElement.value) {
    sbObs = new ResizeObserver(measureDebounced);
    sbObs.observe(currentElement.value);
  }
  if (ctx.viewport.value) {
    vpObs = new ResizeObserver(measureDebounced);
    vpObs.observe(ctx.viewport.value);
  }
  if (ctx.content.value) {
    coObs = new ResizeObserver(measureDebounced);
    coObs.observe(ctx.content.value);
  }
  attachWheel();
  measure();
  updateScrollPos();
  emit('thumbPositionChange');
}

function detach() {
  measureDebounced.cancel();
  sbObs?.disconnect();
  sbObs = null;
  vpObs?.disconnect();
  vpObs = null;
  coObs?.disconnect();
  coObs = null;
}

function registerScrollbarEl(el: HTMLElement | null) {
  emit('registerScrollbar', el);
  if (isHorizontal.value)
    ctx.onScrollbarXChange(el);
  else
    ctx.onScrollbarYChange(el);
}

onMounted(() => {
  registerScrollbarEl(currentElement.value ?? null);
  attach();
});

watch([() => ctx.viewport.value, () => ctx.content.value, currentElement], attach);

function onViewportScroll() {
  updateScrollPos();
  emit('thumbPositionChange');
}

watch(() => ctx.viewport.value, (vp, prev) => {
  prev?.removeEventListener('scroll', onViewportScroll);
  vp?.addEventListener('scroll', onViewportScroll, { passive: true });
}, { immediate: true });

onScopeDispose(() => {
  detach();
  wheelEl?.removeEventListener('wheel', onWheel);
  wheelEl = null;
  ctx.viewport.value?.removeEventListener('scroll', onViewportScroll);
  registerScrollbarEl(null);
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as ?? 'div'"
    role="scrollbar"
    :aria-orientation="orientation"
    :aria-controls="ctx.viewportId.value"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="ariaValueNow"
    :tabindex="isInteractive ? 0 : -1"
    :aria-disabled="isInteractive ? undefined : true"
    :data-orientation="orientation"
    :style="{
      position: 'absolute',
      ...positionStyle,
    }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @keydown="onKeyDown"
  >
    <slot />
  </Primitive>
</template>
