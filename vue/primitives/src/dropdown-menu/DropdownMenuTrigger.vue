<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The button that toggles the menu open on click, Enter, Space, or the arrow
 * keys, and serves as the anchor the content is positioned against. Renders a
 * `<button>` by default and wires up the `aria-haspopup`/`aria-expanded`
 * accessibility attributes.
 */
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
  // Toggle on the pre-interaction state: DropdownMenuContent prevents the
  // dismissable layer from closing on trigger pointerdown, so this handler is
  // the single owner of the open state for trigger interactions (otherwise
  // dismiss-then-toggle would immediately reopen the menu).
  const wasOpen = menuCtx.open.value;
  menuCtx.onOpenChange(!wasOpen);
  // Prevent trigger focusing when opening so the content can take focus
  // without competition.
  if (!wasOpen) event.preventDefault();
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
  <MenuAnchor as="template">
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
