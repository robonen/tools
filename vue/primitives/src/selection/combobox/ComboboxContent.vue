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
import { useForwardProps } from '@robonen/vue';

const { forceMount = false, ...contentProps } = defineProps<ComboboxContentProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(contentProps);
const emit = defineEmits<ComboboxContentEmits>();
const rootCtx = useComboboxRootContext();
</script>

<template>
  <Presence :present="rootCtx.open.value" :force-mount="forceMount">
    <ComboboxContentImpl
      v-bind="forwardedProps"
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
