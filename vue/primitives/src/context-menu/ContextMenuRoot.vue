<script lang="ts">
import type { Direction } from '../config-provider';

export interface ContextMenuRootProps {
  dir?: Direction;
  modal?: boolean;
}
export interface ContextMenuRootEmits {
  'update:open': [value: boolean];
}
</script>

<script setup lang="ts">
import { ref, toRef } from 'vue';

import { MenuRoot } from '../menu';
import { provideContextMenuRootContext } from './context';

const { dir, modal = true } = defineProps<ContextMenuRootProps>();
const emit = defineEmits<ContextMenuRootEmits>();
defineSlots<{ default?: (props: { open: boolean }) => unknown }>();

const open = ref(false);

provideContextMenuRootContext({
  open,
  onOpenChange: (v) => {
    open.value = v;
    emit('update:open', v);
  },
  modal: toRef(() => modal),
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
