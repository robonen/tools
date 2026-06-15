<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { WaveformRegionEdge } from './context';

/**
 * One trim handle of a `WaveformRegion`, rendered as `role="slider"` over
 * `[0, duration]` with `aria-valuenow` = its edge's time. Pass `edge="start"`
 * or `edge="end"`. Dragging trims that edge; Arrow Left/Right move it by `step`
 * (Shift by `largeStep`), Home/End jump the edge to `0` / `duration`. Together
 * the two handles behave like a two-thumb range slider over the region. Default
 * `aria-label` is "Region start" / "Region end".
 */
export interface WaveformRegionHandleProps extends PrimitiveProps {
  /** Which edge of the parent region this handle trims. */
  edge: WaveformRegionEdge;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useWaveformContext, useWaveformRegionContext } from './context';

const { as = 'div', edge } = defineProps<WaveformRegionHandleProps>();
const ctx = useWaveformContext();
const region = useWaveformRegionContext();
const attrs = useAttrs();

const { forwardRef, currentElement } = useForwardExpose();

const value = computed(() => (edge === 'start' ? region.start.value : region.end.value));
const duration = computed(() => (ctx.duration.value > 0 ? ctx.duration.value : 0));

const accessibleLabel = computed<string | undefined>(() => {
  const hasLabel = attrs['aria-label'] !== undefined && attrs['aria-label'] !== null;
  const hasLabelledBy = attrs['aria-labelledby'] !== undefined && attrs['aria-labelledby'] !== null;
  if (hasLabel || hasLabelledBy) return undefined;
  return edge === 'start' ? 'Region start' : 'Region end';
});

const valueText = computed<string | undefined>(() => {
  if (attrs['aria-valuetext'] !== undefined && attrs['aria-valuetext'] !== null) return undefined;
  return ctx.timeFormatter.value(value.value);
});

function timeFromClientX(clientX: number): number {
  // The projection's pixel 0 is the left edge of the root body. Resolve that
  // origin by walking up to the root primitive (it carries `data-waveform-root`)
  // and convert the client x into a body-relative x for `projection.invert`.
  const origin = bodyRect();
  if (!origin) return value.value;
  return ctx.projection.invert(clientX - origin.left);
}

function bodyRect(): DOMRect | undefined {
  let el: HTMLElement | null = currentElement.value ?? null;
  while (el) {
    if (el.hasAttribute('data-waveform-root')) return el.getBoundingClientRect();
    el = el.parentElement;
  }
  return currentElement.value?.offsetParent instanceof HTMLElement
    ? currentElement.value.offsetParent.getBoundingClientRect()
    : undefined;
}

usePointerDrag(currentElement, {
  axis: 'x',
  threshold: 0,
  disabled: () => ctx.disabled.value,
  stopPropagation: true,
  onStart: () => {
    if (ctx.disabled.value) return false;
    return undefined;
  },
  onMove: (state) => {
    region.trim(edge, timeFromClientX(state.point.x));
  },
  onCommit: () => {
    region.trim(edge, value.value, true);
  },
});

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const rtl = ctx.direction.value === 'rtl';
  const stepS = event.shiftKey ? ctx.largeStep.value : ctx.step.value;
  let delta: number;
  switch (event.key) {
    case 'ArrowRight':
      delta = rtl ? -stepS : stepS;
      break;
    case 'ArrowLeft':
      delta = rtl ? stepS : -stepS;
      break;
    case 'Home':
      event.preventDefault();
      region.trim(edge, 0, true);
      return;
    case 'End':
      event.preventDefault();
      region.trim(edge, duration.value, true);
      return;
    default:
      return;
  }
  if (delta === 0) return;
  event.preventDefault();
  region.trim(edge, value.value + delta, true);
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="slider"
    :data-edge="edge"
    :tabindex="ctx.disabled.value ? -1 : 0"
    :aria-label="accessibleLabel"
    :aria-valuemin="0"
    :aria-valuemax="duration"
    :aria-valuenow="value"
    :aria-valuetext="valueText"
    aria-orientation="horizontal"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    @keydown="onKeyDown"
  >
    <slot :edge="edge" :value="value" />
  </Primitive>
</template>
