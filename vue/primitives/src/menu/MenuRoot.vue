<script lang="ts">
import type { Direction } from '../config-provider';

export interface MenuRootProps {
  open?: boolean;
  dir?: Direction;
  modal?: boolean;
}
export interface MenuRootEmits {
  'update:open': [value: boolean];
}
</script>

<script setup lang="ts">
import { shallowRef, toRef } from 'vue';

import { useConfig } from '../config-provider';
import { PopperRoot } from '../popper';
import { provideMenuContext, provideMenuRootContext } from './context';
import { useIsUsingKeyboard } from './useIsUsingKeyboard';

const {
  open = false,
  dir: dirProp,
  modal = true,
} = defineProps<MenuRootProps>();

const emit = defineEmits<MenuRootEmits>();

defineSlots<{ default?: () => unknown }>();

const config = useConfig();
const dirRef = toRef(() => dirProp ?? config.dir.value);
const isUsingKeyboardRef = useIsUsingKeyboard();
const content = shallowRef<HTMLElement | null>(null);
const openRef = toRef(() => open);

provideMenuContext({
  open: openRef,
  onOpenChange: v => emit('update:open', v),
  content,
  onContentChange: (el) => { content.value = el; },
});

provideMenuRootContext({
  onClose: () => emit('update:open', false),
  dir: dirRef,
  isUsingKeyboardRef,
  modal: toRef(() => modal),
});
</script>

<template>
  <PopperRoot>
    <slot />
  </PopperRoot>
</template>
