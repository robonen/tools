<script lang="ts">
import type { SelectContentContext, SelectRootContext } from './context';

/**
 * Re-provides the root context and a no-op content context so that
 * `SelectItem`/`SelectItemText` can mount inside a detached `DocumentFragment`
 * while the listbox is closed. This lets every option register its value and
 * label up-front, so `SelectValue` shows the initially-selected label before
 * the dropdown is ever opened. Internal — rendered by `SelectContent`.
 */
export interface SelectProviderProps {
  context: SelectRootContext;
}
</script>

<script setup lang="ts">
import { shallowRef } from 'vue';

import { provideSelectContentContext, provideSelectRootContext } from './context';

const { context } = defineProps<SelectProviderProps>();

provideSelectRootContext(context);

const noopEl = shallowRef<HTMLElement | undefined>(undefined);
const defaultContentContext: SelectContentContext = {
  viewportRef: noopEl,
  onViewportChange: () => {},
  contentRef: noopEl,
  selectedItemRef: context.selectedItemRef,
  selectedItemTextRef: context.selectedItemTextRef,
  onItemLeave: () => {},
  focusSelectedItem: () => {},
  itemRefCallback: context.itemRefCallback,
  itemTextRefCallback: context.itemTextRefCallback,
  isPositioned: shallowRef(false),
  searchRef: shallowRef(''),
  position: 'item-aligned',
};

provideSelectContentContext(defaultContentContext);
</script>

<template>
  <slot />
</template>
