<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ScrollAreaViewportProps extends PrimitiveProps {
  /** Inline `nonce` attribute applied to the injected style tag (CSP support). */
  nonce?: string;
}
</script>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useScrollAreaRootContext } from './context';

defineOptions({ inheritAttrs: false });

defineProps<ScrollAreaViewportProps>();

const ctx = useScrollAreaRootContext();
const { forwardRef, currentElement } = useForwardExpose();

const contentRef = ref<HTMLElement | null>(null);

watch(currentElement, (el) => {
  ctx.viewport.value = el ?? null;
}, { immediate: true });

watch(contentRef, (el) => {
  ctx.content.value = el ?? null;
}, { immediate: true });

onMounted(() => {
  ctx.viewport.value = currentElement.value ?? null;
  ctx.content.value = contentRef.value ?? null;
});
</script>

<template>
  <!-- Hide native scrollbars while preserving native scrolling behaviour. -->
  <component
    :is="'style'"
    :nonce="nonce"
  >
    [data-scroll-area-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-scroll-area-viewport]::-webkit-scrollbar{display:none;}
  </component>

  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="($attrs.id as string | undefined) ?? ctx.viewportId.value"
    data-scroll-area-viewport=""
    :style="{
      overflowX: ctx.scrollbarXEnabled.value ? 'scroll' : 'hidden',
      overflowY: ctx.scrollbarYEnabled.value ? 'scroll' : 'hidden',
    }"
    v-bind="$attrs"
  >
    <!-- A `min-width: fit-content` inner ensures horizontal content is measurable. -->
    <div
      :ref="(el: any) => { contentRef = el; }"
      :style="{ minWidth: '100%', display: 'table' }"
    >
      <slot />
    </div>
  </Primitive>
</template>
