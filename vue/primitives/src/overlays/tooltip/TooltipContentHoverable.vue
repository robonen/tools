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
import { useForwardExpose, useForwardProps } from '@robonen/vue';
import { useGraceArea } from '../../internal/utils/useGraceArea';
import { useTooltipContext } from './context';

const props = defineProps<TooltipContentHoverableProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
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
    v-bind="forwardedProps"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
  >
    <slot />
  </TooltipContentImpl>
</template>
