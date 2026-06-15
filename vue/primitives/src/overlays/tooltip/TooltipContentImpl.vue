<script lang="ts">
import type { PopperContentProps } from '../popper';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Internal implementation behind `TooltipContent`: renders the Popper content
 * inside a dismissable layer, exposes the positioning props, mirrors the popper
 * CSS variables, and adds the hidden `role="tooltip"` accessible label. Use
 * `TooltipContent` instead — this is not part of the public anatomy.
 */
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
import { computed } from 'vue';
import { DismissableLayer } from '../../utilities/dismissable-layer';
import { PopperContent } from '../popper';
import { TOOLTIP_OPEN_EVENT } from './utils';
import { VisuallyHidden } from '../../utilities/visually-hidden';
import { useEventListener, useForwardExpose } from '@robonen/vue';
import { useTooltipContext } from './context';

const props = defineProps<TooltipContentImplProps>();

const emit = defineEmits<TooltipContentImplEmits>();

const ctx = useTooltipContext();
const { forwardRef, currentElement } = useForwardExpose();

// Merge order (highest priority first): explicit per-Content props →
// Provider-level `content` defaults → hard defaults. `undefined` entries in a
// higher-priority layer fall through to the next, mirroring reka's `defu`.
const popperProps = computed(() => {
  const defaults = ctx.contentDefaults.value;
  const pick = <K extends keyof TooltipContentImplProps>(
    key: K,
    fallback: NonNullable<TooltipContentImplProps[K]>,
  ): NonNullable<TooltipContentImplProps[K]> =>
    (props[key] ?? defaults?.[key] ?? fallback) as NonNullable<TooltipContentImplProps[K]>;

  return {
    side: pick('side', 'top'),
    sideOffset: pick('sideOffset', 0),
    sideFlip: pick('sideFlip', true),
    align: pick('align', 'center'),
    alignOffset: pick('alignOffset', 0),
    alignFlip: pick('alignFlip', true),
    avoidCollisions: pick('avoidCollisions', true),
    collisionBoundary: props.collisionBoundary ?? defaults?.collisionBoundary ?? [],
    collisionPadding: pick('collisionPadding', 0),
    arrowPadding: pick('arrowPadding', 0),
    sticky: pick('sticky', 'partial'),
    hideWhenDetached: pick('hideWhenDetached', false),
    positionStrategy: props.positionStrategy ?? defaults?.positionStrategy,
    updatePositionStrategy: props.updatePositionStrategy ?? defaults?.updatePositionStrategy,
  };
});

const as = computed(() => props.as ?? ctx.contentDefaults.value?.as ?? 'div');

const computedAriaLabel = computed(() =>
  props.ariaLabel ?? ctx.contentDefaults.value?.ariaLabel ?? currentElement.value?.textContent ?? '',
);

function onDocumentTooltipOpen() {
  ctx.onClose();
}

function onScrollCapture(event: Event) {
  const target = event.target as Node | null;
  if (target && ctx.trigger.value && target.contains(ctx.trigger.value)) ctx.onClose();
}

// Auto-removed on scope dispose. SSR-safe: the window default no-ops without a
// `window`, and the `document` getter resolves to `undefined` on the server.
// `capture`/`passive` preserved.
useEventListener('scroll', onScrollCapture, { capture: true, passive: true });
useEventListener(() => globalThis.document, TOOLTIP_OPEN_EVENT, onDocumentTooltipOpen);

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
      v-bind="popperProps"
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
