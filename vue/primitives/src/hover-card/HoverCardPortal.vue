<script lang="ts">
import type { TeleportPrimitiveProps } from '../teleport';

/**
 * Teleports the hover card content into a different part of the DOM (the body by
 * default) so it escapes parent overflow and stacking-context clipping. Wrap the
 * content in it to keep the floating card above the rest of the page.
 */
export interface HoverCardPortalProps extends TeleportPrimitiveProps {}
</script>

<script setup lang="ts">
import { Portal } from '../teleport';

const props = defineProps<HoverCardPortalProps>();
</script>

<template>
  <Portal v-bind="props">
    <slot />
  </Portal>
</template>
