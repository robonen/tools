<script lang="ts">
import type { TooltipContentImplEmits, TooltipContentImplProps } from './TooltipContentImpl.vue';

/**
 * The floating panel that holds the tooltip's label, positioned relative to the
 * Trigger. It mounts only while the tooltip is open (driven by `Presence`); set
 * `forceMount` to keep it mounted for CSS exit animations. Side, alignment, and
 * collision behavior are forwarded to the underlying Popper content.
 */
export interface TooltipContentProps extends TooltipContentImplProps {
  /** Keep mounted for CSS exit animations. */
  forceMount?: boolean;
}

export type TooltipContentEmits = TooltipContentImplEmits;
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Presence } from '../../utilities/presence';
import TooltipContentHoverable from './TooltipContentHoverable.vue';
import TooltipContentImpl from './TooltipContentImpl.vue';
import { useTooltipContext } from './context';

const { forceMount = false, ...contentProps } = defineProps<TooltipContentProps>();
const emit = defineEmits<TooltipContentEmits>();

const ctx = useTooltipContext();

// When hoverable content is enabled (the default), wrap the impl in the
// grace-area variant so the pointer can travel onto the content without it
// closing; otherwise mount the impl directly.
const contentComponent = computed(() =>
  ctx.disableHoverableContent.value ? TooltipContentImpl : TooltipContentHoverable,
);
</script>

<template>
  <Presence :present="ctx.open.value" :force-mount="forceMount">
    <component
      :is="contentComponent"
      v-bind="contentProps"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
    >
      <slot />
    </component>
  </Presence>
</template>
