<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface MenubarTriggerProps extends PrimitiveProps {
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { MenuAnchor, useMenuContext } from '../menu';
import { Primitive } from '../primitive';
import { useMenubarMenuContext, useMenubarRootContext } from './context';

const { disabled = false, as = 'button', asChild } = defineProps<MenubarTriggerProps>();

const rootCtx = useMenubarRootContext();
const menuCtx = useMenubarMenuContext();
const menuMenuCtx = useMenuContext();
const { forwardRef, currentElement } = useForwardExpose();

onMounted(() => menuCtx.onTriggerChange(currentElement.value ?? null));
onUnmounted(() => menuCtx.onTriggerChange(null));

function handlePointerDown(event: PointerEvent) {
  if (disabled || event.button !== 0) return;
  event.preventDefault();
  rootCtx.onMenuToggle(menuCtx.value);
}

function handlePointerEnter() {
  if (disabled) return;
  if (rootCtx.value.value !== undefined && rootCtx.value.value !== menuCtx.value) {
    rootCtx.onMenuOpen(menuCtx.value);
    menuCtx.triggerRef.value?.focus({ preventScroll: true });
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (disabled) return;
  if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    menuCtx.wasKeyboardTriggerOpenRef.value = true;
    rootCtx.onMenuOpen(menuCtx.value);
  }
}
</script>

<template>
  <MenuAnchor as-child>
    <Primitive
      :ref="forwardRef"
      :as="as"
      :as-child="asChild"
      :id="menuCtx.triggerId.value"
      role="menuitem"
      aria-haspopup="menu"
      :aria-expanded="menuMenuCtx.open.value"
      :aria-controls="menuCtx.contentId.value"
      :data-state="menuMenuCtx.open.value ? 'open' : 'closed'"
      :data-disabled="disabled ? '' : undefined"
      :disabled="as === 'button' ? disabled : undefined"
      @pointerdown="handlePointerDown"
      @pointerenter="handlePointerEnter"
      @keydown="handleKeyDown"
    >
      <slot />
    </Primitive>
  </MenuAnchor>
</template>
