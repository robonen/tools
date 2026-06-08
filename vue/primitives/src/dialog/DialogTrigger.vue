<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface DialogTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { watch } from 'vue';
import { Primitive } from '../primitive';
import { useDialogContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' } = defineProps<DialogTriggerProps>();
const { forwardRef, currentElement } = useForwardExpose();
const ctx = useDialogContext();

watch(currentElement, (el) => {
  ctx.triggerElement.value = el as HTMLElement | undefined;
}, { immediate: true, flush: 'post' });
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :id="ctx.triggerId.value"
    :as="as"
    type="button"
    :aria-haspopup="'dialog'"
    :aria-expanded="ctx.open.value"
    :aria-controls="ctx.contentId.value"
    :data-state="ctx.open.value ? 'open' : 'closed'"
    @click="ctx.onToggle"
  >
    <slot />
  </Primitive>
</template>
