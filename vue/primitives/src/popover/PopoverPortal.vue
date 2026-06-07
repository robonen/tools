<script lang="ts">
import type { TeleportPrimitiveProps } from '../teleport';

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
