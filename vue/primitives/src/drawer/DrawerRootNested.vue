<script lang="ts">
/**
 * A drawer nested inside another drawer. Behaves like DrawerRoot but reports its
 * drag/open state to the parent so the parent visibly recedes as this one opens.
 * Place it inside a parent DrawerRoot's content.
 */
</script>

<script setup lang="ts">
import DrawerRoot from './DrawerRoot.vue';
import type { DrawerRootEmits, DrawerRootProps } from './controls';
import { injectDrawerRootContext } from './context';

const props = defineProps<DrawerRootProps>();
const emit = defineEmits<DrawerRootEmits>();

const { onNestedDrag, onNestedOpenChange, onNestedRelease } = injectDrawerRootContext();

function onClose() {
  onNestedOpenChange(false);
  emit('close');
}

function onDrag(percentageDragged: number) {
  onNestedDrag(percentageDragged);
  emit('drag', percentageDragged);
}

function onRelease(open: boolean) {
  onNestedRelease(open);
  emit('release', open);
}

function onOpenChange(open: boolean) {
  if (open)
    onNestedOpenChange(open);
  emit('update:open', open);
}
</script>

<template>
  <DrawerRoot
    v-bind="props"
    nested
    @close="onClose"
    @drag="onDrag"
    @release="onRelease"
    @update:open="onOpenChange"
    @update:active-snap-point="emit('update:activeSnapPoint', $event)"
    @animation-end="emit('animationEnd', $event)"
  >
    <slot />
  </DrawerRoot>
</template>
