<script lang="ts">
import type { TeleportPrimitiveProps } from '../../utilities/teleport';

/**
 * Teleports the popover content into a different part of the DOM (the body by
 * default) so it escapes overflow/stacking-context clipping. Wrap
 * `DatePickerContent` with it when the picker lives inside a scrolled or
 * transformed container.
 */
export interface DatePickerPortalProps extends TeleportPrimitiveProps {}
</script>

<script setup lang="ts">
import PortalPrimitive from '../../utilities/teleport/Teleport.vue';
import { useForwardProps } from '@robonen/vue';

const props = defineProps<DatePickerPortalProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
</script>

<template>
  <PortalPrimitive v-bind="forwardedProps">
    <slot />
  </PortalPrimitive>
</template>
