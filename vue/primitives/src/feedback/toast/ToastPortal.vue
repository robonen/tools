<script lang="ts">
import type { TeleportPrimitiveProps } from '../../utilities/teleport';

/**
 * Renders the toast viewport into a different part of the DOM (a portal), so it
 * escapes parent overflow/stacking contexts. Wrap `ToastViewport` in this part
 * to mount it at the document body (default) or a custom container via `to`.
 */
export interface ToastPortalProps extends TeleportPrimitiveProps {}
</script>

<script setup lang="ts">
import { Teleport as TeleportPrimitive } from '../../utilities/teleport';
import { useForwardProps } from '@robonen/vue';

const props = defineProps<ToastPortalProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
</script>

<template>
  <TeleportPrimitive v-bind="forwardedProps">
    <slot />
  </TeleportPrimitive>
</template>
