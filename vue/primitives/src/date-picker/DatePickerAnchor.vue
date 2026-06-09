<script lang="ts">
import type { PopperAnchorProps } from '../popper';

/**
 * Optional custom anchor for positioning the popover against an element other
 * than the trigger (e.g. a field or input group). When present, the trigger
 * stops acting as the anchor and the content is positioned relative to this.
 */
export interface DatePickerAnchorProps extends PopperAnchorProps {}
</script>

<script setup lang="ts">
import { onBeforeMount, onUnmounted } from 'vue';
import { PopperAnchor } from '../popper';
import { useDatePickerRootContext } from './context';

const props = defineProps<DatePickerAnchorProps>();

const ctx = useDatePickerRootContext();

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
