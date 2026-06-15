<script lang="ts">
import type { VisuallyHiddenInputBubbleProps } from './VisuallyHiddenInputBubble.vue';

/**
 * Bridges a custom control's value into native form submission. It serializes
 * the bound `value` into one visually-hidden native `<input>` per leaf so the
 * data is submitted with the owning `<form>` and participates in native
 * constraint validation:
 *
 * - primitives (`string | number | boolean | null | undefined`) → a single
 *   input named `name`;
 * - arrays of primitives → `name[index]`;
 * - arrays of objects → `name[index][key]`;
 * - plain objects → `name[key]`.
 *
 * A `required` field bound to an empty array still renders one input, so native
 * `required` validation fires on empty multi-selects.
 */
export interface VisuallyHiddenInputProps<T = unknown> extends Omit<VisuallyHiddenInputBubbleProps<T>, 'value'> {
  /** The value to serialize and submit. */
  value: T;
}
</script>

<script setup lang="ts" generic="T = unknown">
import { computed } from 'vue';
import { isArray, isObject } from '@vue/shared';
import VisuallyHiddenInputBubble from './VisuallyHiddenInputBubble.vue';

const props = withDefaults(defineProps<VisuallyHiddenInputProps<T>>(), {
  feature: 'hidden',
  checked: undefined,
});

defineOptions({ inheritAttrs: false });

// Keep a single input for a `required` empty multi-select so the browser's
// native validation still blocks submission.
const requiresEmptyArrayInput = computed(() =>
  isArray(props.value) && props.value.length === 0 && props.required);

interface SerializedLeaf {
  name: string;
  value: unknown;
}

const leaves = computed<SerializedLeaf[]>(() => {
  const value = props.value;
  const name = props.name;

  // Primitive (or nullish) value → one input.
  if (!isObject(value))
    return [{ name, value }];

  // Array value → `name[index]` for primitives, `name[index][key]` for objects.
  if (isArray(value)) {
    return value.flatMap((item, index) => {
      if (isObject(item) && !isArray(item))
        return Object.entries(item).map(([key, v]) => ({ name: `${name}[${index}][${key}]`, value: v }));

      return { name: `${name}[${index}]`, value: item };
    });
  }

  // Plain object value → `name[key]`.
  return Object.entries(value).map(([key, v]) => ({ name: `${name}[${key}]`, value: v }));
});
</script>

<template>
  <VisuallyHiddenInputBubble
    v-if="requiresEmptyArrayInput"
    :key="name"
    v-bind="$attrs"
    :name="name"
    :value="value"
    :checked="checked"
    :required="required"
    :disabled="disabled"
    :feature="feature"
  />

  <VisuallyHiddenInputBubble
    v-for="leaf in leaves"
    v-else
    :key="leaf.name"
    v-bind="$attrs"
    :name="leaf.name"
    :value="leaf.value"
    :checked="checked"
    :required="required"
    :disabled="disabled"
    :feature="feature"
  />
</template>
