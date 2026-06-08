<script setup lang="ts">
import type { MenuContentImplEmits, MenuContentImplProps } from './MenuContentImpl.vue';

import { shallowRef, watchEffect } from 'vue';

import { useBodyScrollLock, useFocusGuard } from '@robonen/vue';
import { useHideOthers } from '../utils/useHideOthers';
import MenuContentImpl from './MenuContentImpl.vue';
import { useMenuContext } from './context';

const props = defineProps<MenuContentImplProps>();
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
    v-bind="props"
    :ref="(comp: any) => { contentRef = comp?.$el ?? null }"
    :trap-focus="menuCtx.open.value"
    :disable-outside-pointer-events="menuCtx.open.value"
    @close-auto-focus="emit('closeAutoFocus', $event)"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
    @focus-outside="emit('focusOutside', $event)"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="emit('dismiss')"
    @entry-focus="emit('entryFocus', $event)"
    @open-auto-focus="emit('openAutoFocus', $event)"
  >
    <slot />
  </MenuContentImpl>
</template>
