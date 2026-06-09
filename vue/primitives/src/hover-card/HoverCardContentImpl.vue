<script lang="ts">
import type { PopperContentProps } from '../popper';
import type { PrimitiveProps } from '../primitive';

/**
 * Internal implementation of the hover card panel: it wires up Popper
 * positioning, the dismissable layer, the trigger-to-content grace area, and
 * selection handling. Rendered by `HoverCardContent`; not exported for direct
 * use.
 */
export interface HoverCardContentImplProps extends PrimitiveProps, Pick<
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
> {}

export interface HoverCardContentImplEmits {
  escapeKeyDown: [event: KeyboardEvent];
  pointerDownOutside: [event: PointerEvent | MouseEvent];
  focusOutside: [event: FocusEvent];
  interactOutside: [event: Event];
}
</script>

<script setup lang="ts">
import { nextTick, onMounted, onScopeDispose, ref, watchEffect } from 'vue';
import { DismissableLayer } from '../dismissable-layer';
import { PopperContent } from '../popper';
import { excludeTouch } from './utils';
import { useForwardExpose } from '@robonen/vue';
import { useGraceArea } from '../utils/useGraceArea';
import { useHoverCardContext } from './context';

const {
  side = 'bottom',
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
  as = 'div',
} = defineProps<HoverCardContentImplProps>();

const emit = defineEmits<HoverCardContentImplEmits>();

const ctx = useHoverCardContext();
const { forwardRef, currentElement } = useForwardExpose();

const { isPointerInTransit, onPointerExit } = useGraceArea(ctx.trigger, currentElement);

watchEffect(() => {
  ctx.isPointerInTransit.value = isPointerInTransit.value;
});

onPointerExit(() => ctx.onClose());

const containSelection = ref(false);
let originalUserSelect: string | undefined;
let originalWebkitUserSelect: string | undefined;

watchEffect((cleanup) => {
  if (!containSelection.value) return;
  const body = document.body;
  originalUserSelect = body.style.userSelect;
  originalWebkitUserSelect = body.style.webkitUserSelect;
  body.style.userSelect = 'none';
  body.style.webkitUserSelect = 'none';
  cleanup(() => {
    body.style.userSelect = originalUserSelect ?? '';
    body.style.webkitUserSelect = originalWebkitUserSelect ?? '';
  });
});

function onPointerUp() {
  containSelection.value = false;
  ctx.isPointerDownOnContent.value = false;
  nextTick(() => {
    const hasSelection = document.getSelection()?.toString() !== '';
    if (hasSelection) ctx.hasSelection.value = true;
  });
}

function onScrollCapture(event: Event) {
  const target = event.target as Node | null;
  if (target && ctx.trigger.value && target.contains(ctx.trigger.value)) ctx.onDismiss();
}

onMounted(() => {
  document.addEventListener('pointerup', onPointerUp);
  globalThis.addEventListener('scroll', onScrollCapture, { capture: true });
});

onScopeDispose(() => {
  document.removeEventListener('pointerup', onPointerUp);
  globalThis.removeEventListener('scroll', onScrollCapture, { capture: true });
  ctx.hasSelection.value = false;
  ctx.isPointerDownOnContent.value = false;
});

function onContentPointerDown(event: PointerEvent) {
  if ((event.currentTarget as HTMLElement).contains(event.target as HTMLElement)) {
    containSelection.value = true;
  }
  ctx.hasSelection.value = false;
  ctx.isPointerDownOnContent.value = true;
}

function onContentPointerEnter(event: PointerEvent) {
  excludeTouch(() => ctx.onOpen())(event);
}
</script>

<template>
  <DismissableLayer
    as="template"
    :disable-outside-pointer-events="false"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
    @focus-outside.prevent="emit('focusOutside', $event)"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="ctx.onDismiss"
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
      :data-state="ctx.open.value ? 'open' : 'closed'"
      :style="{
        'user-select': containSelection ? 'text' : undefined,
        '-webkit-user-select': containSelection ? 'text' : undefined,
        '--hover-card-content-transform-origin': 'var(--popper-transform-origin)',
        '--hover-card-content-available-width': 'var(--popper-available-width)',
        '--hover-card-content-available-height': 'var(--popper-available-height)',
        '--hover-card-trigger-width': 'var(--popper-anchor-width)',
        '--hover-card-trigger-height': 'var(--popper-anchor-height)',
      }"
      @pointerenter="onContentPointerEnter"
      @pointerdown="onContentPointerDown"
    >
      <slot />
    </PopperContent>
  </DismissableLayer>
</template>
