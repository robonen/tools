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
import { onScopeDispose, useTemplateRef, watch, watchPostEffect } from 'vue';
import { onLongPress, useStateMachine } from '@robonen/vue';
import { injectDrawerRootContext } from './context';

const { preventCycle = false } = defineProps<DrawerHandleProps>();

const LONG_HANDLE_PRESS_TIMEOUT = 250;
const DOUBLE_TAP_TIMEOUT = 120;

const { onPress, onDrag, onCancel, handleRef, handleOnly, isOpen, snapPoints, activeSnapPoint, isDragging, isAllowedToDrag, dismissible, closeDrawer }
  = injectDrawerRootContext();

// Mirror the element into the shared context ref. A local template ref + watch
// is used instead of an inline function `:ref` because the inline form can't
// reliably close over the destructured context binding under `<script setup>`.
const handleElement = useTemplateRef('handleElement');

watchPostEffect(() => {
  handleRef.value = handleElement.value;
});

let cycleTimer: ReturnType<typeof setTimeout> | undefined;

// Tap-to-cycle as an explicit machine: a tap schedules the cycle after the
// double-tap window, a long hold suppresses it, and a second press inside the
// window cancels the pending cycle — so a double-tap cycles once, never twice.
const tap = useStateMachine({
  initial: 'idle',
  states: {
    idle: { on: { PRESS: 'pressed', TAP: 'tapPending' } },
    pressed: { on: { LONG_PRESS: 'suppressed', DRAG: 'suppressed', TAP: 'tapPending', CANCEL: 'idle' } },
    suppressed: { on: { TAP: 'idle', PRESS: 'pressed', CANCEL: 'idle' } },
    tapPending: {
      entry: () => {
        cycleTimer = setTimeout(fireCycleElapsed, DOUBLE_TAP_TIMEOUT);
      },
      exit: () => clearTimeout(cycleTimer),
      on: {
        ELAPSED: { target: 'idle', action: cycleSnapPoints },
        PRESS: 'pressed',
        // A long-press timer armed before the release can still outrace the
        // pending cycle — treat it as suppression, like the release-time flag
        // check of the pre-machine code did.
        LONG_PRESS: 'suppressed',
        DRAG: 'suppressed',
        CANCEL: 'idle',
      },
    },
  },
});

// The exit hook covers every transition; this covers unmount mid-window.
onScopeDispose(() => clearTimeout(cycleTimer));

// A gesture that actually engaged the drawer must never read as a tap: pointer
// capture keeps the release's click on the handle, and 120ms later the drag is
// long over (isDragging is false again), so only a latch armed DURING the
// press can tell a short drag apart from a tap.
watch(isAllowedToDrag, (dragging) => {
  if (dragging)
    tap.send('DRAG');
});

// Annotated `: void` so the machine config can reference it without a type cycle.
function fireCycleElapsed(): void {
  tap.send('ELAPSED');
}

// A long hold suppresses the tap-to-cycle. `distanceThreshold: false` keeps the
// original semantics: the hold counts even while the pointer drags the drawer.
onLongPress(handleElement, () => {
  tap.send('LONG_PRESS');
}, { delay: LONG_HANDLE_PRESS_TIMEOUT, distanceThreshold: false });

function cycleSnapPoints() {
  // Don't treat an accidental tap during a resize as a cycle.
  if (isDragging.value || preventCycle)
    return;

  if (!snapPoints.value || snapPoints.value.length === 0) {
    if (dismissible.value)
      closeDrawer('handle-press');

    return;
  }

  const isLastSnapPoint = activeSnapPoint.value === snapPoints.value[snapPoints.value.length - 1];

  if (isLastSnapPoint && dismissible.value) {
    closeDrawer('handle-press');
    return;
  }

  const currentSnapIndex = snapPoints.value.indexOf(activeSnapPoint.value);

  if (currentSnapIndex === -1)
    return; // activeSnapPoint not in snapPoints

  const nextSnapPointIndex = isLastSnapPoint ? 0 : currentSnapIndex + 1;
  activeSnapPoint.value = snapPoints.value[nextSnapPointIndex];
}

function handleClick() {
  tap.send('TAP');
}

function handlePointerDown(event: PointerEvent) {
  tap.send('PRESS');

  // In handleOnly mode the handle is the capture target so moves keep
  // arriving here even when the pointer leaves it.
  if (handleOnly.value)
    onPress(event, handleElement.value ?? undefined);
}

function handlePointerMove(event: PointerEvent) {
  if (handleOnly.value)
    onDrag(event);
}

function handlePointerCancel(event: PointerEvent) {
  tap.send('CANCEL');

  if (handleOnly.value)
    onCancel(event);
}

// Fires after every normal release too (pointer capture sits on the pressed
// element), so it must NOT cancel the tap intent — that would defeat the
// long-press suppression. Only the drag engine cares, and it ignores stale calls.
function handleLostPointerCapture(event: PointerEvent) {
  if (handleOnly.value)
    onCancel(event);
}
</script>

<template>
  <div
    ref="handleElement"
    :data-drawer-visible="isOpen ? 'true' : 'false'"
    data-drawer-handle
    aria-hidden="true"
    @click="handleClick"
    @pointercancel="handlePointerCancel"
    @lostpointercapture="handleLostPointerCapture"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
  >
    <span data-drawer-handle-hitarea aria-hidden="true">
      <slot />
    </span>
  </div>
</template>
