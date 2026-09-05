<script lang="ts">
import type { MenuSubContentEmits, MenuSubContentProps } from '../menu';

/**
 * The floating surface for a submenu's items, positioned alongside its
 * DropdownMenuSubTrigger. Place it inside a DropdownMenuSub.
 */
export interface DropdownMenuSubContentProps extends MenuSubContentProps {}
export type DropdownMenuSubContentEmits = MenuSubContentEmits;
</script>

<script setup lang="ts">
import type { CSSProperties } from 'vue';

import { useForwardExpose, useForwardProps } from '@robonen/vue';
import { MenuSubContent } from '../menu';

const props = defineProps<DropdownMenuSubContentProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
const emit = defineEmits<DropdownMenuSubContentEmits>();
useForwardExpose();

const contentStyle: CSSProperties = {
  '--primitives-dropdown-menu-content-transform-origin': 'var(--popper-transform-origin)',
  '--primitives-dropdown-menu-content-available-width': 'var(--popper-available-width)',
  '--primitives-dropdown-menu-content-available-height': 'var(--popper-available-height)',
  '--primitives-dropdown-menu-trigger-width': 'var(--popper-anchor-width)',
  '--primitives-dropdown-menu-trigger-height': 'var(--popper-anchor-height)',
} as CSSProperties;
</script>

<template>
  <MenuSubContent
    v-bind="forwardedProps"
    :style="contentStyle"
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
