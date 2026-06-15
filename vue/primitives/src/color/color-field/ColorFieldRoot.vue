<script lang="ts">
import type { ColorFormat } from './context';
import type { HSV, HSVA, RGB } from '../../internal/color';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The composite root of the colour-picker cluster. It owns the canonical
 * {@link HSVA} colour (controlled via `v-model`, uncontrolled via
 * `defaultValue`) and provides a shared context that `ColorArea`, `HueSlider`,
 * and `AlphaSlider` read and write into, keeping every control in sync without
 * round-tripping through RGB. The model accepts either an `HSVA` object or any
 * CSS colour string (`#rrggbb`, `rgb()/rgba()`, `hsl()/hsla()`) via `parseColor`
 * and emits in the configured `format`. Compose it with `ColorFieldSwatch`,
 * `ColorFieldInput`, `ColorFieldLabel`, and `ColorFieldHiddenInput`. Reach for
 * it whenever you need a full, accessible colour picker tied to a form value.
 */
export interface ColorFieldRootProps extends PrimitiveProps {
  /**
   * Uncontrolled initial value (`HSVA` object or CSS colour string).
   * @default '#ff0000'
   */
  defaultValue?: HSVA | string;
  /**
   * Serialization format used for `update:modelValue`, the swatch label, the
   * input string, and the hidden form input.
   * @default 'hex'
   */
  format?: ColorFormat;
  /** Disable all interaction across the cluster. @default false */
  disabled?: boolean;
  /** Hidden form input `name` (enables native form submission). */
  name?: string;
}

</script>

<script setup lang="ts">
import { computed, ref, shallowRef, toRef, watch } from 'vue';
import { formatHsva, hsvToRgb, hsvaToCss, parseColor } from '../../internal/color';
import { VisuallyHiddenInput } from '../../utilities/visually-hidden';
import { Primitive } from '../../internal/primitive';
import { provideColorFieldContext } from './context';
import { useHsvaSetters } from './useColorState';
import { useForwardExpose } from '@robonen/vue';

const {
  defaultValue = '#ff0000',
  format = 'hex',
  disabled = false,
  name,
  as = 'div',
} = defineProps<ColorFieldRootProps>();

// `defineModel` drives both controlled (`v-model`) and uncontrolled modes. The
// raw model may be an HSVA object OR a CSS string OR null; the canonical state
// below normalizes it to HSVA once. We do NOT bind `defineModel` directly to
// the canonical ref because we emit in the configured `format`, not the raw in.
const model = defineModel<HSVA | string | null>();

/** Normalize any accepted input (object | string) to canonical HSVA. */
function toHsva(input: HSVA | string | null | undefined): HSVA | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string') return parseColor(input);
  return { ...input };
}

const seed = toHsva(model.value) ?? toHsva(defaultValue) ?? { h: 0, s: 1, v: 1, a: 1 };

// The canonical, reactive HSVA. Every sub-picker replaces this wholesale through
// the shared setters (preserve-hue policy lives in `useHsvaSetters`); it is never
// mutated channel-by-channel, so shallowRef triggers identically without proxying.
const hsva = shallowRef<HSVA>(seed);

const setters = useHsvaSetters(hsva);

/** Serialize the current canonical colour in the configured format. */
function serialize(c: HSVA): HSVA | string {
  if (format === 'hsva') return { ...c };
  return formatHsva(c, format);
}

// Push the canonical colour out through the model in the configured format.
// Guarded against the echo where our own emit comes back in as `model.value`.
let writingOut = false;
function pushOut(c: HSVA): void {
  writingOut = true;
  model.value = serialize(c);
  writingOut = false;
}
// `hsva` (shallowRef) is replaced wholesale on every change, so watching its
// identity already fires on each update — no deep {h,s,v,a} traversal per frame.
watch(hsva, c => pushOut(c));

// Uncontrolled adoption: when no controlled `modelValue` was supplied, surface
// the seeded (default) colour to the model once on mount so the consumer's
// `v-model` reflects the initial value in the configured format.
if (model.value === null || model.value === undefined) pushOut(hsva.value);

// Adopt externally driven model changes (controlled mode). Ignore the echo from
// our own outward write and any unparseable strings.
watch(model, (next) => {
  if (writingOut) return;
  const parsed = toHsva(next);
  if (!parsed) return;
  const cur = hsva.value;
  if (parsed.h === cur.h && parsed.s === cur.s && parsed.v === cur.v && parsed.a === cur.a) return;
  hsva.value = parsed;
});

// Derived, read-only views for consumers (`defineExpose`) and parts.
const rgb = computed<RGB>(() => hsvToRgb(hsva.value));
const hsv = computed<HSV>(() => ({ h: hsva.value.h, s: hsva.value.s, v: hsva.value.v }));
const cssColor = computed(() => hsvaToCss(hsva.value));
const hex = computed(() => formatHsva(hsva.value, 'hex'));
const hex8 = computed(() => formatHsva(hsva.value, 'hex8'));
const rgbaString = computed(() => formatHsva(hsva.value, 'rgba'));
const hslaString = computed(() => formatHsva(hsva.value, 'hsla'));
/** The value serialized in the configured `format` (used by parts). */
const formatted = computed(() => formatHsva(hsva.value, format === 'hsva' ? 'rgba' : format));

const labelId = ref<string | undefined>(undefined);

provideColorFieldContext({
  hsva,
  setHue: setters.setHue,
  setSaturation: setters.setSaturation,
  setValue: setters.setValue,
  setAlpha: setters.setAlpha,
  setSaturationValue: setters.setSaturationValue,
  disabled: toRef(() => disabled),
  labelId,
});

defineExpose({
  /** The canonical HSVA colour (read-only view). */
  hsva,
  /** The colour as RGB. */
  rgb,
  /** The colour as HSV (no alpha). */
  hsv,
  /** The colour as a CSS `rgba()` string. */
  cssColor,
  /** The colour as `#rrggbb`. */
  hex,
  /** The colour as `#rrggbbaa`. */
  hex8,
  /** The colour as `rgba()`. */
  rgbaString,
  /** The colour as `hsla()`. */
  hslaString,
  /** The value serialized in the configured `format`. */
  formatted,
});

// `useForwardExpose` runs AFTER `defineExpose` so it merges the prior expose
// bindings (plus props + `$el`) instead of clobbering them.
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
  >
    <slot
      :hsva="hsva"
      :rgb="rgb"
      :hex="hex"
      :css-color="cssColor"
      :formatted="formatted"
    />
    <VisuallyHiddenInput
      v-if="name"
      :name="name"
      :value="hex8"
      :disabled="disabled"
    />
  </Primitive>
</template>
