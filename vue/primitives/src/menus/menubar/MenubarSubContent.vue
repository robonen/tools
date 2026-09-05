<script lang="ts">
import type { MenuSubContentEmits, MenuSubContentProps } from '../menu';

/**
 * The floating surface for a submenu's items, positioned alongside its
 * MenubarSubTrigger. Place it inside a MenubarSub.
 *
 * While open, ArrowRight (the "next menu" key, RTL-aware) switches to the
 * adjacent menubar menu, matching the top-level content behaviour.
 */
export interface MenubarSubContentProps extends MenuSubContentProps {}
export type MenubarSubContentEmits = MenuSubContentEmits;
</script>

<script setup lang="ts">
import { computed } from 'vue';

import { MenuSubContent } from '../menu';
import { SUBTRIGGER_ATTR, useMenubarMenuContext, useMenubarRootContext } from './context';
import { useForwardProps } from '@robonen/vue';

const props = defineProps<MenubarSubContentProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
const emit = defineEmits<MenubarSubContentEmits>();

const rootCtx = useMenubarRootContext();
const menuCtx = useMenubarMenuContext();

const contentStyle = computed(() => ({
  '--primitives-menubar-content-transform-origin': 'var(--popper-transform-origin)',
  '--primitives-menubar-content-available-width': 'var(--popper-available-width)',
  '--primitives-menubar-content-available-height': 'var(--popper-available-height)',
  '--primitives-menubar-trigger-width': 'var(--popper-anchor-width)',
  '--primitives-menubar-trigger-height': 'var(--popper-anchor-height)',
}));

// Inside a submenu, the "next menu" key (ArrowRight in LTR) jumps to the next
// menubar menu — unless it is a deeper sub-trigger opening its own submenu.
function handleArrowNavigation(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  if (target.closest(`[${SUBTRIGGER_ATTR}]`)) return;

  const values = rootCtx.getTriggers().map(i => i.value).filter((v): v is string => v !== undefined);
  if (values.length === 0) return;

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
  <MenuSubContent
    v-bind="forwardedProps"
    :style="contentStyle"
    @keydown.arrow-right="handleArrowNavigation"
    @close-auto-focus="emit('closeAutoFocus', $event)"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
    @focus-outside="emit('focusOutside', $event)"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="emit('dismiss')"
    @entry-focus="emit('entryFocus', $event)"
    @open-auto-focus="emit('openAutoFocus', $event)"
  ><slot /></MenuSubContent>
</template>
