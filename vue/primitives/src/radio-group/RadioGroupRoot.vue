<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { RovingDirection } from '../utils/roving-focus';

export interface RadioGroupRootProps extends PrimitiveProps {
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  orientation?: 'horizontal' | 'vertical';
  dir?: RovingDirection;
  loop?: boolean;

}

export interface RadioGroupRootEmits {
  valueChange: [value: string];
}
</script>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../utils/roving-focus';
import { useCollectionProvider } from '../collection';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { provideRadioGroupContext } from './context';

const {
  disabled = false,
  required = false,
  orientation = 'vertical',
  dir = 'ltr',
  loop = true,
  defaultValue,
  name,
  as = 'div',
} = defineProps<RadioGroupRootProps>();

const { forwardRef } = useForwardExpose();

const emit = defineEmits<RadioGroupRootEmits>();
const model = defineModel<string | undefined>({ default: undefined });

const localValue = ref<string | undefined>(model.value ?? defaultValue);

watch(model, (v) => {
  if (v === undefined) return;
  if (v !== localValue.value) localValue.value = v;
});

function setValue(v: string): void {
  if (disabled) return;
  localValue.value = v;
  model.value = v;
  emit('valueChange', v);
}

// DOM-order items via Collection primitive — survives `v-for` reorders.
const { getItems, CollectionSlot } = useCollectionProvider();
const items = computed(() => getItems(true).map(i => i.ref));

function focusIndex(i: number): void {
  const el = items.value[i];
  if (!el || el.hasAttribute('data-disabled')) {
    // Skip disabled items when looping forward.
    return;
  }
  el.focus();
  const v = el.getAttribute('data-value');
  if (v !== null) setValue(v);
}

function onItemKeyDown(event: KeyboardEvent, el: HTMLElement): void {
  // Space selects without moving focus.
  if (event.key === ' ') {
    event.preventDefault();
    const v = el.getAttribute('data-value');
    if (v !== null) setValue(v);
    return;
  }
  const action = rovingKeyToAction(event, { orientation, dir, loop });
  if (!action) return;
  event.preventDefault();
  const enabled = items.value.filter(x => !x.hasAttribute('data-disabled'));
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
  // Identity passthroughs via `toRef` — reactive without `computed`'s effect/cache.
  orientation: toRef(() => orientation),
  direction: toRef(() => dir),
  loop: toRef(() => loop),
  disabled: toRef(() => disabled),
  required: toRef(() => required),
  name: toRef(() => name),
  items,
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
      :dir="dir"
      :data-orientation="orientation"
      :data-disabled="disabled ? '' : undefined"
    >
      <slot :value="localValue" />
      <input
        v-if="name"
        type="radio"
        tabindex="-1"
        aria-hidden="true"
        :name="name"
        :value="localValue ?? ''"
        :checked="localValue !== undefined"
        :required="required"
        :disabled="disabled"
        style="position: absolute; pointer-events: none; opacity: 0; margin: 0; transform: translateX(-100%);"
      >
    </Primitive>
  </CollectionSlot>
</template>
