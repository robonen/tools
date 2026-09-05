<script lang="ts">
import type { TeleportPrimitiveProps } from '../../utilities/teleport';

/**
 * Teleports the tooltip Content into another part of the DOM (the body by
 * default) so it escapes parent `overflow`/`transform`/`z-index` stacking
 * contexts. Wrap Content in a Portal when those clipping issues occur.
 */
export interface TooltipPortalProps extends TeleportPrimitiveProps {}
</script>

<script setup lang="ts">
import { Portal } from '../../utilities/teleport';
import { useForwardProps } from '@robonen/vue';

const props = defineProps<TooltipPortalProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
</script>

<template>
  <Portal v-bind="forwardedProps">
    <slot />
  </Portal>
</template>
