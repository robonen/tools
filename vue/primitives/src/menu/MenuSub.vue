<script lang="ts">
export interface MenuSubProps {
  open?: boolean;
}
export interface MenuSubEmits {
  'update:open': [value: boolean];
}
</script>

<script setup lang="ts">
import { shallowRef, toRef } from 'vue';

import { useId } from '../config-provider';
import { PopperRoot } from '../popper';
import { provideMenuContext, provideMenuSubContext } from './context';

const { open = false } = defineProps<MenuSubProps>();
const emit = defineEmits<MenuSubEmits>();
defineSlots<{ default?: (props: { open: boolean }) => unknown }>();

const openRef = toRef(() => open);
const trigger = shallowRef<HTMLElement | null>(null);
const contentId = useId(undefined, 'menu-sub-content');
const triggerId = useId(undefined, 'menu-sub-trigger');

provideMenuContext({
  open: openRef,
  onOpenChange: v => emit('update:open', v),
  content: shallowRef(null),
  onContentChange: () => {},
});

provideMenuSubContext({
  contentId,
  triggerId,
  trigger,
  onTriggerChange: (el) => { trigger.value = el; },
});
</script>

<template>
  <PopperRoot>
    <slot :open="open" />
  </PopperRoot>
</template>
