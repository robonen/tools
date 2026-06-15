<script lang="ts">
import type { TooltipContentImplEmits, TooltipContentImplProps } from './TooltipContentImpl.vue';

/**
 * Hoverable variant of the tooltip Content: keeps the tooltip open while the
 * pointer travels through the "safe area" between the trigger and the content,
 * so the content can itself be hovered without flickering closed. Selected by
 * `TooltipContent` whenever `disableHoverableContent` is `false` (the default).
 * Not part of the public anatomy — use `TooltipContent`.
 */
export type TooltipContentHoverableProps = TooltipContentImplProps;

export type TooltipContentHoverableEmits = TooltipContentImplEmits;
</script>

<script setup lang="ts">
import { watchEffect } from 'vue';
import TooltipContentImpl from './TooltipContentImpl.vue';
import { useForwardExpose } from '@robonen/vue';
import { useGraceArea } from '../../internal/utils/useGraceArea';
import { useTooltipContext } from './context';

const props = defineProps<TooltipContentHoverableProps>();
const emit = defineEmits<TooltipContentHoverableEmits>();

const ctx = useTooltipContext();
const { forwardRef, currentElement } = useForwardExpose();

const { isPointerInTransit, onPointerExit } = useGraceArea(ctx.trigger, currentElement);

watchEffect(() => {
  ctx.isPointerInTransitRef.value = isPointerInTransit.value;
});

onPointerExit(() => ctx.onClose());
</script>

<template>
  <TooltipContentImpl
    :ref="forwardRef"
    v-bind="props"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
  >
    <slot />
  </TooltipContentImpl>
</template>
