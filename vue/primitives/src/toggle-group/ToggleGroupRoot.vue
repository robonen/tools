<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { RovingDirection } from '../utils/roving-focus';
import type { ToggleGroupType } from './context';

export interface ToggleGroupRootProps extends PrimitiveProps {
  type?: ToggleGroupType;
  modelValue?: string | string[];
  defaultValue?: string | string[];
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  dir?: RovingDirection;
  loop?: boolean;
  rovingFocus?: boolean;
}

export interface ToggleGroupRootEmits {
  'update:modelValue': [value: string | string[] | undefined];
  valueChange: [value: string | string[]];
}
</script>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../utils/roving-focus';
import { useCollectionProvider } from '../collection';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { provideToggleGroupContext } from './context';

const {
  type = 'single',
  disabled = false,
  orientation = 'horizontal',
  dir = 'ltr',
  loop = true,
  rovingFocus = true,
  modelValue,
  defaultValue,
  as = 'div',
} = defineProps<ToggleGroupRootProps>();

const { forwardRef } = useForwardExpose();

const emit = defineEmits<ToggleGroupRootEmits>();

function normalize(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  if (Array.isArray(v)) return v.slice();
  return [v];
}

const localValue = ref<string[]>(
  normalize(modelValue).length > 0 ? normalize(modelValue) : normalize(defaultValue),
);

watch(() => modelValue, (v) => {
  if (v === undefined) return;
  const n = normalize(v);
  if (n.length === localValue.value.length && n.every((x, i) => x === localValue.value[i])) return;
  localValue.value = n;
});

function emitValue(next: string[]): void {
  localValue.value = next;
  if (type === 'single') {
    const v = next[0];
    emit('update:modelValue', v);
    emit('valueChange', v ?? '');
  }
  else {
    emit('update:modelValue', next);
    emit('valueChange', next);
  }
}

function toggle(v: string): void {
  if (disabled) return;
  if (type === 'single') {
    if (localValue.value[0] === v) emitValue([]);
    else emitValue([v]);
  }
  else if (localValue.value.includes(v)) {
    emitValue(localValue.value.filter(x => x !== v));
  }
  else {
    emitValue([...localValue.value, v]);
  }
}

function isPressed(v: string): boolean {
  return localValue.value.includes(v);
}

// DOM-order items via Collection primitive — survives v-for reorders.
const { getItems, CollectionSlot } = useCollectionProvider();
const items = computed(() => getItems(true).map(i => i.ref));

function onItemKeyDown(event: KeyboardEvent, el: HTMLElement): void {
  if (!rovingFocus) return;
  const action = rovingKeyToAction(event, { orientation, dir, loop });
  if (!action) return;
  event.preventDefault();
  const enabled = items.value.filter(x => !x.hasAttribute('data-disabled'));
  if (enabled.length === 0) return;
  const current = enabled.indexOf(el);
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

provideToggleGroupContext({
  type: toRef(() => type),
  value: localValue,
  toggle,
  isPressed,
  orientation: toRef(() => orientation),
  direction: toRef(() => dir),
  loop: toRef(() => loop),
  disabled: toRef(() => disabled),
  rovingFocus: toRef(() => rovingFocus),
  items,
  onItemKeyDown,
});
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      :role="type === 'single' ? 'radiogroup' : 'group'"
      :aria-orientation="orientation"
      :aria-disabled="disabled || undefined"
      :dir="dir"
      :data-orientation="orientation"
      :data-disabled="disabled ? '' : undefined"
    >
      <slot :value="localValue" />
    </Primitive>
  </CollectionSlot>
</template>
