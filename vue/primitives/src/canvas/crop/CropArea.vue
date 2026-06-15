<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The crop rectangle surface — the draggable, focusable body of the selection.
 * It sizes and positions itself from the Root's rect (× media size in pixel
 * units), moves the whole rect on pointer drag (constrained to the media
 * bounds), and moves it with the arrow keys when focused. Carries
 * `role="group"`, `tabindex 0`, and an overridable `aria-label`. Place
 * `CropHandle`s and `CropGrid` inside it. Hidden (renders nothing) while the
 * selection is empty.
 */
export interface CropAreaProps extends PrimitiveProps {
  /** Accessible label for the crop region. @default 'Crop region' */
  label?: string;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useCropContext } from './context';

const { label = 'Crop region', as = 'div' } = defineProps<CropAreaProps>();

const ctx = useCropContext();
const { forwardRef, currentElement } = useForwardExpose();

// Position/size from the rect. In normalized units the rect is already 0..1 so
// we emit percentages; in pixel units we map rect × media-pixel ratio so the
// surface sits over the media regardless of its on-screen scale.
const positionStyle = computed<{
  position: string;
  left: string;
  top: string;
  width: string;
  height: string;
}>(() => {
  const r = ctx.rect.value;
  if (r === null) return { position: 'absolute', left: '0', top: '0', width: '0', height: '0' };
  const denomW = ctx.units.value === 'normalized' ? 1 : Math.max(ctx.mediaPixels.value.width, 1e-9);
  const denomH = ctx.units.value === 'normalized' ? 1 : Math.max(ctx.mediaPixels.value.height, 1e-9);
  const rtl = ctx.direction.value === 'rtl';
  const leftPct = (rtl ? (denomW - r.x - r.width) : r.x) / denomW * 100;
  return {
    position: 'absolute',
    left: `${leftPct}%`,
    top: `${(r.y / denomH) * 100}%`,
    width: `${(r.width / denomW) * 100}%`,
    height: `${(r.height / denomH) * 100}%`,
  };
});

function onPointerDown(event: PointerEvent): void {
  if (ctx.disabled.value) return;
  // The CropArea element is the media-aligned surface for the move projection.
  ctx.beginMove(event, currentElement.value ?? null);
}

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value || ctx.rect.value === null) return;
  const rtl = ctx.direction.value === 'rtl';
  const stepX = event.shiftKey ? ctx.keyboardLargeStepX.value : ctx.keyboardStepX.value;
  const stepY = event.shiftKey ? ctx.keyboardLargeStepY.value : ctx.keyboardStepY.value;
  let dx = 0;
  let dy = 0;
  switch (event.key) {
    case 'ArrowLeft':
      dx = rtl ? stepX : -stepX;
      break;
    case 'ArrowRight':
      dx = rtl ? -stepX : stepX;
      break;
    case 'ArrowUp':
      dy = -stepY;
      break;
    case 'ArrowDown':
      dy = stepY;
      break;
    default:
      return;
  }
  event.preventDefault();
  ctx.nudgeMove(dx, dy);
}
</script>

<template>
  <Primitive
    v-if="ctx.rect.value !== null"
    :ref="forwardRef"
    :as="as"
    role="group"
    :tabindex="ctx.disabled.value ? -1 : 0"
    :aria-label="label"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-cropping="ctx.isCropping.value ? '' : undefined"
    :data-dir="ctx.direction.value"
    :style="positionStyle"
    @pointerdown="onPointerDown"
    @keydown="onKeyDown"
  >
    <slot :rect="ctx.rect.value" />
  </Primitive>
</template>
