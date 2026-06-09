<script lang="ts">
/**
 * Controls the mount/unmount lifecycle of a single child while respecting CSS
 * enter/leave animations, keeping it in the DOM until any exit animation has
 * finished. Use it as the foundation for show/hide parts (dialog content,
 * tooltips, collapsible panels) so they animate out before being removed,
 * rather than disappearing instantly when their `present` state flips to false.
 *
 * `Presence` is a headless building block: it renders its child via `Slot`
 * (merging attributes onto it), wires up animation tracking, and exposes the
 * resolved presence to the default slot so children can reflect it (e.g. as a
 * `data-state`). The same logic is available standalone through `usePresence`.
 */
export interface PresenceProps {

  /** Whether the child should be present. While `false`, the child stays mounted until any leave animation completes. */
  present: boolean;

  /** Keep the child mounted regardless of `present` (useful for animation control or measuring while hidden). */
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
