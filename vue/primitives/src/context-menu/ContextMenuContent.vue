<script lang="ts">
import type { MenuContentEmits, MenuContentProps } from '../menu';

export interface ContextMenuContentProps extends MenuContentProps {}
export type ContextMenuContentEmits = MenuContentEmits;
</script>

<script setup lang="ts">
import { MenuContent } from '../menu';

const props = defineProps<ContextMenuContentProps>();
const emit = defineEmits<ContextMenuContentEmits>();
</script>

<template>
  <MenuContent
    v-bind="props"
    side="right"
    align="start"
    update-position-strategy="always"
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
