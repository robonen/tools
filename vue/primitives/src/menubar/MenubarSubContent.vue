<script lang="ts">
import type { MenuSubContentEmits, MenuSubContentProps } from '../menu';

/**
 * The floating surface for a submenu's items, positioned alongside its
 * MenubarSubTrigger. Place it inside a MenubarSub.
 */
export interface MenubarSubContentProps extends MenuSubContentProps {}
export type MenubarSubContentEmits = MenuSubContentEmits;
</script>

<script setup lang="ts">
import { MenuSubContent } from '../menu';

const props = defineProps<MenubarSubContentProps>();
const emit = defineEmits<MenubarSubContentEmits>();
</script>

<template>
  <MenuSubContent
    v-bind="props"
    @close-auto-focus="emit('closeAutoFocus', $event)"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
    @focus-outside="emit('focusOutside', $event)"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="emit('dismiss')"
    @entry-focus="emit('entryFocus', $event)"
    @open-auto-focus="emit('openAutoFocus', $event)"
  ><slot /></MenuSubContent>
</template>
