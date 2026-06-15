<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { RovingDirection } from '../../internal/utils/roving-focus';
import type { ToggleGroupType, ToggleGroupValue } from './context';

/**
 * A set of two-state toggle buttons that behave as one control, with full
 * keyboard roving focus (arrow keys move, Home/End jump to ends, PageUp/PageDown
 * jump to first/last). Set `type` to `'single'` for mutually exclusive options
 * (like a segmented control) or `'multiple'` to let several be pressed at once
 * (like a text-formatting bar). When `type` is omitted it is inferred from the
 * value shape: an array value implies `'multiple'`, otherwise `'single'`.
 * This is the container and state owner: it tracks the pressed value(s)
 * (controlled via `v-model` or uncontrolled via `defaultValue`) and provides
 * context to each `ToggleGroupItem`. With a `name`, the selected value(s) are
 * also bridged into native form submission. Reach for it to group related
 * toggles such as text alignment, view modes, or formatting options.
 */
export interface ToggleGroupRootProps extends PrimitiveProps {
  /**
   * Whether one (`'single'`) or several (`'multiple'`) items can be pressed.
   * When omitted, inferred from the value shape (array → `'multiple'`).
   */
  type?: ToggleGroupType;
  defaultValue?: ToggleGroupValue | ToggleGroupValue[];
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  /**
   * Reading direction. When omitted, inherits from a `ConfigProvider` (or LTR).
   */
  dir?: RovingDirection;
  loop?: boolean;
  rovingFocus?: boolean;
  /** Native input name for form submission. When set, a hidden input mirrors the value. */
  name?: string;
  /** Mark the field as required for native form validation. */
  required?: boolean;
}

export interface ToggleGroupRootEmits {
  valueChange: [value: ToggleGroupValue | ToggleGroupValue[]];
}
</script>

<script setup lang="ts">
import { computed, toRef, watchEffect } from 'vue';
import { isEqual } from '@robonen/stdlib';
import { resolveNextIndex, rovingKeyToAction } from '../../internal/utils/roving-focus';
import { useCollectionProvider } from '../../utilities/collection';
import { useForwardExpose } from '@robonen/vue';
import { useDirection } from '../../utilities/config-provider';
import { VisuallyHiddenInput } from '../../utilities/visually-hidden';
import { Primitive } from '../../internal/primitive';
import { provideToggleGroupContext } from './context';

const {
  type: explicitType,
  disabled = false,
  orientation = 'horizontal',
  dir,
  loop = true,
  rovingFocus = true,
  defaultValue,
  name,
  required = false,
  as = 'div',
} = defineProps<ToggleGroupRootProps>();

const { forwardRef, currentElement } = useForwardExpose();

const emit = defineEmits<ToggleGroupRootEmits>();

const model = defineModel<ToggleGroupValue | ToggleGroupValue[] | undefined>({ default: undefined });

// Resolve the reading direction, inheriting from a ConfigProvider when `dir` is
// omitted (per-component prop always wins).
const direction = useDirection(() => dir);

// Infer single/multiple from the value shape when `type` is not explicit:
// an array value (model or default) implies `'multiple'`, otherwise `'single'`.
// An explicit `type` always wins.
const resolvedType = computed<ToggleGroupType>(() => {
  if (explicitType) return explicitType;
  const sample = model.value !== undefined ? model.value : defaultValue;
  return Array.isArray(sample) ? 'multiple' : 'single';
});

// Dev-only coherence check: an explicit `type` that disagrees with the value
// shape is surfaced as a warning (the explicit `type` is still honored).
if (__DEV__) {
  watchEffect(() => {
    const sample = model.value !== undefined ? model.value : defaultValue;
    if (explicitType === undefined || sample === undefined)
      return;

    const inferred: ToggleGroupType = Array.isArray(sample) ? 'multiple' : 'single';
    if (explicitType !== inferred) {
      console.warn(
        `[ToggleGroup] "type" is "${explicitType}" but the provided value is ${
          Array.isArray(sample) ? 'an array' : 'not an array'
        }. Following the explicit "type"; pass a ${
          explicitType === 'single' ? 'scalar' : 'array'
        } value to silence this warning.`,
      );
    }
  });
}

function normalize(v: ToggleGroupValue | ToggleGroupValue[] | undefined): ToggleGroupValue[] {
  if (v === undefined) return [];
  if (Array.isArray(v)) return v.slice();
  return [v];
}

// Seed the uncontrolled default once; defineModel owns state thereafter.
if (model.value === undefined && defaultValue !== undefined)
  model.value = defaultValue;

// Normalized array view of the public model (value | value[] | undefined).
const localValue = computed<ToggleGroupValue[]>(() => normalize(model.value));

function emitValue(next: ToggleGroupValue[]): void {
  if (resolvedType.value === 'single') {
    const v = next.length > 0 ? next[0]! : undefined;
    model.value = v;
    emit('valueChange', v ?? '');
  }
  else {
    model.value = next;
    emit('valueChange', next);
  }
}

function toggle(v: ToggleGroupValue): void {
  if (disabled) return;
  if (resolvedType.value === 'single') {
    if (localValue.value.some(x => isEqual(x, v))) emitValue([]);
    else emitValue([v]);
  }
  else if (localValue.value.some(x => isEqual(x, v))) {
    emitValue(localValue.value.filter(x => !isEqual(x, v)));
  }
  else {
    emitValue([...localValue.value, v]);
  }
}

function isPressed(v: ToggleGroupValue): boolean {
  return localValue.value.some(x => isEqual(x, v));
}

// DOM-order items via Collection primitive — survives v-for reorders.
const { getItems, CollectionSlot } = useCollectionProvider<ToggleGroupValue>();
const items = computed(() => getItems(true).map(i => i.ref));

// The single roving tab stop, computed once per items/value change in the Root
// (first pressed enabled item, else first enabled item) so each item derives
// `isTabStop` via an O(1) identity check instead of independently scanning and
// reading DOM attributes across the whole list (O(N²) on every settle).
const tabStopElement = computed<HTMLElement | undefined>(() => {
  const enabled = getItems(false);
  if (enabled.length === 0) return undefined;
  for (const item of enabled) {
    if (item.value !== undefined && isPressed(item.value)) return item.ref;
  }
  return enabled[0]!.ref;
});

function onItemKeyDown(event: KeyboardEvent, el: HTMLElement): void {
  if (!rovingFocus) return;
  // Don't hijack focus for modifier-key chords (Ctrl/Meta/Alt navigation, etc.).
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const enabled = items.value.filter(x => !x.hasAttribute('data-disabled'));
  if (enabled.length === 0) return;
  const current = enabled.indexOf(el);

  // PageUp/PageDown jump to first/last (handled inline; the shared util covers
  // arrows + Home/End only).
  if (event.key === 'PageUp') {
    event.preventDefault();
    enabled[0]!.focus();
    return;
  }
  if (event.key === 'PageDown') {
    event.preventDefault();
    enabled[enabled.length - 1]!.focus();
    return;
  }

  const action = rovingKeyToAction(event, { orientation, dir: direction.value, loop });
  if (!action) return;
  event.preventDefault();
  if (action.absolute === 'home') {
    enabled[0]!.focus();
    return;
  }
  if (action.absolute === 'end') {
    enabled[enabled.length - 1]!.focus();
    return;
  }
  const nextIdx = resolveNextIndex(current === -1 ? 0 : current, action.delta, enabled.length, loop);
  enabled[nextIdx]!.focus();
}

// Whether the group lives inside a real <form>; SSR defaults to bridging so the
// value still submits server-side. Mirrors the package-wide form-control check.
const isFormControl = computed(() => {
  const el = currentElement.value;
  return typeof document === 'undefined' ? true : (!!el && !!el.closest('form'));
});

// The value submitted with the form: a scalar in single mode, an array in
// multiple mode (so VisuallyHiddenInput encodes name[0], name[1], …).
const submittedValue = computed<ToggleGroupValue | ToggleGroupValue[]>(() =>
  resolvedType.value === 'single'
    ? (localValue.value.length > 0 ? localValue.value[0]! : '')
    : localValue.value,
);

provideToggleGroupContext({
  type: resolvedType,
  value: localValue,
  toggle,
  isPressed,
  orientation: toRef(() => orientation),
  direction,
  loop: toRef(() => loop),
  disabled: toRef(() => disabled),
  rovingFocus: toRef(() => rovingFocus),
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
      :role="resolvedType === 'single' ? 'radiogroup' : 'group'"
      :aria-orientation="orientation"
      :aria-disabled="disabled || undefined"
      :dir="direction"
      :data-orientation="orientation"
      :data-disabled="disabled ? '' : undefined"
    >
      <slot :value="localValue" :model-value="model" />

      <VisuallyHiddenInput
        v-if="isFormControl && name"
        :name="name"
        :value="submittedValue"
        :required="required"
        :disabled="disabled"
      />
    </Primitive>
  </CollectionSlot>
</template>
