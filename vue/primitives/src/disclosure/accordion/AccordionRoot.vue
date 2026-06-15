<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { RovingDirection } from '../../internal/utils/roving-focus';

/**
 * A vertically (or horizontally) stacked set of headers that each reveal an
 * associated panel of content. Use it to let users expand and collapse
 * sections to manage information density — FAQs, settings groups, or any
 * place a `Collapsible` per item would be repetitive.
 *
 * The root owns open state (single or multiple panels), keyboard roving
 * focus across triggers, and provides context to every `AccordionItem`.
 */
export type AccordionType = 'single' | 'multiple';

export interface AccordionRootProps extends PrimitiveProps {
  /** Initial value(s) for uncontrolled mode. */
  defaultValue?: string | string[];

  /**
   * 'single' allows one panel; 'multiple' allows many. When omitted, the mode
   * is inferred from the shape of `modelValue`/`defaultValue` (array →
   * 'multiple', otherwise 'single'). @default 'single'
   */
  type?: AccordionType;

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

  /**
   * Unmount closed content from the DOM instead of keeping it mounted. When
   * `false`, closed panels stay in the DOM rendered with `hidden="until-found"`
   * so the browser's find-in-page can locate and reveal them. Individual items
   * may override this via `AccordionItem`'s own `unmountOnHide`. @default true
   */
  unmountOnHide?: boolean;
}

/**
 * Emit contract for `AccordionRoot`. The payload narrows with `Type`: a single
 * accordion emits `string | undefined`, a multiple accordion emits `string[]`.
 */
export interface AccordionRootEmits<Type extends AccordionType = AccordionType> {
  'update:modelValue': [value: (Type extends 'single' ? string : string[]) | undefined];
}
</script>

<script setup lang="ts">
import { computed, ref, toRef, watchEffect } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../../internal/utils/roving-focus';
import { Primitive } from '../../internal/primitive';
import { provideAccordionContext } from './context';
import { toArray } from '@robonen/stdlib';
import { useCollectionProvider } from '../../utilities/collection';
import { useForwardExpose } from '@robonen/vue';

const {
  type,
  collapsible = false,
  disabled = false,
  orientation = 'vertical',
  dir = 'ltr',
  loop = true,
  unmountOnHide = true,
  defaultValue,
  modelValue,
  as = 'div',
} = defineProps<AccordionRootProps>();

defineEmits<AccordionRootEmits>();

defineSlots<{
  default?: (props: {
    /** Current open value(s): a `string | undefined` in single mode, `string[]` in multiple. */
    modelValue: string | string[] | undefined;
  }) => unknown;
}>();

const { forwardRef } = useForwardExpose();

type RovingAction = NonNullable<ReturnType<typeof rovingKeyToAction>>;

// Infer the mode from value shape when `type` is omitted, mirroring how a
// `defaultValue: []` / array `modelValue` implies a multiple accordion. An
// explicit `type` always wins.
const resolvedType = computed<AccordionType>(() => {
  if (type !== undefined)
    return type;

  const sample = modelValue ?? defaultValue;
  if (sample === undefined)
    return 'single';

  return Array.isArray(sample) ? 'multiple' : 'single';
});

const isSingle = computed(() => resolvedType.value === 'single');

// Dev-only coherence check: an explicit `type` that disagrees with the value
// shape is surfaced as a warning (the explicit `type` is still honored).
if (__DEV__) {
  watchEffect(() => {
    const sample = modelValue ?? defaultValue;
    if (type === undefined || sample === undefined)
      return;

    const inferred: AccordionType = Array.isArray(sample) ? 'multiple' : 'single';
    if (type !== inferred) {
      console.warn(
        `[Accordion] "type" is "${type}" but the provided value is ${
          Array.isArray(sample) ? 'an array' : 'not an array'
        }. Following the explicit "type"; pass a ${
          type === 'single' ? 'string' : 'string[]'
        } value to silence this warning.`,
      );
    }
  });
}

const localValue = ref<string | string[] | undefined>(defaultValue);

const model = defineModel<string | string[] | undefined>({
  get: v => v ?? localValue.value,
  set: (v) => {
    localValue.value = v;
    return v;
  },
});

const openSet = computed<Set<string>>(() => new Set(toArray(model.value)));

function nextOpenSet(cur: Set<string>, value: string): Set<string> {
  const present = cur.has(value);

  if (isSingle.value) {
    if (!present) return new Set([value]);
    return collapsible ? new Set() : cur;
  }

  const next = new Set(cur);
  if (present) next.delete(value);
  else next.add(value);
  return next;
}

function toModelValue(set: Set<string>): string | string[] | undefined {
  return isSingle.value ? set.values().next().value : [...set];
}

function commit(next: Set<string>): void {
  model.value = toModelValue(next);
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

function open(value: string): void {
  if (disabled || openSet.value.has(value)) return;
  const cur = openSet.value;
  const next = isSingle.value ? new Set([value]) : new Set(cur).add(value);
  commit(next);
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
  isSingle,
  unmountOnHide: toRef(() => unmountOnHide),
  triggerElements,
  isOpen,
  toggle,
  open,
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
      <slot :model-value="model" />
    </Primitive>
  </CollectionSlot>
</template>
