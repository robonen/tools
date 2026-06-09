<script lang="ts">
import type { MenuContentImplEmits, MenuContentImplProps } from './MenuContentImpl.vue';

/**
 * The popup surface for a submenu's items. It mounts while the submenu is open,
 * positions itself to the side of its MenuSubTrigger (flipping for RTL), and
 * always renders non-modally so the parent menu stays interactive. Must be used
 * inside a MenuSub.
 */
export interface MenuSubContentProps extends MenuContentImplProps {
  /** Force mounting the content even when closed, e.g. to control presence with an external animation library. */
  forceMount?: boolean;
}
export type MenuSubContentEmits = MenuContentImplEmits;
</script>

<script setup lang="ts">
import { Presence } from '../presence';
import { useMenuContext, useMenuRootContext, useMenuSubContext } from './context';
import MenuContentImpl from './MenuContentImpl.vue';

const { forceMount = false, ...contentProps } = defineProps<MenuSubContentProps>();
const emit = defineEmits<MenuSubContentEmits>();

const menuCtx = useMenuContext();
const subCtx = useMenuSubContext();
const rootCtx = useMenuRootContext();
</script>

<template>
  <Presence :present="forceMount || menuCtx.open.value">
    <MenuContentImpl
      :id="subCtx.contentId.value"
      v-bind="contentProps"
      :aria-labelledby="subCtx.triggerId.value"
      :trap-focus="false"
      :disable-outside-pointer-events="false"
      :side="rootCtx.dir.value === 'rtl' ? 'left' : 'right'"
      align="start"
      :side-offset="2"
      :align-offset="-5"
      @close-auto-focus="(event: Event) => { event.preventDefault(); emit('closeAutoFocus', event) }"
      @escape-key-down="(event: KeyboardEvent) => {
        emit('escapeKeyDown', event)
        menuCtx.onOpenChange(false)
      }"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="(event: FocusEvent) => {
        if (subCtx.trigger.value?.contains(event.target as Node)) event.preventDefault()
        emit('focusOutside', event)
      }"
      @interact-outside="emit('interactOutside', $event)"
      @dismiss="menuCtx.onOpenChange(false)"
      @entry-focus="emit('entryFocus', $event)"
      @open-auto-focus="emit('openAutoFocus', $event)"
    >
      <slot />
    </MenuContentImpl>
  </Presence>
</template>
