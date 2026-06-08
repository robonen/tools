<script lang="ts">
import type { PrimitiveProps } from '../primitive';
</script>

<script setup lang="ts">
import type { ScrollAreaSizes } from './types';
import { computed, ref } from 'vue';
import { provideScrollAreaScrollbarContext, useScrollAreaRootContext } from './context';
import ScrollAreaScrollbarImpl from './ScrollAreaScrollbarImpl.vue';
import { getScrollPositionFromPointer, getThumbOffsetFromScroll, getThumbRatio, isScrollingWithinScrollbarBounds } from './utils';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<PrimitiveProps & { orientation?: 'horizontal' | 'vertical' }>(), {
  orientation: 'vertical',
});

const ctx = useScrollAreaRootContext();
const sizes = ref<ScrollAreaSizes>({
  content: 0,
  viewport: 0,
  scrollbar: { size: 0, paddingStart: 0, paddingEnd: 0 },
});

const isHorizontal = computed(() => props.orientation === 'horizontal');
const hasThumb = computed(() => {
  const r = getThumbRatio(sizes.value.viewport, sizes.value.content);
  return r > 0 && r < 1;
});

const thumbEl = ref<HTMLElement | null>(null);
const scrollbarEl = ref<HTMLElement | null>(null);
const pointerOffset = ref(0);

function onSizesChange(s: ScrollAreaSizes) {
  sizes.value = s;
}

function onThumbPointerDown(point: { x: number; y: number }) {
  pointerOffset.value = isHorizontal.value ? point.x : point.y;
}
function onThumbPointerUp() {
  pointerOffset.value = 0;
}

function onWheelScroll(event: WheelEvent, maxScroll: number) {
  const vp = ctx.viewport.value;
  if (!vp)
    return;
  if (isHorizontal.value) {
    const next = vp.scrollLeft + event.deltaY;
    vp.scrollLeft = next;
    if (isScrollingWithinScrollbarBounds(next, maxScroll))
      event.preventDefault();
  }
  else {
    const next = vp.scrollTop + event.deltaY;
    vp.scrollTop = next;
    if (isScrollingWithinScrollbarBounds(next, maxScroll))
      event.preventDefault();
  }
}

function onDragScroll(pointerPos: number) {
  const vp = ctx.viewport.value;
  if (!vp)
    return;
  if (isHorizontal.value) {
    vp.scrollLeft = getScrollPositionFromPointer(pointerPos, pointerOffset.value, sizes.value, ctx.dir.value);
  }
  else {
    vp.scrollTop = getScrollPositionFromPointer(pointerPos, pointerOffset.value, sizes.value);
  }
}

function onThumbPositionChange() {
  const vp = ctx.viewport.value;
  const thumb = thumbEl.value;
  if (!vp || !thumb)
    return;
  if (isHorizontal.value) {
    const offset = getThumbOffsetFromScroll(vp.scrollLeft, sizes.value, ctx.dir.value);
    thumb.style.transform = `translate3d(${offset}px, 0, 0)`;
  }
  else {
    const offset = getThumbOffsetFromScroll(vp.scrollTop, sizes.value);
    thumb.style.transform = `translate3d(0, ${offset}px, 0)`;
  }
}

provideScrollAreaScrollbarContext({
  orientation: props.orientation,
  hasThumb,
  scrollbar: scrollbarEl,
  onThumbChange: (el) => { thumbEl.value = el; },
  onThumbPointerUp,
  onThumbPointerDown,
  onThumbPositionChange,
});
</script>

<template>
  <ScrollAreaScrollbarImpl
    v-bind="$attrs"
    :orientation="orientation"
    :as="as"
    :sizes="sizes"
    :has-thumb="hasThumb"
    @sizes-change="onSizesChange"
    @wheel-scroll="onWheelScroll"
    @drag-scroll="onDragScroll"
    @thumb-position-change="onThumbPositionChange"
    @register-scrollbar="(el) => { scrollbarEl = el; }"
  >
    <slot />
  </ScrollAreaScrollbarImpl>
</template>
