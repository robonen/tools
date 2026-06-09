<script lang="ts">
import type { TeleportPrimitiveProps } from '../teleport';

/**
 * Teleports the popover content into a different part of the DOM (the body by
 * default) so it escapes overflow/stacking-context clipping. Wrap
 * `DatePickerContent` with it when the picker lives inside a scrolled or
 * transformed container.
 */
export interface DatePickerPortalProps extends TeleportPrimitiveProps {}
</script>

<script setup lang="ts">
import PortalPrimitive from '../teleport/Teleport.vue';

const props = defineProps<DatePickerPortalProps>();
</script>

<template>
  <PortalPrimitive v-bind="props">
    <slot />
  </PortalPrimitive>
</template>
