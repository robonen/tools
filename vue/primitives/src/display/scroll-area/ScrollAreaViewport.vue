<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The scrollable region that clips and natively scrolls its content while the OS scrollbars
 * are visually hidden. Place all scrollable content inside it; it must be a child of
 * `ScrollAreaRoot`.
 */
export interface ScrollAreaViewportProps extends PrimitiveProps {
  /**
   * Inline `nonce` attribute applied to the injected style tag (CSP support).
   * Falls back to the `ConfigProvider` `nonce` when omitted.
   */
  nonce?: string;
  /**
   * `tabindex` applied to the scrollable region so keyboard users can focus the
   * panel and arrow-scroll natively even when no scrollbar is interactive.
   * Pass `-1`/`undefined` to opt out.
   * @default 0
   */
  tabindex?: number;
}
</script>

<script setup lang="ts">
import { computed, onMounted, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useNonce } from '../../utilities/config-provider';
import { useScrollAreaRootContext } from './context';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ScrollAreaViewportProps>(), {
  tabindex: 0,
});

const ctx = useScrollAreaRootContext();
const { forwardRef, currentElement } = useForwardExpose();

const nonce = useNonce(toRef(() => props.nonce));

/**
 * Only force `fit-content` when horizontal scrolling is enabled. In the common
 * vertical-only case leaving `minWidth` unset lets the parent constrain width
 * so `text-overflow: ellipsis` keeps working inside the content wrapper.
 */
const contentMinWidth = computed(() =>
  ctx.scrollbarXEnabled.value ? 'fit-content' : '100%',
);

const contentRef = shallowRef<HTMLElement | null>(null);

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
    :tabindex="tabindex"
    :style="{
      overflowX: ctx.scrollbarXEnabled.value ? 'scroll' : 'hidden',
      overflowY: ctx.scrollbarYEnabled.value ? 'scroll' : 'hidden',
    }"
    v-bind="$attrs"
  >
    <!-- A `min-width: fit-content` inner ensures horizontal content is measurable. -->
    <div
      :ref="(el: any) => { contentRef = el; }"
      :style="{ minWidth: contentMinWidth, display: 'table' }"
    >
      <slot />
    </div>
  </Primitive>
</template>
