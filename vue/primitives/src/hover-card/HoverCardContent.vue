<script lang="ts">
import type { HoverCardContentImplEmits, HoverCardContentImplProps } from './HoverCardContentImpl.vue';

/**
 * The floating panel that holds the previewed content. It is positioned against
 * the trigger and is mounted only while the card is open (gated by `Presence`),
 * unless `forceMount` is set so you can drive enter/exit animations yourself.
 */
export interface HoverCardContentProps extends HoverCardContentImplProps {
  /** Keep mounted for CSS exit animations. */
  forceMount?: boolean;
}

export type HoverCardContentEmits = HoverCardContentImplEmits;
</script>

<script setup lang="ts">
import HoverCardContentImpl from './HoverCardContentImpl.vue';
import { Presence } from '../presence';
import { useHoverCardContext } from './context';

const { forceMount = false, ...contentProps } = defineProps<HoverCardContentProps>();
const emit = defineEmits<HoverCardContentEmits>();
const ctx = useHoverCardContext();
</script>

<template>
  <Presence :present="ctx.open.value" :force-mount="forceMount">
    <HoverCardContentImpl
      v-bind="contentProps"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
      @interact-outside="emit('interactOutside', $event)"
    >
      <slot />
    </HoverCardContentImpl>
  </Presence>
</template>
