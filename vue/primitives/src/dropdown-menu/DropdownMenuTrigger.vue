<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface DropdownMenuTriggerProps extends PrimitiveProps {
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { MenuAnchor, useMenuContext } from '../menu';
import { Primitive } from '../primitive';
import { useDropdownMenuRootContext } from './context';

const { disabled = false, as = 'button' } = defineProps<DropdownMenuTriggerProps>();

const menuCtx = useMenuContext();
const ddCtx = useDropdownMenuRootContext();
const { forwardRef, currentElement } = useForwardExpose();

onMounted(() => {
  ddCtx.onTriggerChange(currentElement.value ?? null);
});
onUnmounted(() => {
  ddCtx.onTriggerChange(null);
});

function handlePointerDown(event: PointerEvent) {
  if (disabled) return;
  if (event.button !== 0 || event.ctrlKey) return;
  if (!menuCtx.open.value) {
    menuCtx.onOpenChange(true);
    event.preventDefault();
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (disabled) return;
  if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    menuCtx.onOpenChange(true);
  }
}
</script>

<template>
  <MenuAnchor>
    <Primitive
      :ref="forwardRef"
      :as="as"
      :id="ddCtx.triggerId.value"
      aria-haspopup="menu"
      :aria-expanded="menuCtx.open.value"
      :aria-controls="ddCtx.contentId.value"
      :data-state="menuCtx.open.value ? 'open' : 'closed'"
      :data-disabled="disabled ? '' : undefined"
      :disabled="as === 'button' ? disabled : undefined"
      @pointerdown="handlePointerDown"
      @keydown="handleKeyDown"
    >
      <slot />
    </Primitive>
  </MenuAnchor>
</template>
