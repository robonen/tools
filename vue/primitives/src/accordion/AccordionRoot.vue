<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { RovingDirection } from '../utils/roving-focus';

export interface AccordionRootProps extends PrimitiveProps {
  /** Current open value(s) for controlled mode. */
  modelValue?: string | string[];

  /** Initial value(s) for uncontrolled mode. */
  defaultValue?: string | string[];

  /** 'single' allows one panel; 'multiple' allows many. @default 'single' */
  type?: 'single' | 'multiple';

  /** Allow closing all panels in single mode. @default false */
  collapsible?: boolean;

  /** Disable all items. */
  disabled?: boolean;

  /** Orientation of the accordion. @default 'vertical' */
  orientation?: 'horizontal' | 'vertical';

  /** Writing direction. @default 'ltr' */
  dir?: RovingDirection;

  /** Wrap keyboard navigation. @default true */
  loop?: boolean;
}
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../utils/roving-focus';
import { Primitive } from '../primitive';
import { provideAccordionContext } from './context';
import { toArray } from '@robonen/stdlib';
import { useCollectionProvider } from '../collection';
import { useForwardExpose } from '@robonen/vue';

const {
  type = 'single',
  collapsible = false,
  disabled = false,
  orientation = 'vertical',
  dir = 'ltr',
  loop = true,
  modelValue,
  defaultValue,
  as = 'div',
} = defineProps<AccordionRootProps>();

const { forwardRef } = useForwardExpose();

const emit = defineEmits<{ 'update:modelValue': [value: string | string[] | undefined] }>();

type RovingAction = NonNullable<ReturnType<typeof rovingKeyToAction>>;

const openSet = shallowRef<Set<string>>(
  new Set(toArray(modelValue ?? defaultValue)),
);

function setEqualsArray(set: Set<string>, arr: string[]): boolean {
  if (arr.length !== set.size) return false;
  for (let i = 0; i < arr.length; i++) if (!set.has(arr[i]!)) return false;
  return true;
}

watch(() => modelValue, (v) => {
  if (v === undefined) return;
  const arr = toArray(v);
  if (setEqualsArray(openSet.value, arr)) return;
  openSet.value = new Set(arr);
});


function nextOpenSet(cur: Set<string>, value: string): Set<string> {
  const present = cur.has(value);

  if (type === 'single') {
    if (!present) return new Set([value]);
    return collapsible ? new Set() : cur;
  }

  const next = new Set(cur);
  if (present) next.delete(value);
  else next.add(value);
  return next;
}

function toEmitValue(set: Set<string>): string | string[] | undefined {
  return type === 'single' ? set.values().next().value : [...set];
}

function commit(next: Set<string>): void {
  openSet.value = next;
  emit('update:modelValue', toEmitValue(next));
}

function isOpen(value: string): boolean {
  return openSet.value.has(value);
}

function toggle(value: string): void {
  if (disabled) return;
  const cur = openSet.value;
  const next = nextOpenSet(cur, value);
  if (next !== cur) commit(next);
}

const { getItems, CollectionSlot } = useCollectionProvider();
const triggerElements = computed(() => getItems(true).map(i => i.ref));

function resolveFocusIndex(action: RovingAction, current: number, count: number): number {
  if (action.absolute === 'home') return 0;
  if (action.absolute === 'end') return count - 1;
  return resolveNextIndex(current === -1 ? 0 : current, action.delta, count, loop);
}

function onTriggerKeyDown(event: KeyboardEvent, el: HTMLElement): void {
  const action = rovingKeyToAction(event, { orientation, dir, loop });
  if (!action) return;
  event.preventDefault();
  const enabled = triggerElements.value.filter(x => !x.hasAttribute('data-disabled'));
  if (enabled.length === 0) return;
  enabled[resolveFocusIndex(action, enabled.indexOf(el), enabled.length)]!.focus();
}

provideAccordionContext({
  disabled: toRef(() => disabled),
  orientation: toRef(() => orientation),
  direction: toRef(() => dir),
  loop: toRef(() => loop),
  collapsible: toRef(() => collapsible),
  triggerElements,
  isOpen,
  toggle,
  onTriggerKeyDown,
});
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      :data-orientation="orientation"
      :data-disabled="disabled ? '' : undefined"
    >
      <slot />
    </Primitive>
  </CollectionSlot>
</template>
