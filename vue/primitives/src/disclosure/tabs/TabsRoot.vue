<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { RovingDirection } from '../../internal/utils/roving-focus';
import type { TabsValue } from './context';

/**
 * A set of layered sections of content — known as tab panels — where only one
 * panel is shown at a time, each surfaced by its own trigger. Use it to split
 * related content into switchable views without leaving the page: settings
 * panes, dashboards, or product detail sections.
 *
 * The root owns the selected value (controlled via `v-model` or uncontrolled
 * via `defaultValue`), orientation, keyboard roving focus across triggers, and
 * provides context to every `TabsList`, `TabsTrigger`, and `TabsContent`.
 */
export interface TabsRootProps extends PrimitiveProps {
  /** Controlled selected value. Bind with `v-model`. */
  modelValue?: TabsValue;
  /** Uncontrolled initial value. */
  defaultValue?: TabsValue;
  /** Orientation of the tab list. @default 'horizontal' */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Writing direction. When omitted, inherits from a `ConfigProvider`,
   * falling back to `'ltr'`.
   */
  dir?: RovingDirection;
  /** Wrap keyboard navigation. @default true */
  loop?: boolean;
  /** Disable all tabs. */
  disabled?: boolean;
  /** How tabs are activated. @default 'automatic' */
  activationMode?: 'automatic' | 'manual';
  /**
   * Unmount inactive panels from the DOM instead of keeping them mounted but
   * hidden. When `false`, panels stay mounted (hidden) so their state/animation
   * survives switching. Individual panels can opt in via `forceMount`.
   * @default true
   */
  unmountOnHide?: boolean;
}

export interface TabsRootEmits {
  /** Fired when the selected value changes. */
  'update:modelValue': [value: TabsValue | undefined];
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, toRef } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../../internal/utils/roving-focus';
import { useCollectionProvider } from '../../utilities/collection';
import { useForwardExpose } from '@robonen/vue';
import { useDirection, useId } from '../../utilities/config-provider';
import { Primitive } from '../../internal/primitive';
import { provideTabsContext } from './context';

const {
  orientation = 'horizontal',
  dir,
  loop = true,
  disabled = false,
  activationMode = 'automatic',
  unmountOnHide = true,
  defaultValue,
  as = 'div',
} = defineProps<TabsRootProps>();

defineEmits<TabsRootEmits>();

defineSlots<{
  default?: (props: {
    /** Current selected value. */
    value: TabsValue | undefined;
  }) => unknown;
}>();

const { forwardRef } = useForwardExpose();

const direction = useDirection(() => dir);

const localValue = ref<TabsValue | undefined>(defaultValue);

const value = defineModel<TabsValue | undefined>({
  get: v => v ?? localValue.value,
  set: (v) => {
    localValue.value = v;
    return v;
  },
});

const baseId = useId(undefined, 'tabs');
const tabsListElement = shallowRef<HTMLElement>();

function getTriggerId(v: TabsValue): string {
  return `${baseId.value}-trigger-${v}`;
}

function getContentId(v: TabsValue): string {
  return `${baseId.value}-content-${v}`;
}

// Replace-wholesale `Set` of mounted panel values, kept in a `shallowRef` so
// reading it in triggers does not pay for deep reactivity on the Set.
const contentIds = shallowRef<Set<TabsValue>>(new Set());

function registerContent(v: TabsValue): void {
  contentIds.value = new Set(contentIds.value).add(v);
}

function unregisterContent(v: TabsValue): void {
  const next = new Set(contentIds.value);
  next.delete(v);
  contentIds.value = next;
}

function select(v: TabsValue): void {
  if (disabled) return;
  value.value = v;
}

// DOM-order tabs via Collection primitive — survives `v-for` reorders and
// teleport/portal children, unlike a mount-order array. Items carry their typed
// `value`, so numeric tab values keep their identity through navigation.
const { getItems, CollectionSlot } = useCollectionProvider<TabsValue>();
const tabElements = computed(() => getItems(true).map(i => i.ref));

function onTriggerKeyDown(event: KeyboardEvent, el: HTMLElement): void {
  // A fully disabled root should not roam focus at all.
  if (disabled) return;
  const action = rovingKeyToAction(event, { orientation, dir: direction.value, loop });
  // `rovingKeyToAction` only handles Arrow/Home/End; map PageUp/PageDown to the
  // first/last enabled tab locally (the shared util is intentionally minimal).
  const pageAbsolute = event.key === 'PageUp'
    ? 'home'
    : event.key === 'PageDown' ? 'end' : undefined;
  if (!action && !pageAbsolute) return;
  event.preventDefault();

  const items = getItems(true).filter(i => !i.ref.hasAttribute('data-disabled'));
  if (items.length === 0) return;

  const current = items.findIndex(i => i.ref === el);
  const absolute = action?.absolute ?? pageAbsolute;
  let target: typeof items[number];
  if (absolute === 'home') {
    target = items[0]!;
  }
  else if (absolute === 'end') {
    target = items[items.length - 1]!;
  }
  else {
    const nextIdx = resolveNextIndex(current === -1 ? 0 : current, action!.delta, items.length, loop);
    target = items[nextIdx]!;
  }

  target.ref.focus();
  if (activationMode === 'automatic' && target.value !== undefined) {
    select(target.value);
  }
}

provideTabsContext({
  value,
  // Identity passthroughs via `toRef` — reactive without `computed`'s effect/cache.
  orientation: toRef(() => orientation),
  direction,
  loop: toRef(() => loop),
  disabled: toRef(() => disabled),
  activationMode: toRef(() => activationMode),
  unmountOnHide: toRef(() => unmountOnHide),
  baseId,
  tabsListElement,
  contentIds,
  tabElements,
  getTriggerId,
  getContentId,
  registerContent,
  unregisterContent,
  select,
  onTriggerKeyDown,
});
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      :dir="direction"
      :data-orientation="orientation"
      :data-disabled="disabled ? '' : undefined"
    >
      <slot :value="value" />
    </Primitive>
  </CollectionSlot>
</template>
