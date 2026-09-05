<script lang="ts">
import type { TeleportPrimitiveProps } from '../../utilities/teleport';

/**
 * Teleports the hover card content into a different part of the DOM (the body by
 * default) so it escapes parent overflow and stacking-context clipping. Wrap the
 * content in it to keep the floating card above the rest of the page.
 */
export interface HoverCardPortalProps extends TeleportPrimitiveProps {}
</script>

<script setup lang="ts">
import { Portal } from '../../utilities/teleport';
import { useForwardProps } from '@robonen/vue';

const props = defineProps<HoverCardPortalProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
</script>

<template>
  <Portal v-bind="forwardedProps">
    <slot />
  </Portal>
</template>
