<script lang="ts">
import type { TeleportPrimitiveProps } from '../teleport';

/**
 * Teleports the tooltip Content into another part of the DOM (the body by
 * default) so it escapes parent `overflow`/`transform`/`z-index` stacking
 * contexts. Wrap Content in a Portal when those clipping issues occur.
 */
export interface TooltipPortalProps extends TeleportPrimitiveProps {}
</script>

<script setup lang="ts">
import { Portal } from '../teleport';

const props = defineProps<TooltipPortalProps>();
</script>

<template>
  <Portal v-bind="props">
    <slot />
  </Portal>
</template>
