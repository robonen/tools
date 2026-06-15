<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Marks a subtree as belonging to a sibling DismissableLayer even though it is
 * rendered elsewhere in the DOM (e.g. a portaled trigger, an anchor, or a toast
 * viewport). Pointer-down and focus interactions that originate inside a branch
 * are treated as *inside* the layer, so they will not trigger a dismiss. Renders
 * no UI of its own beyond the element you ask for via `as`.
 */

export interface DismissableLayerBranchProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { onScopeDispose, watch } from 'vue';
import { dismissableLayerStack } from './stack';
import { useForwardExpose } from '@robonen/vue';

const { as = 'div' } = defineProps<DismissableLayerBranchProps>();

const { forwardRef, currentElement } = useForwardExpose();

// Register/unregister against the shared branch set as the resolved element
// changes (covers `as="template"` and conditional rendering). `onScopeDispose`
// guarantees teardown when the branch's effect scope is torn down.
watch(currentElement, (el, prev) => {
  if (prev) dismissableLayerStack.removeBranch(prev);
  if (el) dismissableLayerStack.addBranch(el);
});

onScopeDispose(() => {
  if (currentElement.value) dismissableLayerStack.removeBranch(currentElement.value);
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
  >
    <slot />
  </Primitive>
</template>
