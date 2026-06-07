<script lang="ts">
import type { PopperAnchorProps } from '../popper';

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
