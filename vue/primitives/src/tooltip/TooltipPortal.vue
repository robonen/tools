<script lang="ts">
import type { TeleportPrimitiveProps } from '../teleport';

export interface TooltipPortalProps extends TeleportPrimitiveProps {}
</script>

<script setup lang="ts">
import { Portal } from '../teleport';

const props = defineProps<TooltipPortalProps>();
</script>

<template>
  <Portal v-bind="props">
    <slot />
  </Portal>
</template>
