<script lang="ts">
import type { DrawerHandleProps } from './controls';

export type { DrawerHandleProps } from './controls';

/**
 * The grab handle at the edge of the drawer. Dragging it always moves the
 * drawer (even when the root is `handleOnly`), and a tap cycles through snap
 * points — or closes a dismissible drawer once past the last one.
 */
</script>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { injectDrawerRootContext } from './context';

const props = withDefaults(defineProps<DrawerHandleProps>(), {
  preventCycle: false,
});

const LONG_HANDLE_PRESS_TIMEOUT = 250;
const DOUBLE_TAP_TIMEOUT = 120;

const { onPress, onDrag, handleRef, handleOnly, isOpen, snapPoints, activeSnapPoint, isDragging, dismissible, closeDrawer }
  = injectDrawerRootContext();

// Mirror the element into the shared context ref. A local template ref + watch
// is used instead of an inline function `:ref` because the inline form can't
// reliably close over the destructured context binding under `<script setup>`.
const handleElement = ref<HTMLElement | undefined>(undefined);
watch(handleElement, (el) => {
  handleRef.value = el;
}, { immediate: true, flush: 'post' });

const closeTimeoutId = ref<number | null>(null);
const shouldCancelInteraction = ref(false);

function handleStartCycle() {
  // Ignore the second tap of a double-tap.
  if (shouldCancelInteraction.value) {
    handleCancelInteraction();
    return;
  }

  globalThis.setTimeout(() => {
    handleCycleSnapPoints();
  }, DOUBLE_TAP_TIMEOUT);
}

function handleCycleSnapPoints() {
  // Don't treat an accidental tap during a resize as a cycle.
  if (isDragging.value || props.preventCycle || shouldCancelInteraction.value) {
    handleCancelInteraction();
    return;
  }

  handleCancelInteraction();

  if (!snapPoints.value || snapPoints.value.length === 0) {
    if (!dismissible.value)
      closeDrawer();

    return;
  }

  const isLastSnapPoint = activeSnapPoint.value === snapPoints.value[snapPoints.value.length - 1];

  if (isLastSnapPoint && dismissible.value) {
    closeDrawer();
    return;
  }

  const currentSnapIndex = snapPoints.value.indexOf(activeSnapPoint.value);

  if (currentSnapIndex === -1)
    return; // activeSnapPoint not in snapPoints

  const nextSnapPointIndex = isLastSnapPoint ? 0 : currentSnapIndex + 1;
  activeSnapPoint.value = snapPoints.value[nextSnapPointIndex];
}

function handleStartInteraction() {
  closeTimeoutId.value = globalThis.setTimeout(() => {
    // A long press cancels the tap-to-cycle.
    shouldCancelInteraction.value = true;
  }, LONG_HANDLE_PRESS_TIMEOUT);
}

function handleCancelInteraction() {
  if (closeTimeoutId.value)
    globalThis.clearTimeout(closeTimeoutId.value);

  shouldCancelInteraction.value = false;
}

function handlePointerDown(event: PointerEvent) {
  if (handleOnly.value)
    onPress(event);
  handleStartInteraction();
}

function handlePointerMove(event: PointerEvent) {
  if (handleOnly.value)
    onDrag(event);
}
</script>

<template>
  <div
    ref="handleElement"
    :data-drawer-visible="isOpen ? 'true' : 'false'"
    data-drawer-handle
    aria-hidden="true"
    @click="handleStartCycle"
    @pointercancel="handleCancelInteraction"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
  >
    <span data-drawer-handle-hitarea aria-hidden="true">
      <slot />
    </span>
  </div>
</template>
