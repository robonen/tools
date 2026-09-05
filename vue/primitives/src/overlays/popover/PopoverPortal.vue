<script lang="ts">
import type { TeleportPrimitiveProps } from '../../utilities/teleport';

/**
 * Teleports Content out of the normal DOM flow (by default into `body`) so the
 * popover renders above the rest of the page and escapes `overflow` and
 * stacking contexts. Mounts its children only while the popover is open.
 */
export interface PopoverPortalProps extends TeleportPrimitiveProps {}
</script>

<script setup lang="ts">
import PortalPrimitive from '../../utilities/teleport/Teleport.vue';
import { useForwardProps } from '@robonen/vue';

const props = defineProps<PopoverPortalProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
</script>

<template>
  <PortalPrimitive v-bind="forwardedProps">
    <slot />
  </PortalPrimitive>
</template>
