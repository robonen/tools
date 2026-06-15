<script lang="ts">
import type { MenuSubContentEmits, MenuSubContentProps } from '../menu';

/**
 * The floating panel of a nested submenu, positioned alongside its
 * `ContextMenuSubTrigger`. Render it inside a `ContextMenuSub`.
 */
export interface ContextMenuSubContentProps extends MenuSubContentProps {}
export type ContextMenuSubContentEmits = MenuSubContentEmits;
</script>

<script setup lang="ts">
import { MenuSubContent } from '../menu';

const props = defineProps<ContextMenuSubContentProps>();
const emit = defineEmits<ContextMenuSubContentEmits>();
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
