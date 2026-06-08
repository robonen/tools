<script lang="ts">
import type { MenuContentImplEmits, MenuContentImplProps } from './MenuContentImpl.vue';

export interface MenuContentProps extends MenuContentImplProps {
  forceMount?: boolean;
}
export type MenuContentEmits = MenuContentImplEmits;
</script>

<script setup lang="ts">
import { Presence } from '../presence';
import { useMenuContext, useMenuRootContext } from './context';
import MenuRootContentModal from './MenuRootContentModal.vue';
import MenuRootContentNonModal from './MenuRootContentNonModal.vue';

const { forceMount = false, ...contentProps } = defineProps<MenuContentProps>();
const emit = defineEmits<MenuContentEmits>();

const menuCtx = useMenuContext();
const rootCtx = useMenuRootContext();
</script>

<template>
  <Presence :present="forceMount || menuCtx.open.value">
    <MenuRootContentModal
      v-if="rootCtx.modal.value"
      v-bind="contentProps"
      @close-auto-focus="emit('closeAutoFocus', $event)"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
      @interact-outside="emit('interactOutside', $event)"
      @dismiss="emit('dismiss')"
      @entry-focus="emit('entryFocus', $event)"
      @open-auto-focus="emit('openAutoFocus', $event)"
    >
      <slot />
    </MenuRootContentModal>
    <MenuRootContentNonModal
      v-else
      v-bind="contentProps"
      @close-auto-focus="emit('closeAutoFocus', $event)"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
      @interact-outside="emit('interactOutside', $event)"
      @dismiss="emit('dismiss')"
      @entry-focus="emit('entryFocus', $event)"
      @open-auto-focus="emit('openAutoFocus', $event)"
    >
      <slot />
    </MenuRootContentNonModal>
  </Presence>
</template>
