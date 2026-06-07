<script lang="ts">
import type { TeleportPrimitiveProps } from '../teleport';

export interface HoverCardPortalProps extends TeleportPrimitiveProps {}
</script>

<script setup lang="ts">
import { Portal } from '../teleport';

const props = defineProps<HoverCardPortalProps>();
</script>

<template>
  <Portal v-bind="props">
    <slot />
  </Portal>
</template>
