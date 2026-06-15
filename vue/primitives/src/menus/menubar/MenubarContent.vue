<script lang="ts">
import type { MenuContentEmits, MenuContentProps } from '../menu';

/**
 * The floating surface that holds a menu's items, positioned below its
 * MenubarTrigger. Handles focus management, typeahead, and dismissal on outside
 * click or Escape; render it inside a MenubarPortal so it escapes overflow
 * clipping.
 *
 * While open and focused, ArrowLeft / ArrowRight switch to the adjacent menubar
 * menu (RTL-aware, loop-aware) — the core APG menubar interaction.
 */
export interface MenubarContentProps extends MenuContentProps {}
export type MenubarContentEmits = MenuContentEmits;
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { MenuContent } from '../menu';
import { SUBTRIGGER_ATTR, useMenubarMenuContext, useMenubarRootContext } from './context';

const { align = 'start', ...props } = defineProps<MenubarContentProps>();
const emit = defineEmits<MenubarContentEmits>();

const rootCtx = useMenubarRootContext();
const menuCtx = useMenubarMenuContext();

// Set on @interact-outside so closeAutoFocus knows the user moved focus/clicked
// outside the menu — in that case focus must stay where they put it instead of
// snapping back to the trigger.
const hasInteractedOutside = ref(false);

const contentStyle = computed(() => ({
  '--primitives-menubar-content-transform-origin': 'var(--popper-transform-origin)',
  '--primitives-menubar-content-available-width': 'var(--popper-available-width)',
  '--primitives-menubar-content-available-height': 'var(--popper-available-height)',
  '--primitives-menubar-trigger-width': 'var(--popper-anchor-width)',
  '--primitives-menubar-trigger-height': 'var(--popper-anchor-height)',
}));

// Switch to the adjacent menubar menu. Mirrors the trigger-level arrow nav but
// fires while focus is inside the open content (APG menubar pattern).
function handleArrowNavigation(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  // Opening a submenu uses the same arrow key as "next menu"; don't hijack it.
  const targetIsSubTrigger = !!target.closest(`[${SUBTRIGGER_ATTR}]`);

  const prevMenuKey = rootCtx.dir.value === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  const isPrevKey = event.key === prevMenuKey;
  if (!isPrevKey && targetIsSubTrigger) return;

  const values = rootCtx.getTriggers().map(i => i.value).filter((v): v is string => v !== undefined);
  if (values.length === 0) return;
  if (isPrevKey) values.reverse();

  const currentIndex = values.indexOf(menuCtx.value);
  const len = values.length;
  const startIndex = currentIndex + 1;
  const next = rootCtx.loop.value
    ? values[startIndex % len]
    : (startIndex < len ? values[startIndex] : undefined);

  if (next) rootCtx.onMenuOpen(next);
}
</script>

<template>
  <MenuContent
    :id="menuCtx.contentId.value"
    v-bind="props"
    :align="align"
    :aria-labelledby="menuCtx.triggerId.value"
    :style="contentStyle"
    @keydown.arrow-right.arrow-left="handleArrowNavigation"
    @close-auto-focus="(event: Event) => {
      if (!menuCtx.wasKeyboardTriggerOpenRef.value) event.preventDefault()
      menuCtx.wasKeyboardTriggerOpenRef.value = false
      // Refocus the trigger on close, but NOT when the user moved focus/clicked
      // outside the menu (e.g. into an input) — leave focus where they put it.
      if (!hasInteractedOutside) menuCtx.triggerRef.value?.focus({ preventScroll: true })
      hasInteractedOutside = false
      emit('closeAutoFocus', event)
    }"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="(event: PointerEvent | MouseEvent) => {
      const target = event.target as Node
      const isMenubarTrigger = menuCtx.triggerRef.value?.contains(target)
      if (isMenubarTrigger) event.preventDefault()
      emit('pointerDownOutside', event)
    }"
    @focus-outside="emit('focusOutside', $event)"
    @interact-outside="(event: PointerEvent | MouseEvent | FocusEvent) => {
      hasInteractedOutside = true
      emit('interactOutside', event)
    }"
    @dismiss="rootCtx.onMenuClose(menuCtx.value)"
    @entry-focus="emit('entryFocus', $event)"
    @open-auto-focus="emit('openAutoFocus', $event)"
  >
    <slot />
  </MenuContent>
</template>
