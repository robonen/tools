<script lang="ts">
import type { TeleportPrimitiveProps } from '../teleport';

/**
 * Teleports Content out of the normal DOM flow (by default into `body`) so the
 * popover renders above the rest of the page and escapes `overflow` and
 * stacking contexts. Mounts its children only while the popover is open.
 */
export interface PopoverPortalProps extends TeleportPrimitiveProps {}
</script>

<script setup lang="ts">
import PortalPrimitive from '../teleport/Teleport.vue';

const props = defineProps<PopoverPortalProps>();
</script>

<template>
  <PortalPrimitive v-bind="props">
    <slot />
  </PortalPrimitive>
</template>
