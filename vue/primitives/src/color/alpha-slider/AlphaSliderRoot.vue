<script lang="ts">
import type { AlphaSliderDirection, AlphaSliderOrientation } from './context';
import type { HSVA } from '../../internal/color';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A 1D slider for picking the alpha (opacity, `0–1`) of a colour. It works
 * standalone — owning its own `HSVA` via `v-model` / `defaultValue` — or, when
 * nested inside a `ColorFieldRoot`, reads and writes that shared colour so the
 * whole picker cluster stays in sync. Mirrors the standard slider anatomy: the
 * root owns the value, maps pointer drags along the track, handles arrow / Page
 * / Home / End keys, and provides context to `AlphaSliderThumb`. The background
 * should be a checkerboard overlaid with an opaque→transparent colour gradient;
 * style it via the exposed slot/`data-*` hooks. Reach for it as the opacity rail
 * of a colour picker.
 */
export interface AlphaSliderRootProps extends PrimitiveProps {
  /** Uncontrolled initial colour. @default { h: 0, s: 1, v: 1, a: 1 } */
  defaultValue?: HSVA;
  /** Keyboard step in alpha units. @default 0.01 */
  step?: number;
  /** Large-step multiplier (Page keys / Shift+Arrow). @default 10 */
  largeStep?: number;
  /** Orientation. @default 'horizontal' */
  orientation?: AlphaSliderOrientation;
  /** Writing direction (inherited from `ConfigProvider` when omitted). */
  dir?: AlphaSliderDirection;
  /** Disable interaction. @default false */
  disabled?: boolean;
}

</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from 'vue';
import { clampChannel } from '../../internal/color';
import { Primitive } from '../../internal/primitive';
import { provideAlphaSliderContext } from './context';
import { useColorState } from '../color-field/useColorState';
import { useDirection } from '../../utilities/config-provider';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useForwardExpose } from '@robonen/vue';

const {
  defaultValue,
  step = 0.01,
  largeStep = 10,
  orientation = 'horizontal',
  dir,
  disabled = false,
  as = 'span',
} = defineProps<AlphaSliderRootProps>();

const direction = useDirection(() => dir);

// shallowRef: HSVA is replaced wholesale by the setters, never mutated in place.
const model = defineModel<HSVA | null>();
const standalone = shallowRef<HSVA>(model.value ?? defaultValue ?? { h: 0, s: 1, v: 1, a: 1 });

const standaloneState = computed<HSVA>({
  get: () => standalone.value,
  set: (v) => {
    standalone.value = v;
    model.value = v;
  },
});

const colorState = useColorState(standaloneState, () => disabled);

const alpha = computed(() => colorState.hsva.value.a);

const trackRef = shallowRef<HTMLElement | null>(null);

function setAlpha(next: number): void {
  if (colorState.disabled.value) return;
  colorState.setAlpha(clampChannel(next, 1));
}

function alphaFromPointer(clientCoord: { x: number; y: number }): number {
  const track = trackRef.value;
  if (!track) return alpha.value;
  const rect = track.getBoundingClientRect();
  const horizontal = orientation === 'horizontal';
  const size = horizontal ? rect.width : rect.height;
  if (size === 0) return alpha.value;
  let offset = horizontal ? clientCoord.x - rect.left : clientCoord.y - rect.top;
  const flip = horizontal ? direction.value === 'rtl' : true;
  if (flip) offset = size - offset;
  return clampChannel(offset / size, 1);
}

usePointerDrag(trackRef, {
  axis: orientation === 'horizontal' ? 'x' : 'y',
  threshold: 0,
  trackElementRect: true,
  disabled: () => colorState.disabled.value,
  onStart: (state) => {
    setAlpha(alphaFromPointer({ x: state.point.x, y: state.point.y }));
  },
  onMove: (state) => {
    setAlpha(alphaFromPointer({ x: state.point.x, y: state.point.y }));
  },
});

provideAlphaSliderContext({
  hsva: colorState.hsva,
  alpha,
  step: toRef(() => step),
  largeStep: toRef(() => largeStep),
  orientation: toRef(() => orientation),
  direction,
  disabled: colorState.disabled,
  labelId: colorState.labelId,
  trackRef,
  setAlpha,
});

defineExpose({ alpha });

const { forwardRef, currentElement } = useForwardExpose();
watch(currentElement, (node) => {
  trackRef.value = node ?? null;
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :dir="direction"
    :aria-disabled="colorState.disabled.value || undefined"
    :data-disabled="colorState.disabled.value ? '' : undefined"
    :data-orientation="orientation"
  >
    <slot :alpha="alpha" />
  </Primitive>
</template>
