<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Groups related items under a shared ComboboxLabel. Hides itself automatically when none
 * of its items survive the current filter.
 */
export interface ComboboxGroupProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useId } from '../../utilities/config-provider';
import { Primitive } from '../../internal/primitive';
import { provideComboboxGroupContext, useComboboxRootContext } from './context';

const { as = 'div' } = defineProps<ComboboxGroupProps>();

const { forwardRef } = useForwardExpose();
const rootCtx = useComboboxRootContext();
const id = useId(undefined, 'combobox-group');

const labelId = ref<string | undefined>(undefined);

const isVisible = computed(() => rootCtx.filterState.value.groups.has(id.value));

onMounted(() => rootCtx.onGroupRegister(id.value));
onBeforeUnmount(() => rootCtx.onGroupUnregister(id.value));

provideComboboxGroupContext({
  id,
  labelId,
  registerLabel: (labelElId) => { labelId.value = labelElId; },
  unregisterLabel: () => { labelId.value = undefined; },
});
</script>

<template>
  <Primitive
    v-show="isVisible"
    :ref="forwardRef"
    :as="as"
    role="group"
    :aria-labelledby="labelId"
  >
    <slot />
  </Primitive>
</template>
