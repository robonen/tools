<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A low-level building block that detects when the user interacts away from its
 * content — pressing Escape, clicking/pointing outside, or moving focus out — and
 * emits a `dismiss` event so the consumer can close the layer. Layers are tracked
 * in a global stack so only the topmost one responds, letting dialogs, popovers,
 * menus, and tooltips nest correctly. Use it to wrap any transient overlay whose
 * lifecycle you want driven by outside-interaction; it renders no UI of its own.
 */
export interface DismissableLayerProps extends PrimitiveProps {
  /**
   * When enabled, outside pointer events are blocked — the rest of the
   * document becomes `pointer-events: none`, and the layer gains
   * `pointer-events: auto` so it is still interactive.
   * @default false
   */
  disableOutsidePointerEvents?: boolean;
}

export interface DismissableLayerEmits {
  /** Escape key pressed while this layer is topmost. Call `event.preventDefault()` to suppress dismiss. */
  escapeKeyDown: [event: KeyboardEvent];
  /** Pointer down outside this layer. Preventable. */
  pointerDownOutside: [event: PointerEvent | MouseEvent];
  /** Focus moved outside this layer. Preventable. */
  focusOutside: [event: FocusEvent];
  /** Either pointer-outside or focus-outside. Preventable. */
  interactOutside: [event: PointerEvent | MouseEvent | FocusEvent];
  /** Fired after a non-prevented outside interaction or escape. */
  dismiss: [];
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { onBeforeUnmount, onMounted, watchPostEffect } from 'vue';
import { dismissableLayerStack } from './stack';
import { useClickOutside, useEscapeKey, useEventListener, useForwardExpose } from '@robonen/vue';

const { disableOutsidePointerEvents = false, as = 'div' } = defineProps<DismissableLayerProps>();
const emit = defineEmits<DismissableLayerEmits>();

const { forwardRef, currentElement: nodeRef } = useForwardExpose();

const layer = { el: null as unknown as HTMLElement, disableOutsidePointerEvents: false };

watchPostEffect(() => {
  layer.disableOutsidePointerEvents = disableOutsidePointerEvents;
});

onMounted(() => {
  if (!nodeRef.value) return;
  layer.el = nodeRef.value;
  dismissableLayerStack.push(layer);
});

onBeforeUnmount(() => {
  dismissableLayerStack.remove(layer);
});

// `focusin` is non-cancelable (and synthetic pointer events may be too), so the
// native `defaultPrevented` flag can never flip — track prevention via a patched
// `preventDefault` instead, keeping the "Preventable." emit contract honest.
function emitPreventable<E extends PointerEvent | MouseEvent | FocusEvent>(
  event: E,
  emitEvent: (event: E) => void,
): boolean {
  let prevented = false;
  const original = event.preventDefault;
  event.preventDefault = () => {
    prevented = true;
    original.call(event);
  };
  emitEvent(event);
  event.preventDefault = original;
  return prevented || event.defaultPrevented;
}

useEscapeKey((event) => {
  if (!dismissableLayerStack.isTopmost(layer)) return;
  emit('escapeKeyDown', event);
  if (!event.defaultPrevented) emit('dismiss');
});

useClickOutside(nodeRef, (event) => {
  if (!dismissableLayerStack.isTopmost(layer)) return;
  // Emit `interactOutside` first so consumers can cancel before the specific event fires.
  if (emitPreventable(event, e => emit('interactOutside', e))) return;
  if (emitPreventable(event, e => emit('pointerDownOutside', e))) return;
  emit('dismiss');
});

// Focus outside detection — fires when focus leaves this layer to an element
// outside it. We use the `focusin` event at document level.
useEventListener(document, 'focusin', (event: FocusEvent) => {
  const el = nodeRef.value;
  const target = event.target as Node | null;
  if (!el || !target) return;
  if (el === target || el.contains(target)) return;
  if (!dismissableLayerStack.isTopmost(layer)) return;

  if (emitPreventable(event, e => emit('interactOutside', e))) return;
  if (emitPreventable(event, e => emit('focusOutside', e))) return;
  emit('dismiss');
});

// When this layer disables outside pointer events, the body gets a data
// attribute so consumers can style `[data-dismissable-blocking] *:not([data-dismissable-layer]) { pointer-events: none }`.
// We toggle via a style element approach for robustness.
// `disableOutsidePointerEvents` is a reactive prop destructure — reading it
// inside `watchPostEffect` already registers the dependency, no need for a
// computed wrapper.

watchPostEffect((onCleanup) => {
  if (!disableOutsidePointerEvents) return;
  if (typeof document === 'undefined') return;

  const original = document.body.style.pointerEvents;
  document.body.style.pointerEvents = 'none';
  document.body.dataset['dismissableBlocking'] = 'true';

  onCleanup(() => {
    // Only clear if no other disabling layer remains
    if (!dismissableLayerStack.anyDisabling()) {
      document.body.style.pointerEvents = original;
      delete document.body.dataset['dismissableBlocking'];
    }
  });
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-dismissable-layer="true"
    :style="disableOutsidePointerEvents ? { pointerEvents: 'auto' } : undefined"
  >
    <slot />
  </Primitive>
</template>
