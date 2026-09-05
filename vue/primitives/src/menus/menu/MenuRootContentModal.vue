<script setup lang="ts">
// Internal modal variant of the menu content: traps focus, disables outside
// pointer events, locks body scroll, and hides sibling content from assistive
// tech. Selected by MenuContent when the root's `modal` prop is true.
import type { MenuContentImplEmits, MenuContentImplProps } from './MenuContentImpl.vue';

import { shallowRef, watchEffect } from 'vue';

import { useBodyScrollLock, useFocusGuard, useForwardProps } from '@robonen/vue';
import { useHideOthers } from '../../internal/utils/useHideOthers';
import MenuContentImpl from './MenuContentImpl.vue';
import { useMenuContext } from './context';

const props = defineProps<MenuContentImplProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
const emit = defineEmits<MenuContentImplEmits>();

const menuCtx = useMenuContext();
const contentRef = shallowRef<HTMLElement | null>(null);

watchEffect(() => menuCtx.onContentChange(contentRef.value));

useFocusGuard();
useBodyScrollLock();
useHideOthers(contentRef);
</script>

<template>
  <MenuContentImpl
    v-bind="forwardedProps"
    :ref="(comp: any) => { contentRef = comp?.$el ?? null }"
    :trap-focus="menuCtx.open.value"
    :disable-outside-pointer-events="menuCtx.open.value"
    @close-auto-focus="emit('closeAutoFocus', $event)"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
    @focus-outside.prevent="emit('focusOutside', $event)"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="() => { menuCtx.onOpenChange(false); emit('dismiss') }"
    @entry-focus="emit('entryFocus', $event)"
    @open-auto-focus="emit('openAutoFocus', $event)"
  >
    <slot />
  </MenuContentImpl>
</template>
