<script lang="ts">
import type { PopperAnchorProps } from '../popper';

/**
 * An optional alternate element to position Content against. Place it anywhere
 * inside Root to anchor the popover to something other than the Trigger — the
 * Trigger then only toggles open state and no longer drives positioning.
 */
export interface PopoverAnchorProps extends PopperAnchorProps {}
</script>

<script setup lang="ts">
import { onBeforeMount, onUnmounted } from 'vue';
import { PopperAnchor } from '../popper';
import { usePopoverContext } from './context';

const props = defineProps<PopoverAnchorProps>();

const ctx = usePopoverContext();

onBeforeMount(() => {
  ctx.hasCustomAnchor.value = true;
});
onUnmounted(() => {
  ctx.hasCustomAnchor.value = false;
});
</script>

<template>
  <PopperAnchor v-bind="props">
    <slot />
  </PopperAnchor>
</template>
