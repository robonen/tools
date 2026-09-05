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
import { useForwardProps } from '@robonen/vue';

const props = defineProps<ContextMenuSubContentProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
const emit = defineEmits<ContextMenuSubContentEmits>();
</script>

<template>
  <MenuSubContent
    v-bind="forwardedProps"
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
