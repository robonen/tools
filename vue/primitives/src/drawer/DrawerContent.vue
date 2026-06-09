<script lang="ts">
import type { DialogContentEmits, DialogContentProps } from '../dialog';

/**
 * The draggable drawer panel. Wraps Dialog's Content (so it keeps focus
 * trapping, scroll locking, and dismissal) and adds the pointer-drag gesture,
 * snap-point positioning, and the `data-drawer-*` hooks the CSS animates.
 * Bring your own size/colour/padding via `class`/`style`.
 */
export interface DrawerContentProps extends DialogContentProps {}

export type DrawerContentEmits = DialogContentEmits;
</script>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { DialogContent } from '../dialog';
import { injectDrawerRootContext } from './context';
import { useScaleBackground } from './useScaleBackground';

defineProps<DrawerContentProps>();
const emit = defineEmits<DrawerContentEmits>();

const {
  isOpen,
  snapPointsOffset,
  hasSnapPoints,
  drawerRef,
  onPress,
  onDrag,
  onRelease,
  modal,
  dismissible,
  keyboardIsOpen,
  direction,
  handleOnly,
} = injectDrawerRootContext();

const { forwardRef, currentElement } = useForwardExpose();

// Track the content element for the drag math (undefined while closed/unmounted).
watch(currentElement, (el) => {
  drawerRef.value = el as HTMLElement | undefined;
}, { immediate: true, flush: 'post' });

useScaleBackground();

const delayedSnapPoints = ref(false);

const snapPointHeight = computed(() => {
  if (snapPointsOffset.value && snapPointsOffset.value.length > 0)
    return `${snapPointsOffset.value[0]}px`;

  return '0';
});

function handlePointerDownOutside(event: Event) {
  if (!modal.value || event.defaultPrevented) {
    event.preventDefault();
    return;
  }

  if (keyboardIsOpen.value)
    keyboardIsOpen.value = false;

  // Let the underlying DismissableLayer close a dismissible modal drawer;
  // otherwise hold it open.
  if (!dismissible.value)
    event.preventDefault();
}

function handleEscapeKeyDown(event: KeyboardEvent) {
  if (!dismissible.value)
    event.preventDefault();
}

function handlePointerDown(event: PointerEvent) {
  if (handleOnly.value)
    return;
  onPress(event);
}

function handlePointerMove(event: PointerEvent) {
  if (handleOnly.value)
    return;
  onDrag(event);
}

watchEffect(() => {
  if (hasSnapPoints.value) {
    globalThis.requestAnimationFrame(() => {
      delayedSnapPoints.value = true;
    });
  }
});
</script>

<template>
  <DialogContent
    :ref="forwardRef"
    data-drawer
    :data-drawer-direction="direction"
    :data-drawer-delayed-snap-points="delayedSnapPoints ? 'true' : 'false'"
    :data-drawer-snap-points="isOpen && hasSnapPoints ? 'true' : 'false'"
    :style="{ '--snap-point-height': snapPointHeight }"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="onRelease"
    @open-auto-focus.prevent
    @pointer-down-outside="handlePointerDownOutside"
    @escape-key-down="handleEscapeKeyDown"
    @close-auto-focus="emit('closeAutoFocus', $event)"
    @focus-outside="emit('focusOutside', $event)"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="emit('dismiss')"
  >
    <slot />
  </DialogContent>
</template>
