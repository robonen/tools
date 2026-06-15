<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The moving part of a switch. Renders alongside the root and mirrors the
 * root's state through its own `data-state` (`checked`/`unchecked`) and
 * `data-disabled` attributes, so the thumb can be animated with
 * `data-[state=checked]` selectors — the most common switch UI pattern. It
 * holds no state of its own; it reads the switch context provided by the root.
 */
export interface SwitchThumbProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { useSwitchContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'span' } = defineProps<SwitchThumbProps>();

const ctx = useSwitchContext();

defineOptions({ inheritAttrs: false });

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    v-bind="$attrs"
    :data-state="ctx.checked.value ? 'checked' : 'unchecked'"
    :data-disabled="ctx.disabled.value ? '' : undefined"
  >
    <slot :checked="ctx.checked.value" />
  </Primitive>
</template>
