<script lang="ts">
import type { PopperAnchorProps } from '../popper';

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
