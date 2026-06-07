<script lang="ts">
import type { PopperContentProps } from '../popper';
import type { PrimitiveProps } from '../primitive';

export interface TooltipContentImplProps extends PrimitiveProps, Pick<
  PopperContentProps,
  | 'side'
  | 'sideOffset'
  | 'sideFlip'
  | 'align'
  | 'alignOffset'
  | 'alignFlip'
  | 'avoidCollisions'
  | 'collisionBoundary'
  | 'collisionPadding'
  | 'arrowPadding'
  | 'sticky'
  | 'hideWhenDetached'
  | 'positionStrategy'
  | 'updatePositionStrategy'
> {
  /**
   * Accessible label for screen readers when the visible content is not descriptive
   * enough (e.g. icon-only). Falls back to the rendered `textContent`.
   */
  ariaLabel?: string;
}

export interface TooltipContentImplEmits {
  /** Escape pressed while this tooltip is topmost. Preventable. */
  escapeKeyDown: [event: KeyboardEvent];
  /** Pointer down outside the tooltip. Preventable. */
  pointerDownOutside: [event: PointerEvent | MouseEvent];
}
</script>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose } from 'vue';
import { DismissableLayer } from '../dismissable-layer';
import { PopperContent } from '../popper';
import { TOOLTIP_OPEN_EVENT } from './utils';
import { VisuallyHidden } from '../visually-hidden';
import { useForwardExpose } from '@robonen/vue';
import { useTooltipContext } from './context';

const {
  side = 'top',
  sideOffset = 0,
  sideFlip = true,
  align = 'center',
  alignOffset = 0,
  alignFlip = true,
  avoidCollisions = true,
  collisionBoundary = [],
  collisionPadding = 0,
  arrowPadding = 0,
  sticky = 'partial',
  hideWhenDetached = false,
  positionStrategy,
  updatePositionStrategy,
  ariaLabel,
  as = 'div',
} = defineProps<TooltipContentImplProps>();

const emit = defineEmits<TooltipContentImplEmits>();

const ctx = useTooltipContext();
const { forwardRef, currentElement } = useForwardExpose();

const computedAriaLabel = computed(() => ariaLabel ?? currentElement.value?.textContent ?? '');

function onDocumentTooltipOpen() {
  ctx.onClose();
}

function onScrollCapture(event: Event) {
  const target = event.target as Node | null;
  if (target && ctx.trigger.value && target.contains(ctx.trigger.value)) ctx.onClose();
}

onMounted(() => {
  if (typeof globalThis === 'undefined') return;
  globalThis.addEventListener('scroll', onScrollCapture, { capture: true });
  document.addEventListener(TOOLTIP_OPEN_EVENT, onDocumentTooltipOpen);
});

onScopeDispose(() => {
  if (typeof globalThis === 'undefined') return;
  globalThis.removeEventListener('scroll', onScrollCapture, { capture: true });
  document.removeEventListener(TOOLTIP_OPEN_EVENT, onDocumentTooltipOpen);
});

function onPointerDownOutside(event: PointerEvent | MouseEvent) {
  if (
    ctx.disableClosingTrigger.value
    && ctx.trigger.value
    && ctx.trigger.value.contains(event.target as Node)
  ) {
    event.preventDefault();
  }
  emit('pointerDownOutside', event);
}
</script>

<template>
  <DismissableLayer
    as="template"
    :disable-outside-pointer-events="false"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="onPointerDownOutside"
    @focus-outside.prevent
    @dismiss="ctx.onClose"
  >
    <PopperContent
      :ref="forwardRef"
      :as="as"
      :side="side"
      :side-offset="sideOffset"
      :side-flip="sideFlip"
      :align="align"
      :align-offset="alignOffset"
      :align-flip="alignFlip"
      :avoid-collisions="avoidCollisions"
      :collision-boundary="collisionBoundary"
      :collision-padding="collisionPadding"
      :arrow-padding="arrowPadding"
      :sticky="sticky"
      :hide-when-detached="hideWhenDetached"
      :position-strategy="positionStrategy"
      :update-position-strategy="updatePositionStrategy"
      :data-state="ctx.stateAttribute.value"
      :style="{
        '--tooltip-content-transform-origin': 'var(--popper-transform-origin)',
        '--tooltip-content-available-width': 'var(--popper-available-width)',
        '--tooltip-content-available-height': 'var(--popper-available-height)',
        '--tooltip-trigger-width': 'var(--popper-anchor-width)',
        '--tooltip-trigger-height': 'var(--popper-anchor-height)',
      }"
    >
      <slot />
      <VisuallyHidden
        :id="ctx.contentId.value"
        role="tooltip"
      >
        {{ computedAriaLabel }}
      </VisuallyHidden>
    </PopperContent>
  </DismissableLayer>
</template>
