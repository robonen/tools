<script lang="ts">
export interface PresenceProps {
  present: boolean;
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { usePresence } from './usePresence';

const {
  present,
  forceMount = false,
} = defineProps<PresenceProps>();

defineSlots<{
  default?: (props: { present: boolean }) => any;
}>();

const { isPresent, setRef } = usePresence(() => present);

defineExpose({ present: isPresent });
</script>

<template>
  <!-- @vue-expect-error ref is forwarded to slot -->
  <slot v-if="forceMount || present || isPresent" :ref="setRef" :present="isPresent" />
</template>
