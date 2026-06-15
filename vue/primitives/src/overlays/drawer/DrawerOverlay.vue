<script lang="ts">
import type { DialogOverlayProps } from '../dialog';

/**
 * The dimming layer behind the drawer. Wraps Dialog's Overlay and exposes the
 * `data-drawer-overlay` hooks so its opacity can fade in step with the drag and
 * with snap points. Only renders for modal drawers.
 */
export interface DrawerOverlayProps extends DialogOverlayProps {}
</script>

<script setup lang="ts">
import { watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { DialogOverlay } from '../dialog';
import { injectDrawerRootContext } from './context';

defineProps<DrawerOverlayProps>();

const { overlayRef, hasSnapPoints, isOpen, shouldFade } = injectDrawerRootContext();
const { forwardRef, currentElement } = useForwardExpose();

watch(currentElement, (el) => {
  overlayRef.value = el as HTMLElement | undefined;
}, { immediate: true, flush: 'post' });
</script>

<template>
  <DialogOverlay
    :ref="forwardRef"
    data-drawer-overlay
    :data-drawer-snap-points="isOpen && hasSnapPoints ? 'true' : 'false'"
    :data-drawer-snap-points-overlay="isOpen && shouldFade ? 'true' : 'false'"
  >
    <slot />
  </DialogOverlay>
</template>
