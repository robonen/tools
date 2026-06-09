<script lang="ts">
import type { MenuContentEmits, MenuContentProps } from '../menu';

/**
 * The floating surface that holds the menu items, positioned relative to the
 * trigger. Handles focus management, typeahead, and dismissal on outside click
 * or Escape; render it inside a portal so it escapes overflow clipping.
 */
export interface DropdownMenuContentProps extends MenuContentProps {}
export type DropdownMenuContentEmits = MenuContentEmits;
</script>

<script setup lang="ts">
import { MenuContent } from '../menu';
import { useDropdownMenuRootContext } from './context';

const props = defineProps<DropdownMenuContentProps>();
const emit = defineEmits<DropdownMenuContentEmits>();
const ddCtx = useDropdownMenuRootContext();
</script>

<template>
  <MenuContent
    v-bind="props"
    :id="ddCtx.contentId.value"
    :aria-labelledby="ddCtx.triggerId.value"
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
  </MenuContent>
</template>
