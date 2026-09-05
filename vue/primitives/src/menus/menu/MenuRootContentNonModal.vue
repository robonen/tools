<script setup lang="ts">
// Internal non-modal variant of the menu content: leaves focus untrapped and
// outside pointer events enabled, so the rest of the page stays interactive
// while the menu is open. Selected by MenuContent when the root's `modal` prop
// is false.
import type { MenuContentImplEmits, MenuContentImplProps } from './MenuContentImpl.vue';

import { shallowRef, watchEffect } from 'vue';

import MenuContentImpl from './MenuContentImpl.vue';
import { useMenuContext } from './context';
import { useForwardProps } from '@robonen/vue';

const props = defineProps<MenuContentImplProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
const emit = defineEmits<MenuContentImplEmits>();
const menuCtx = useMenuContext();
const contentRef = shallowRef<HTMLElement | null>(null);

watchEffect(() => menuCtx.onContentChange(contentRef.value));
</script>

<template>
  <MenuContentImpl
    v-bind="forwardedProps"
    :ref="(comp: any) => { contentRef = comp?.$el ?? null }"
    :trap-focus="false"
    :disable-outside-pointer-events="false"
    @close-auto-focus="emit('closeAutoFocus', $event)"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
    @focus-outside="emit('focusOutside', $event)"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="() => { menuCtx.onOpenChange(false); emit('dismiss') }"
    @entry-focus="emit('entryFocus', $event)"
    @open-auto-focus="emit('openAutoFocus', $event)"
  >
    <slot />
  </MenuContentImpl>
</template>
