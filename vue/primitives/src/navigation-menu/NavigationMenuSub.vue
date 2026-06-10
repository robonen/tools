<script lang="ts">
import type { Orientation } from '../roving-focus';

/**
 * Nests a second navigation menu inside a `NavigationMenuContent` panel, with its
 * own independent active value while inheriting the parent's timing and direction.
 * Use it to build multi-level menus where a content panel itself contains a list of
 * triggers and sub-panels.
 */
export interface NavigationMenuSubProps {
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Submenu orientation. @default 'horizontal' */
  orientation?: Orientation;
}

export interface NavigationMenuSubEmits {
  'update:modelValue': [value: string];
}
</script>

<script setup lang="ts">
import type { Ref } from 'vue';

import { ref, shallowRef, watchEffect } from 'vue';

import { useForwardExpose, useId } from '@robonen/vue';
import { useCollectionProvider } from '../collection';
import { Primitive } from '../primitive';
import { provideNavigationMenuContext, useNavigationMenuContext } from './context';
import { NAVIGATION_MENU_COLLECTION_KEY } from './utils';

defineOptions({ inheritAttrs: false });

const { defaultValue, orientation = 'horizontal' } = defineProps<NavigationMenuSubProps>();

defineEmits<NavigationMenuSubEmits>();

defineSlots<{
  default?: (props: { modelValue: string }) => any;
}>();

const localValue = ref<string>(defaultValue ?? '');
/** Controlled active value of the submenu. Use `v-model`. */
const modelValue = defineModel<string | undefined>({
  default: undefined,
  get: v => v ?? localValue.value,
  set: (v) => {
    const next = v ?? '';
    localValue.value = next;
    return next;
  },
}) as unknown as Ref<string>;

const previousValue = ref<string>('');

const parentContext = useNavigationMenuContext();
const { forwardRef, currentElement } = useForwardExpose();

const indicatorTrack = shallowRef<HTMLElement | undefined>(undefined);
const viewport = shallowRef<HTMLElement | undefined>(undefined);
const activeTrigger = shallowRef<HTMLElement | undefined>(undefined);

const { getItems, CollectionSlot } = useCollectionProvider<{ value: string }>(NAVIGATION_MENU_COLLECTION_KEY);

const baseId = useId(undefined, 'primitives-navigation-menu-sub');

watchEffect(() => {
  if (!modelValue.value) return;
  const items = getItems().map(i => i.ref);
  const matched = items.find(item => item.id.includes(`-trigger-${modelValue.value}`));
  if (matched) activeTrigger.value = matched;
});

provideNavigationMenuContext({
  ...parentContext,
  isRootMenu: false,
  modelValue,
  previousValue,
  baseId,
  orientation,
  rootNavigationMenu: currentElement,
  activeTrigger,
  onActiveTriggerChange: (el) => { activeTrigger.value = el; },
  indicatorTrack,
  onIndicatorTrackChange: (el) => { indicatorTrack.value = el; },
  viewport,
  onViewportChange: (el) => { viewport.value = el; },
  onTriggerEnter: (val) => {
    modelValue.value = val;
  },
  onTriggerLeave: () => {
    /* submenus don't auto-close on trigger leave */
  },
  onContentEnter: () => {
    /* no-op for submenus */
  },
  onContentLeave: () => {
    /* no-op for submenus */
  },
  onItemSelect: (val) => {
    previousValue.value = modelValue.value;
    modelValue.value = val;
  },
  onItemDismiss: () => {
    previousValue.value = modelValue.value;
    modelValue.value = '';
  },
});
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :data-orientation="orientation"
      data-primitives-navigation-menu
      v-bind="$attrs"
    >
      <slot :model-value="modelValue" />
    </Primitive>
  </CollectionSlot>
</template>
