<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The scrollable region inside ComboboxContent that holds the items. Provides the overflow
 * container that keeps the highlighted item scrolled into view.
 */
export interface ComboboxViewportProps extends PrimitiveProps {
  /**
   * CSP `nonce` applied to the injected scrollbar-hiding `<style>` tag. Falls
   * back to the `ConfigProvider` nonce when omitted.
   */
  nonce?: string;
}
</script>

<script setup lang="ts">
import { toRef, watchPostEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useNonce } from '../../utilities/config-provider';
import { Primitive } from '../../internal/primitive';
import { useComboboxContentContext } from './context';

const props = defineProps<ComboboxViewportProps>();
const { as = 'div' } = props;

const { forwardRef, currentElement } = useForwardExpose();
const contentCtx = useComboboxContentContext();
const nonce = useNonce(toRef(() => props.nonce));

watchPostEffect(() => contentCtx.onViewportChange(currentElement.value));
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="presentation"
    data-primitives-combobox-viewport
    style="position: relative; flex: 1 1 0%; overflow: hidden auto"
  >
    <slot />
  </Primitive>
  <Primitive as="style" :nonce="nonce">
    [data-primitives-combobox-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}
    [data-primitives-combobox-viewport]::-webkit-scrollbar{display:none;}
  </Primitive>
</template>
