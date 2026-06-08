<script lang="ts">
import type { PortalProps } from '../teleport';

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
