<script lang="ts">
import type { PortalProps } from '../teleport';

/**
 * Teleports the `SelectContent` into a different part of the DOM (the document
 * body by default) so it escapes overflow and stacking-context clipping.
 */
export interface SelectPortalProps extends PortalProps {}
</script>

<script setup lang="ts">
import { Portal } from '../teleport';

const { to, defer, disabled } = defineProps<SelectPortalProps>();
</script>

<template>
  <Portal :to="to" :defer="defer" :disabled="disabled">
    <slot />
  </Portal>
</template>
