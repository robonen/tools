<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Groups a set of related items under a shared label. Renders as a
 * `role="group"` and provides an id so a child `SelectLabel` can label the
 * group for assistive technology.
 */
export interface SelectGroupProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { useId } from '../config-provider';
import { Primitive } from '../primitive';
import { provideSelectGroupContext } from './context';

const { as = 'div' } = defineProps<SelectGroupProps>();
const { forwardRef } = useForwardExpose();

const groupId = useId(undefined, 'select-group');

provideSelectGroupContext({ id: groupId });
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="group"
    :aria-labelledby="groupId"
  >
    <slot />
  </Primitive>
</template>
