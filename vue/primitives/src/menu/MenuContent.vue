<script lang="ts">
import type { MenuContentImplEmits, MenuContentImplProps } from './MenuContentImpl.vue';

/**
 * The popup surface that holds the menu items. It mounts only while the menu is
 * open (gated by Presence), positions itself via Popper, and switches between
 * modal and non-modal behaviour based on the root's `modal` prop. Place items,
 * groups, labels, separators, and submenus inside it.
 *
 * Set `forceMount` to keep it in the DOM when open state is driven externally
 * (for example, to run exit animations).
 */
export interface MenuContentProps extends MenuContentImplProps {
  /** Force mounting the content even when closed, e.g. to control presence with an external animation library. */
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
