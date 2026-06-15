<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The gradient bar. Clicking an empty part of the track adds a stop at the click
 * position (its color is interpolated from the neighbouring stops); pressing
 * Enter / Space while the track is focused adds a stop at the center. It owns the
 * shared `trackRef` used by `GradientEditorStop` for pointer ↔ position math and
 * exposes the live `cssGradient` so consumers can paint the bar (e.g. as a CSS
 * `background`). A press that lands on a stop is ignored here — the stop handles
 * its own drag.
 *
 * Render the gradient preview yourself via the slot's `cssGradient`, e.g.
 * `:style="{ background: cssGradient }"`.
 */
export interface GradientEditorTrackProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useGradientEditorContext } from './context';

const { as = 'div' } = defineProps<GradientEditorTrackProps>();

const ctx = useGradientEditorContext();
const { forwardRef, currentElement } = useForwardExpose();

// Publish the bar element to the root so stops can resolve px ↔ position.
watch(currentElement, (el) => {
  ctx.trackRef.value = el ?? null;
}, { immediate: true });

/** Map a client x to a fraction in `[0, 1]` across the track (dir-aware). */
function positionFromClientX(clientX: number): number {
  const el = ctx.trackRef.value;
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0) return 0;
  let offset = clientX - rect.left;
  if (ctx.direction.value === 'rtl') offset = rect.width - offset;
  return Math.min(1, Math.max(0, offset / rect.width));
}

function isStopTarget(event: Event): boolean {
  const target = event.target as HTMLElement | null;
  // Ignore presses that originate on (or inside) a stop thumb.
  return !!target?.closest('[role="slider"]');
}

function onPointerDown(event: PointerEvent): void {
  if (ctx.disabled.value || event.button !== 0) return;
  if (isStopTarget(event)) return;
  event.preventDefault();
  const position = positionFromClientX(event.clientX);
  ctx.addStop(position);
}

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  // Only act when the track itself is focused (not a bubbled stop key).
  if (event.target !== currentElement.value) return;
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    ctx.addStop(0.5);
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :tabindex="ctx.disabled.value ? undefined : 0"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    @pointerdown="onPointerDown"
    @keydown="onKeyDown"
  >
    <slot :css-gradient="ctx.cssGradient.value" :stops="ctx.stops.value" />
  </Primitive>
</template>
