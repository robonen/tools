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

const props = defineProps<ToastPortalProps>();
</script>

<template>
  <TeleportPrimitive v-bind="props">
    <slot />
  </TeleportPrimitive>
</template>
