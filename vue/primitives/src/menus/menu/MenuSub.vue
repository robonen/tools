<script lang="ts">
/**
 * Establishes a nested submenu. It provides a fresh menu context plus a sub
 * context shared by its MenuSubTrigger and MenuSubContent, owning the submenu's
 * open state. Bind `v-model:open` to control it, or leave it unbound to let the
 * submenu manage its own open state (uncontrolled); the default slot also
 * exposes the current `open` value.
 */
export interface MenuSubProps {
  /** The controlled open state of the submenu. Use together with `update:open`. */
  open?: boolean;
}
export interface MenuSubEmits {
  'update:open': [value: boolean];
}
</script>

<script setup lang="ts">
import { shallowRef, watch } from 'vue';

import { useId } from '../../utilities/config-provider';
import { PopperRoot } from '../../overlays/popper';
import { provideMenuContext, provideMenuSubContext, useMenuContext } from './context';

defineProps<MenuSubProps>();
defineSlots<{ default?: (props: { open: boolean }) => unknown }>();

// Controlled when `v-model:open` is bound; otherwise the local ref drives it.
const local = shallowRef(false);
// The model shares the declared prop name on purpose — controlled/uncontrolled
// merge happens inside get/set — hence the dupe-keys exception.
// eslint-disable-next-line vue/no-dupe-keys
const open = defineModel<boolean>('open', {
  get: external => external ?? local.value,
  set: (value) => {
    local.value = value;
    return value;
  },
});

const parentMenuCtx = useMenuContext();
const trigger = shallowRef<HTMLElement | null>(null);
// Real reactive content ref + working setter so the grace-area / positioning
// logic that reads `menuCtx.content` works for submenus too.
const content = shallowRef<HTMLElement | null>(null);
const contentId = useId(undefined, 'menu-sub-content');
const triggerId = useId(undefined, 'menu-sub-trigger');

// A submenu must never outlive its parent: when the parent closes, close it
// too, and always close on teardown so an orphaned submenu can't linger.
watch(() => parentMenuCtx.open.value, (parentOpen) => {
  if (!parentOpen) open.value = false;
});

provideMenuContext({
  open,
  onOpenChange: (v) => { open.value = v; },
  content,
  onContentChange: (el) => { content.value = el; },
});

provideMenuSubContext({
  contentId,
  triggerId,
  trigger,
  onTriggerChange: (el) => { trigger.value = el; },
});
</script>

<template>
  <PopperRoot>
    <slot :open="open" />
  </PopperRoot>
</template>
