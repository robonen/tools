<script lang="ts">
export interface PresenceProps {
  present: boolean;
  forceMount?: boolean;
}

export default {
  inheritAttrs: false,
};
</script>

<script setup lang="ts">
import { Slot } from '../primitive/Slot';
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
  <Slot v-if="forceMount || isPresent" :ref="setRef" v-bind="$attrs">
    <slot :present="isPresent" />
  </Slot>
</template>
