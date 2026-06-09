<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { RovingDirection } from '../utils/roving-focus';
import type { ToggleGroupType } from './context';

/**
 * A set of two-state toggle buttons that behave as one control, with full
 * keyboard roving focus (arrow keys move, Home/End jump to ends). Set `type`
 * to `'single'` for mutually exclusive options (like a segmented control) or
 * `'multiple'` to let several be pressed at once (like a text-formatting bar).
 * This is the container and state owner: it tracks the pressed value(s)
 * (controlled via `v-model` or uncontrolled via `defaultValue`) and provides
 * context to each `ToggleGroupItem`. Reach for it to group related toggles
 * such as text alignment, view modes, or formatting options.
 */
export interface ToggleGroupRootProps extends PrimitiveProps {
  type?: ToggleGroupType;
  defaultValue?: string | string[];
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  dir?: RovingDirection;
  loop?: boolean;
  rovingFocus?: boolean;
}

export interface ToggleGroupRootEmits {
  valueChange: [value: string | string[]];
}
</script>

<script setup lang="ts">
import { computed, toRef } from 'vue';
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
  defaultValue,
  as = 'div',
} = defineProps<ToggleGroupRootProps>();

const { forwardRef } = useForwardExpose();

const emit = defineEmits<ToggleGroupRootEmits>();

const model = defineModel<string | string[] | undefined>({ default: undefined });

function normalize(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  if (Array.isArray(v)) return v.slice();
  return [v];
}

// Seed the uncontrolled default once; defineModel owns state thereafter.
if (model.value === undefined && defaultValue !== undefined)
  model.value = defaultValue;

// Normalized string[] view of the public model (string | string[] | undefined).
const localValue = computed<string[]>(() => normalize(model.value));

function emitValue(next: string[]): void {
  if (type === 'single') {
    const v = next[0];
    model.value = v;
    emit('valueChange', v ?? '');
  }
  else {
    model.value = next;
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
