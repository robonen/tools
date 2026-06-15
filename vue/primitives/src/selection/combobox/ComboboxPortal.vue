<script lang="ts">
import type { PortalProps } from '../../utilities/teleport';

/**
 * Teleports the ComboboxContent into another part of the DOM (defaults to `body`) to escape
 * overflow/stacking-context clipping. Wrap ComboboxContent with it.
 */
export interface ComboboxPortalProps extends PortalProps {}
</script>

<script setup lang="ts">
import { Portal } from '../../utilities/teleport';

const { to, defer, disabled } = defineProps<ComboboxPortalProps>();
</script>

<template>
  <Portal :to="to" :defer="defer" :disabled="disabled">
    <slot />
  </Portal>
</template>
