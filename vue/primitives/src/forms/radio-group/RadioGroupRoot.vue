<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { RovingDirection } from '../../internal/utils/roving-focus';
import type { AcceptableValue, RadioCompareBy } from './utils';

/**
 * A set of mutually exclusive options where only one may be selected at a time,
 * built on `role="radiogroup"` with full keyboard roving focus (arrow keys move
 * and select, Space selects, Home/End and PageUp/PageDown jump to ends). The
 * container and state owner: it tracks the selected value (controlled via
 * `v-model` or uncontrolled via `defaultValue`), provides context to
 * `RadioGroupItem`, and renders a hidden form input when `name` is set and the
 * group lives inside a `<form>`.
 *
 * Values are not limited to strings — numbers, booleans, `null`, and plain
 * objects are supported and compared structurally (override with `by`). Reach
 * for it whenever a user must pick exactly one choice from a small, visible
 * list.
 */
export interface RadioGroupRootProps<T extends AcceptableValue = AcceptableValue> extends PrimitiveProps {
  /** The value of the radio item that should be checked when initially rendered (uncontrolled). */
  defaultValue?: T;
  /** When `true`, prevents the user from interacting with radio items. */
  disabled?: boolean;
  /** Marks the group, and every item, as required for assistive tech and native validation. */
  required?: boolean;
  /** Name of the hidden form field submitted with the owning `<form>`. */
  name?: string;
  /** The orientation arrow navigation follows. */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Reading direction. When omitted, inherits from the active `ConfigProvider`
   * (falling back to `'ltr'`), so an app-wide RTL setting flips arrow navigation.
   */
  dir?: RovingDirection;
  /** When `true`, arrow navigation wraps from the last item to the first and vice versa. */
  loop?: boolean;
  /**
   * How an item `value` is compared against the selected value. Omitted →
   * structural deep equality; a function → custom comparator; a string →
   * compare that property key.
   */
  by?: RadioCompareBy;
}

export interface RadioGroupRootEmits<T extends AcceptableValue = AcceptableValue> {
  /** Emitted whenever the selected value changes (alias of `update:modelValue`). */
  valueChange: [value: T];
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import type { Ref } from 'vue';
import { computed, ref, toRef, useTemplateRef, watch } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../../internal/utils/roving-focus';
import { useCollectionProvider } from '../../utilities/collection';
import { useDirection } from '../../utilities/config-provider';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { provideRadioGroupContext } from './context';
import { compareValues } from './utils';

const {
  disabled = false,
  required = false,
  orientation = 'vertical',
  dir,
  loop = true,
  defaultValue,
  name,
  by,
  as = 'div',
} = defineProps<RadioGroupRootProps<T>>();

const emit = defineEmits<RadioGroupRootEmits<T>>();
const model = defineModel<T | undefined>({ default: undefined });

defineSlots<{
  default?: (props: {
    /** The currently selected value (or `undefined` when nothing is selected). */
    value: AcceptableValue | undefined;
  }) => unknown;
}>();

const { forwardRef, currentElement } = useForwardExpose();

// Resolve `dir` against the global ConfigProvider so an app-wide RTL setting is
// honoured; a per-group `dir` prop still wins.
const direction = useDirection(() => dir);

const localValue = ref<AcceptableValue | undefined>(model.value ?? defaultValue) as Ref<AcceptableValue | undefined>;

watch(model, (v) => {
  if (v === undefined) return;
  if (v !== localValue.value) localValue.value = v;
});

function isChecked(v: AcceptableValue): boolean {
  return compareValues(localValue.value, v, by);
}

function setValue(v: AcceptableValue): boolean {
  if (disabled) return false;
  localValue.value = v;
  model.value = v as T;
  emit('valueChange', v as T);
  return true;
}

// DOM-order items via Collection primitive — survives `v-for` reorders. The
// Collection carries each item's `value`, so non-string values round-trip
// without serialising through a DOM attribute.
const { getItems, CollectionSlot } = useCollectionProvider<AcceptableValue>();
const items = computed(() => getItems(true).map(i => i.ref));

// The single roving tab-stop element, derived ONCE here instead of having every
// item independently scan `items`: the checked item when a value is selected,
// otherwise the first enabled item. Reuses the Collection's `value`-carrying
// records so checked-ness is tested without per-item DOM reads.
const tabStopElement = computed<HTMLElement | undefined>(() => {
  const records = getItems(true);
  if (localValue.value !== undefined) {
    for (const record of records) {
      if (record.value !== undefined && isChecked(record.value)) return record.ref;
    }
    return undefined;
  }
  for (const record of records) {
    if (!record.ref.hasAttribute('data-disabled')) return record.ref;
  }
  return undefined;
});

// Only render the hidden field when the group is genuinely inside a form, so a
// stray named input is not added to the document otherwise.
const isFormControl = computed(() => {
  const el = currentElement.value;
  return !!el && !!el.closest('form');
});

// Serialise the selected value for the native input. Objects/arrays go through
// JSON so non-primitive values still round-trip through native form submission.
const submittedValue = computed(() => {
  const v = localValue.value;
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
});

const hiddenInput = useTemplateRef<HTMLInputElement>('hiddenInput');

// Mirror programmatic value changes onto the native input by driving its value
// through the native setter and dispatching the events a real edit would
// produce, so native validation and third-party form listeners observe them.
watch(submittedValue, (next) => {
  const input = hiddenInput.value;
  if (!input || globalThis.window === undefined) return;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, next);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, { flush: 'post' });

function focusIndex(i: number): void {
  const el = items.value[i];
  if (!el || el.hasAttribute('data-disabled')) return;
  el.focus();
  // Route selection through the element's native click so the item's cancelable
  // `select` event fires and a native `click`/`change` is dispatched for
  // downstream listeners — instead of mutating state behind their back.
  el.click();
}

function onItemKeyDown(event: KeyboardEvent, el: HTMLElement): void {
  // Space selects the focused item (via its native click) without moving focus.
  if (event.key === ' ') {
    event.preventDefault();
    if (!el.hasAttribute('data-disabled')) el.click();
    return;
  }

  const enabled = items.value.filter(x => !x.hasAttribute('data-disabled'));

  // PageUp/PageDown jump to the first/last enabled item (WAI-ARIA optional).
  if (event.key === 'PageUp' || event.key === 'PageDown') {
    event.preventDefault();
    if (enabled.length === 0) return;
    const target = event.key === 'PageUp' ? enabled[0]! : enabled[enabled.length - 1]!;
    return focusIndex(items.value.indexOf(target));
  }

  const action = rovingKeyToAction(event, { orientation, dir: direction.value, loop });
  if (!action) return;
  event.preventDefault();
  if (enabled.length === 0) return;
  const current = enabled.indexOf(el);
  if (action.absolute === 'home') return focusIndex(items.value.indexOf(enabled[0]!));
  if (action.absolute === 'end') return focusIndex(items.value.indexOf(enabled[enabled.length - 1]!));
  const nextIdx = resolveNextIndex(current === -1 ? 0 : current, action.delta, enabled.length, loop);
  focusIndex(items.value.indexOf(enabled[nextIdx]!));
}

provideRadioGroupContext({
  value: localValue,
  setValue,
  isChecked,
  // Identity passthroughs via `toRef` — reactive without `computed`'s effect/cache.
  orientation: toRef(() => orientation),
  direction,
  loop: toRef(() => loop),
  disabled: toRef(() => disabled),
  required: toRef(() => required),
  name: toRef(() => name),
  items,
  tabStopElement,
  onItemKeyDown,
});
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="radiogroup"
      :aria-orientation="orientation"
      :aria-required="required || undefined"
      :aria-disabled="disabled || undefined"
      :dir="direction"
      :data-orientation="orientation"
      :data-disabled="disabled ? '' : undefined"
    >
      <slot :value="localValue" />

      <input
        v-if="isFormControl && name"
        ref="hiddenInput"
        type="radio"
        tabindex="-1"
        aria-hidden="true"
        :name="name"
        :value="submittedValue"
        :checked="localValue !== undefined && localValue !== null"
        :required="required"
        :disabled="disabled"
        style="position: absolute; pointer-events: none; opacity: 0; margin: 0; transform: translateX(-100%);"
      >
    </Primitive>
  </CollectionSlot>
</template>
