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
import { useForwardProps } from '@robonen/vue';

const props = defineProps<ContextMenuPortalProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
</script>

<template>
  <MenuPortal v-bind="forwardedProps"><slot /></MenuPortal>
</template>
