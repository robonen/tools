<script lang="ts">
import type { DismissableLayerEmits } from '../dismissable-layer';
import type { FocusScopeEmits } from '../focus-scope';
import type { PopperContentProps } from '../popper';
import type { PrimitiveProps } from '../primitive';

/**
 * Internal implementation of the content popup: wires up focus scoping, dismiss-on-outside,
 * Popper positioning, and the screen-reader result announcer. Use ComboboxContent instead.
 */
export interface ComboboxContentImplProps extends PrimitiveProps, /* @vue-ignore */ Partial<PopperContentProps> {
  /** Position strategy. @default 'popper' */
  position?: 'inline' | 'popper';
  /** Block outside pointer events. @default false */
  disableOutsidePointerEvents?: boolean;
}

export interface ComboboxContentImplEmits {
  closeAutoFocus: FocusScopeEmits['unmountAutoFocus'];
  escapeKeyDown: DismissableLayerEmits['escapeKeyDown'];
  pointerDownOutside: DismissableLayerEmits['pointerDownOutside'];
  focusOutside: FocusScopeEmits['unmountAutoFocus'];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, shallowRef, toRef, watchPostEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { DismissableLayer } from '../dismissable-layer';
import { FocusScope } from '../focus-scope';
import { PopperContent } from '../popper';
import { Primitive } from '../primitive';
import { VisuallyHidden } from '../visually-hidden';
import { useHideOthers } from '../utils/useHideOthers';
import { provideComboboxContentContext, useComboboxRootContext } from './context';

const props = defineProps<ComboboxContentImplProps>();
const emit = defineEmits<ComboboxContentImplEmits>();

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useComboboxRootContext();

const viewportElement = shallowRef<HTMLElement | undefined>(undefined);

watchPostEffect(() => rootCtx.onContentChange(currentElement.value));
onBeforeUnmount(() => rootCtx.onContentChange(undefined));

useHideOthers(toRef(() => rootCtx.parentElement.value));

provideComboboxContentContext({
  viewportElement,
  onViewportChange: (el) => { viewportElement.value = el; },
  position: toRef(() => props.position ?? 'popper'),
});

function handleEscape(event: KeyboardEvent) {
  rootCtx.onOpenChange(false);
  emit('escapeKeyDown', event);
}

// Interactions within the anchor (input, trigger, cancel button, padding) must not
// dismiss the popup — e.g. the root focuses the input right after opening, which
// fires a focus-outside from the content layer's perspective.
function handleInteractOutside(event: PointerEvent | MouseEvent | FocusEvent) {
  const target = event.target as Element | null;
  const parent = rootCtx.parentElement.value;
  const input = rootCtx.inputElement.value;
  const trigger = rootCtx.triggerElement.value;
  if (target && (parent?.contains(target) || input?.contains(target) || trigger?.contains(target))) {
    event.preventDefault();
  }
}

function handlePointerDownOutside(event: any) {
  emit('pointerDownOutside', event);
}

function handleFocusOutside(event: any) {
  emit('focusOutside', event);
}

function handleCloseAutoFocus(event: Event) {
  emit('closeAutoFocus', event);
}
</script>

<template>
  <FocusScope
    as="template"
    :loop="false"
    :trapped="false"
    @mount-auto-focus.prevent
    @unmount-auto-focus="handleCloseAutoFocus"
  >
    <DismissableLayer
      as="template"
      :disable-outside-pointer-events="props.disableOutsidePointerEvents ?? false"
      @escape-key-down="handleEscape"
      @interact-outside="handleInteractOutside"
      @pointer-down-outside="handlePointerDownOutside"
      @focus-outside="handleFocusOutside"
      @dismiss="rootCtx.onOpenChange(false)"
    >
      <PopperContent
        v-if="(props.position ?? 'popper') === 'popper'"
        :ref="forwardRef"
        :as="props.as ?? 'div'"
        :side="props.side ?? 'bottom'"
        :side-offset="props.sideOffset ?? 4"
        :align="props.align ?? 'start'"
        :align-offset="props.alignOffset"
        :avoid-collisions="props.avoidCollisions"
        :collision-boundary="props.collisionBoundary"
        :collision-padding="props.collisionPadding"
        :arrow-padding="props.arrowPadding"
        :sticky="props.sticky"
        :hide-when-detached="props.hideWhenDetached"
        :update-position-strategy="props.updatePositionStrategy"
        :id="rootCtx.contentId.value"
        role="listbox"
        :aria-multiselectable="rootCtx.multiple.value || undefined"
        :data-state="rootCtx.open.value ? 'open' : 'closed'"
        data-primitives-combobox-content
      >
        <VisuallyHidden role="status" aria-live="polite" data-primitives-combobox-announce>
          {{ rootCtx.filterState.value.count === 1 ? '1 result available.' : `${rootCtx.filterState.value.count} results available.` }}
        </VisuallyHidden>
        <slot />
      </PopperContent>

      <Primitive
        v-else
        :ref="forwardRef"
        :as="props.as ?? 'div'"
        :id="rootCtx.contentId.value"
        role="listbox"
        :aria-multiselectable="rootCtx.multiple.value || undefined"
        :data-state="rootCtx.open.value ? 'open' : 'closed'"
        data-primitives-combobox-content
      >
        <VisuallyHidden role="status" aria-live="polite" data-primitives-combobox-announce>
          {{ rootCtx.filterState.value.count === 1 ? '1 result available.' : `${rootCtx.filterState.value.count} results available.` }}
        </VisuallyHidden>
        <slot />
      </Primitive>
    </DismissableLayer>
  </FocusScope>
</template>
