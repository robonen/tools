<script lang="ts">
import type { ComboboxContentImplEmits, ComboboxContentImplProps } from './ComboboxContentImpl.vue';

/**
 * The popup listbox that holds the options. Mounts only while open (via Presence) and
 * positions itself relative to the anchor. Place the Viewport, Items, and Empty inside it.
 */
export interface ComboboxContentProps extends ComboboxContentImplProps {
  /** Keep the content mounted even while closed (for external animation libraries). @default false */
  forceMount?: boolean;
}
export type ComboboxContentEmits = ComboboxContentImplEmits;
</script>

<script setup lang="ts">
import { Presence } from '../../utilities/presence';
import ComboboxContentImpl from './ComboboxContentImpl.vue';
import { useComboboxRootContext } from './context';

const { forceMount = false, ...contentProps } = defineProps<ComboboxContentProps>();
const emit = defineEmits<ComboboxContentEmits>();
const rootCtx = useComboboxRootContext();
</script>

<template>
  <Presence :present="rootCtx.open.value" :force-mount="forceMount">
    <ComboboxContentImpl
      v-bind="contentProps"
      @close-auto-focus="emit('closeAutoFocus', $event)"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
      @interact-outside="emit('interactOutside', $event)"
    >
      <slot />
    </ComboboxContentImpl>
  </Presence>
</template>
