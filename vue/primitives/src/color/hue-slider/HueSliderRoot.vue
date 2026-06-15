<script lang="ts">
import type { HueSliderDirection, HueSliderOrientation } from './context';
import type { HSVA } from '../../internal/color';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A 1D slider for picking the hue (`0–360°`) of a colour. It works standalone —
 * owning its own `HSVA` via `v-model` / `defaultValue` — or, when nested inside
 * a `ColorFieldRoot`, reads and writes that shared colour so the whole picker
 * cluster stays in sync. Mirrors the standard slider anatomy: the root owns the
 * value, maps pointer drags along the track, handles arrow / Page / Home / End
 * keys, and provides context to `HueSliderTrack` and `HueSliderThumb`. The
 * gradient background should run through the full hue wheel; style it via the
 * exposed slot/`data-*` hooks. Reach for it as the hue rail of a colour picker.
 */
export interface HueSliderRootProps extends PrimitiveProps {
  /** Uncontrolled initial colour. @default { h: 0, s: 1, v: 1, a: 1 } */
  defaultValue?: HSVA;
  /** Keyboard step in degrees. @default 1 */
  step?: number;
  /** Large-step multiplier (Page keys / Shift+Arrow). @default 10 */
  largeStep?: number;
  /** Orientation. @default 'horizontal' */
  orientation?: HueSliderOrientation;
  /** Writing direction (inherited from `ConfigProvider` when omitted). */
  dir?: HueSliderDirection;
  /** Disable interaction. @default false */
  disabled?: boolean;
}

</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from 'vue';
import { clampChannel } from '../../internal/color';
import { Primitive } from '../../internal/primitive';
import { provideHueSliderContext } from './context';
import { useColorState } from '../color-field/useColorState';
import { useDirection } from '../../utilities/config-provider';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useForwardExpose } from '@robonen/vue';

const {
  defaultValue,
  step = 1,
  largeStep = 10,
  orientation = 'horizontal',
  dir,
  disabled = false,
  as = 'span',
} = defineProps<HueSliderRootProps>();

const direction = useDirection(() => dir);

// Standalone colour state (used only when there is no `ColorFieldRoot`).
// shallowRef: HSVA is replaced wholesale by the setters, never mutated in place.
const model = defineModel<HSVA | null>();
const standalone = shallowRef<HSVA>(model.value ?? defaultValue ?? { h: 0, s: 1, v: 1, a: 1 });

// Reflect standalone writes out through the model.
const standaloneState = computed<HSVA>({
  get: () => standalone.value,
  set: (v) => {
    standalone.value = v;
    model.value = v;
  },
});

// Resolve shared (ColorField) vs standalone colour + setters.
const colorState = useColorState(standaloneState, () => disabled);

const hue = computed(() => colorState.hsva.value.h);

const trackRef = shallowRef<HTMLElement | null>(null);

function setHue(next: number): void {
  if (colorState.disabled.value) return;
  // Hue is cyclic but the slider treats it as a clamped [0,360] rail.
  colorState.setHue(clampChannel(next, 360));
}

// Rect cached for the duration of a gesture (snapshotted in `onStart`): the track
// box cannot change mid-drag, so re-reading getBoundingClientRect() every onMove
// frame is a needless forced reflow. A live read is the fallback for any caller
// without a cached rect.
let gestureRect: DOMRect | undefined;

function hueFromPointer(clientCoord: { x: number; y: number }, rect?: DOMRect): number {
  const r = rect ?? trackRef.value?.getBoundingClientRect();
  if (!r) return hue.value;
  const horizontal = orientation === 'horizontal';
  const size = horizontal ? r.width : r.height;
  if (size === 0) return hue.value;
  let offset = horizontal ? clientCoord.x - r.left : clientCoord.y - r.top;
  // Horizontal ltr: left = 0. RTL flips. Vertical: top = max by convention.
  const flip = horizontal ? direction.value === 'rtl' : true;
  if (flip) offset = size - offset;
  return clampChannel((offset / size) * 360, 360);
}

usePointerDrag(trackRef, {
  axis: orientation === 'horizontal' ? 'x' : 'y',
  threshold: 0,
  disabled: () => colorState.disabled.value,
  onStart: (state) => {
    gestureRect = trackRef.value?.getBoundingClientRect();
    setHue(hueFromPointer({ x: state.point.x, y: state.point.y }, gestureRect));
  },
  onMove: (state) => {
    setHue(hueFromPointer({ x: state.point.x, y: state.point.y }, gestureRect));
  },
  onEnd: () => {
    gestureRect = undefined;
  },
});

provideHueSliderContext({
  hsva: colorState.hsva,
  hue,
  step: toRef(() => step),
  largeStep: toRef(() => largeStep),
  orientation: toRef(() => orientation),
  direction,
  disabled: colorState.disabled,
  labelId: colorState.labelId,
  trackRef,
  setHue,
});

defineExpose({ hue });

// The root element IS the draggable rail; bind it as the geometry track.
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
    <slot :hue="hue" />
  </Primitive>
</template>
