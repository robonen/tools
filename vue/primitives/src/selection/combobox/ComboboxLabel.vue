<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * An accessible label for a ComboboxGroup. Its id is referenced by the group's
 * `aria-labelledby`, so place it as a direct child of ComboboxGroup.
 */
export interface ComboboxLabelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useId } from '../../utilities/config-provider';
import { Primitive } from '../../internal/primitive';
import { useComboboxGroupContext } from './context';

const { as = 'div' } = defineProps<ComboboxLabelProps>();
const { forwardRef } = useForwardExpose();
const groupCtx = useComboboxGroupContext();

const id = useId(undefined, 'combobox-group-label');
groupCtx.registerLabel(id.value);
onBeforeUnmount(() => groupCtx.unregisterLabel());
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="id"
  >
    <slot />
  </Primitive>
</template>
