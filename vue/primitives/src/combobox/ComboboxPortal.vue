<script lang="ts">
import type { PortalProps } from '../teleport';

export interface ComboboxPortalProps extends PortalProps {}
</script>

<script setup lang="ts">
import { Portal } from '../teleport';

const { to, defer, disabled } = defineProps<ComboboxPortalProps>();
</script>

<template>
  <Portal :to="to" :defer="defer" :disabled="disabled">
    <slot />
  </Portal>
</template>
