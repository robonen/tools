<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { ScrollAreaSizes } from './types';

export interface ScrollAreaScrollbarImplProps extends PrimitiveProps {
  orientation: 'horizontal' | 'vertical';
  sizes: ScrollAreaSizes;
  hasThumb: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { Primitive } from '../primitive';
import { toInt } from './utils';
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
  }
  emit('dragScroll', getPointerPosition(event));
}

function onPointerMove(event: PointerEvent) {
  emit('dragScroll', getPointerPosition(event));
}

function onPointerUp(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (target.hasPointerCapture(event.pointerId))
    target.releasePointerCapture(event.pointerId);
  document.body.style.webkitUserSelect = prevWebkitUserSelect.value;
  if (ctx.viewport.value)
    ctx.viewport.value.style.pointerEvents = prevPointerEvents.value;
  rectRef.value = null;
}

function onWheel(event: WheelEvent) {
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

function attach() {
  detach();
  if (currentElement.value) {
    sbObs = new ResizeObserver(measure);
    sbObs.observe(currentElement.value);
  }
  if (ctx.viewport.value) {
    vpObs = new ResizeObserver(measure);
    vpObs.observe(ctx.viewport.value);
  }
  if (ctx.content.value) {
    coObs = new ResizeObserver(measure);
    coObs.observe(ctx.content.value);
  }
  measure();
  updateScrollPos();
  emit('thumbPositionChange');
}

function detach() {
  sbObs?.disconnect();
  sbObs = null;
  vpObs?.disconnect();
  vpObs = null;
  coObs?.disconnect();
  coObs = null;
}

onMounted(() => {
  emit('registerScrollbar', currentElement.value ?? null);
  attach();
});

watch([() => ctx.viewport.value, () => ctx.content.value, currentElement], attach);

function onViewportScroll() {
  updateScrollPos();
  emit('thumbPositionChange');
}

watch(() => ctx.viewport.value, (vp, prev) => {
  prev?.removeEventListener('scroll', onViewportScroll);
  vp?.addEventListener('scroll', onViewportScroll);
}, { immediate: true });

onScopeDispose(() => {
  detach();
  ctx.viewport.value?.removeEventListener('scroll', onViewportScroll);
  emit('registerScrollbar', null);
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
      ...(isHorizontal
        ? { bottom: 0, left: 0, right: 'var(--scroll-area-corner-width)' }
        : { top: 0, right: 0, bottom: 'var(--scroll-area-corner-height)' }),
    }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @wheel.passive="onWheel"
    @keydown="onKeyDown"
  >
    <slot />
  </Primitive>
</template>
