<script lang="ts">
import type { PortalProps } from '../teleport';

/**
 * Teleports the menu content into a different part of the DOM (the document body
 * by default) so it escapes ancestor `overflow` and stacking-context clipping.
 * Wrap the content in this part to render it as a top-level overlay.
 */
export interface MenuPortalProps extends PortalProps {}
</script>

<script setup lang="ts">
import { Portal } from '../teleport';

const { to, defer, disabled } = defineProps<MenuPortalProps>();
</script>

<template>
  <Portal :to="to" :defer="defer" :disabled="disabled">
    <slot />
  </Portal>
</template>
