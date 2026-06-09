<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The button that toggles the dialog open. Wires up `aria-haspopup`,
 * `aria-expanded`, and `aria-controls`, and is the element focus returns to
 * when the dialog closes.
 */
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
