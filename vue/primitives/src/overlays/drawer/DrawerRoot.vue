<script lang="ts">
import type { DrawerRootEmits, DrawerRootProps } from './controls';

export type { DrawerRootEmits, DrawerRootProps } from './controls';

/**
 * A panel that slides in from an edge of the screen and can be dragged to
 * dismiss — the Vaul-style drawer, rebuilt on top of this library's Dialog so it
 * inherits focus trapping, scroll locking, and dismissal behaviour. Compose it
 * from a Trigger, a Portal, an Overlay, and Content (optionally with a Handle,
 * Title, Description, and Close).
 *
 * Bind `v-model:open` to control it, or rely on the Trigger/Close for
 * uncontrolled use. Supports snap points (`v-model:active-snap-point`), four
 * `direction`s, an optional scaled background, and nesting via DrawerRootNested.
 */
</script>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue';
import { useStyleTag } from '@robonen/vue';
import { DialogRoot } from '../dialog';
import { provideDrawerRootContext } from './context';
import { useDrawer } from './controls';
import { CLOSE_THRESHOLD, SCROLL_LOCK_TIMEOUT, TRANSITIONS } from './constants';
import { DRAWER_STYLES, DRAWER_STYLE_ID } from './style';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<DrawerRootProps>(), {
  open: undefined,
  defaultOpen: false,
  fixed: undefined,
  dismissible: true,
  activeSnapPoint: undefined,
  snapPoints: undefined,
  shouldScaleBackground: undefined,
  setBackgroundColorOnScale: true,
  closeThreshold: CLOSE_THRESHOLD,
  fadeFromIndex: undefined,
  nested: false,
  modal: true,
  scrollLockTimeout: SCROLL_LOCK_TIMEOUT,
  direction: 'bottom',
  noBodyStyles: false,
  handleOnly: false,
  preventScrollRestoration: false,
});

const emit = defineEmits<DrawerRootEmits>();

// Inject the critical drawer CSS once (reference-counted across every drawer).
useStyleTag(DRAWER_STYLES, { id: DRAWER_STYLE_ID });

const fadeFromIndex = computed(() => props.fadeFromIndex ?? (props.snapPoints && props.snapPoints.length - 1));

// `isOpen` is the single source of truth for the open state. It's seeded from the
// controlled `open` prop (or `defaultOpen`), kept in sync with the prop while
// controlled, and is the ref the engine and the underlying Dialog both read.
const isOpen = ref<boolean>(props.open ?? props.defaultOpen);

watch(() => props.open, (value) => {
  if (value !== undefined)
    isOpen.value = value;
});

// Every change to `isOpen` (from any source) notifies the consumer's `v-model`
// once and schedules `animationEnd`. Close-specific effects (`close`, snap reset)
// live in the engine's own watch on the same ref.
watch(isOpen, (o) => {
  emit('update:open', o);
  setTimeout(() => emit('animationEnd', o), TRANSITIONS.DURATION * 1000);
});

const localActiveSnapPoint = ref<number | string | null | undefined>(
  props.activeSnapPoint ?? props.snapPoints?.[0] ?? null,
);
const activeSnapPoint = computed<number | string | null | undefined>({
  get: () => (props.activeSnapPoint !== undefined ? props.activeSnapPoint : localActiveSnapPoint.value),
  set: (value) => {
    if (props.activeSnapPoint === undefined)
      localActiveSnapPoint.value = value;
    if (value !== null && value !== undefined)
      emit('update:activeSnapPoint', value);
  },
});

const emitHandlers = {
  emitDrag: (percentageDragged: number) => emit('drag', percentageDragged),
  emitRelease: (o: boolean) => emit('release', o),
  emitClose: () => emit('close'),
};

const { modal } = provideDrawerRootContext(
  useDrawer({
    ...emitHandlers,
    ...toRefs(props),
    activeSnapPoint,
    fadeFromIndex,
    open: isOpen,
  }),
);

// The Dialog reports its own dismissals (trigger, close button, escape, outside
// click) here; mirror them into `isOpen` and let the watchers do the rest.
function handleOpenChange(o: boolean) {
  isOpen.value = o;
}
</script>

<template>
  <DialogRoot :open="isOpen" :modal="modal" @update:open="handleOpenChange">
    <slot :open="isOpen" />
  </DialogRoot>
</template>
