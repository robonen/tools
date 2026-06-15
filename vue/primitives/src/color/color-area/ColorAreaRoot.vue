<script lang="ts">
import type { ColorAreaDirection } from './context';
import type { HSVA } from '../../internal/color';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The 2D saturation/value square of a colour picker. The x-axis maps saturation
 * (`0` at the left → `1` at the right) and the y-axis maps brightness/value
 * (`1` at the top → `0` at the bottom). It works standalone — owning its own
 * `HSVA` via `v-model` / `defaultValue` — or, nested inside a `ColorFieldRoot`,
 * reads and writes that shared colour so the whole picker cluster stays in sync.
 * A pointer press anywhere in the area sets saturation and brightness at once;
 * the `--color-area-hue` CSS variable is exposed so the consumer can paint the
 * full-saturation / full-value hue background. Provides context to
 * `ColorAreaThumb`. Reach for it as the main square of a colour picker.
 */
export interface ColorAreaRootProps extends PrimitiveProps {
  /** Uncontrolled initial colour. @default { h: 0, s: 1, v: 1, a: 1 } */
  defaultValue?: HSVA;
  /** Keyboard step for saturation/value nudges (`0–1`). @default 0.01 */
  step?: number;
  /** Large keyboard step (Shift+Arrow / Page keys, `0–1`). @default 0.1 */
  largeStep?: number;
  /** Writing direction (inherited from `ConfigProvider` when omitted). */
  dir?: ColorAreaDirection;
  /** Disable interaction. @default false */
  disabled?: boolean;
}

</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from 'vue';
import { clampChannel, hsvToRgb } from '../../internal/color';
import { Primitive } from '../../internal/primitive';
import { provideColorAreaContext } from './context';
import { useColorState } from '../color-field/useColorState';
import { useDirection } from '../../utilities/config-provider';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useForwardExpose } from '@robonen/vue';

const {
  defaultValue,
  step = 0.01,
  largeStep = 0.1,
  dir,
  disabled = false,
  as = 'div',
} = defineProps<ColorAreaRootProps>();

const direction = useDirection(() => dir);

const model = defineModel<HSVA | null>();
// shallowRef: the HSVA object is always replaced wholesale (setters build a fresh
// `{ ...cur }`), never mutated channel-by-channel, so deep proxying {h,s,v,a} only
// adds per-pointer-move proxy-get/track cost. Identity replacement still triggers.
const standalone = shallowRef<HSVA>(model.value ?? defaultValue ?? { h: 0, s: 1, v: 1, a: 1 });

const standaloneState = computed<HSVA>({
  get: () => standalone.value,
  set: (v) => {
    standalone.value = v;
    model.value = v;
  },
});

const colorState = useColorState(standaloneState, () => disabled);

const saturation = computed(() => colorState.hsva.value.s);
const value = computed(() => colorState.hsva.value.v);
const hue = computed(() => colorState.hsva.value.h);

// Background hue colour at full saturation & value (consumer paints the
// gradients over this via the exposed CSS variable / slot prop).
const hueColor = computed(() => {
  const { r, g, b } = hsvToRgb({ h: hue.value, s: 1, v: 1 });
  return `rgb(${r}, ${g}, ${b})`;
});

const trackRef = shallowRef<HTMLElement | null>(null);

function setSaturation(next: number): void {
  if (colorState.disabled.value) return;
  colorState.setSaturation(clampChannel(next, 1));
}
function setValue(next: number): void {
  if (colorState.disabled.value) return;
  colorState.setValue(clampChannel(next, 1));
}

// Rect cached for the duration of a gesture (snapshotted in `onStart`): the track
// box cannot change mid-drag, so re-reading getBoundingClientRect() every onMove
// frame is a needless forced reflow. A live read is the fallback.
let gestureRect: DOMRect | undefined;

function setFromPointer(clientCoord: { x: number; y: number }, rect?: DOMRect): void {
  const r = rect ?? trackRef.value?.getBoundingClientRect();
  if (!r || r.width === 0 || r.height === 0) return;
  let sx = (clientCoord.x - r.left) / r.width;
  // RTL flips the saturation axis.
  if (direction.value === 'rtl') sx = 1 - sx;
  // y-axis: top = full brightness (1), bottom = 0.
  const vy = 1 - (clientCoord.y - r.top) / r.height;
  colorState.setSaturationValue(clampChannel(sx, 1), clampChannel(vy, 1));
}

usePointerDrag(trackRef, {
  axis: 'both',
  threshold: 0,
  disabled: () => colorState.disabled.value,
  onStart: (state) => {
    gestureRect = trackRef.value?.getBoundingClientRect();
    setFromPointer({ x: state.point.x, y: state.point.y }, gestureRect);
  },
  onMove: (state) => {
    setFromPointer({ x: state.point.x, y: state.point.y }, gestureRect);
  },
  onEnd: () => {
    gestureRect = undefined;
  },
});

provideColorAreaContext({
  hsva: colorState.hsva,
  saturation,
  value,
  step: toRef(() => step),
  largeStep: toRef(() => largeStep),
  direction,
  disabled: colorState.disabled,
  labelId: colorState.labelId,
  trackRef,
  setSaturation,
  setValue,
});

defineExpose({ saturation, value, hue });

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
    :style="{ '--color-area-hue': hueColor }"
  >
    <slot :saturation="saturation" :value="value" :hue="hue" :hue-color="hueColor" />
  </Primitive>
</template>
