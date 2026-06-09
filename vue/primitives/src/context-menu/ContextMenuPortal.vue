<script lang="ts">
import type { MenuPortalProps } from '../menu';

/**
 * Teleports the menu content into `document.body` (or a custom target) so it
 * escapes parent overflow and stacking contexts. Place it between the trigger
 * and the content.
 */
export interface ContextMenuPortalProps extends MenuPortalProps {}
</script>

<script setup lang="ts">
import { MenuPortal } from '../menu';

const props = defineProps<ContextMenuPortalProps>();
</script>

<template>
  <MenuPortal v-bind="props"><slot /></MenuPortal>
</template>
