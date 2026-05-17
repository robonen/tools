<script lang="ts">
import type { Direction } from '../config-provider';

export interface DropdownMenuRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  dir?: Direction;
  modal?: boolean;
}
export interface DropdownMenuRootEmits {
  'update:open': [value: boolean];
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';

import { useId } from '../config-provider';
import { MenuRoot } from '../menu';
import { provideDropdownMenuRootContext } from './context';

const {
  open: openProp,
  defaultOpen = false,
  dir,
  modal = true,
} = defineProps<DropdownMenuRootProps>();

const emit = defineEmits<DropdownMenuRootEmits>();
defineSlots<{ default?: (props: { open: boolean }) => unknown }>();

const local = ref(defaultOpen);
const open = computed({
  get: () => openProp !== undefined ? openProp : local.value,
  set: (v) => {
    local.value = v;
    emit('update:open', v);
  },
});

const triggerRef = shallowRef<HTMLElement | null>(null);
const triggerId = useId(undefined, 'dropdown-trigger');
const contentId = useId(undefined, 'dropdown-content');

provideDropdownMenuRootContext({
  triggerId,
  contentId,
  triggerRef,
  onTriggerChange: (el) => {
    triggerRef.value = el;
  },
});
</script>

<template>
  <MenuRoot
    :open="open"
    :dir="dir"
    :modal="modal"
    @update:open="open = $event"
  >
    <slot :open="open" />
  </MenuRoot>
</template>
