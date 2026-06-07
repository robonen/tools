<script lang="ts">
import type { TooltipContentImplEmits, TooltipContentImplProps } from './TooltipContentImpl.vue';

export interface TooltipContentProps extends TooltipContentImplProps {
  /** Keep mounted for CSS exit animations. */
  forceMount?: boolean;
}

export type TooltipContentEmits = TooltipContentImplEmits;
</script>

<script setup lang="ts">
import { Presence } from '../presence';
import TooltipContentImpl from './TooltipContentImpl.vue';
import { useTooltipContext } from './context';

const { forceMount = false, ...contentProps } = defineProps<TooltipContentProps>();
const emit = defineEmits<TooltipContentEmits>();

const ctx = useTooltipContext();
</script>

<template>
  <Presence :present="ctx.open.value" :force-mount="forceMount">
    <TooltipContentImpl
      v-bind="contentProps"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
    >
      <slot />
    </TooltipContentImpl>
  </Presence>
</template>
