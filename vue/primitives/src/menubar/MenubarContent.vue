<script lang="ts">
import type { MenuContentEmits, MenuContentProps } from '../menu';

export interface MenubarContentProps extends MenuContentProps {}
export type MenubarContentEmits = MenuContentEmits;
</script>

<script setup lang="ts">
import { MenuContent } from '../menu';
import { useMenubarMenuContext, useMenubarRootContext } from './context';

const props = defineProps<MenubarContentProps>();
const emit = defineEmits<MenubarContentEmits>();

const rootCtx = useMenubarRootContext();
const menuCtx = useMenubarMenuContext();
</script>

<template>
  <MenuContent
    :id="menuCtx.contentId.value"
    v-bind="props"
    align="start"
    :aria-labelledby="menuCtx.triggerId.value"
    @close-auto-focus="(event: Event) => {
      if (!menuCtx.wasKeyboardTriggerOpenRef.value) event.preventDefault()
      menuCtx.wasKeyboardTriggerOpenRef.value = false
      menuCtx.triggerRef.value?.focus({ preventScroll: true })
      emit('closeAutoFocus', event)
    }"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="(event: PointerEvent | MouseEvent) => {
      const target = event.target as Node
      const isMenubarTrigger = menuCtx.triggerRef.value?.contains(target)
      if (isMenubarTrigger) event.preventDefault()
      emit('pointerDownOutside', event)
    }"
    @focus-outside="emit('focusOutside', $event)"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="rootCtx.onMenuClose()"
    @entry-focus="emit('entryFocus', $event)"
    @open-auto-focus="emit('openAutoFocus', $event)"
  >
    <slot />
  </MenuContent>
</template>
