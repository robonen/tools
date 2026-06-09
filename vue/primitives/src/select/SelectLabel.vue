<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A non-selectable heading for a `SelectGroup`. Renders the text that labels the
 * group and wires its id to the group's `aria-labelledby`; must be used inside a
 * `SelectGroup`.
 */
export interface SelectLabelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';
import { useSelectGroupContext } from './context';

const { as = 'div' } = defineProps<SelectLabelProps>();
const { forwardRef } = useForwardExpose();
const groupCtx = useSelectGroupContext();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="groupCtx.id.value"
  >
    <slot />
  </Primitive>
</template>
