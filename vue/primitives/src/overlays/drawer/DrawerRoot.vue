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
import { useEventListener, useStyleTag } from '@robonen/vue';
import { isClient } from '@robonen/platform/multi';
import { DialogRoot } from '../dialog';
import { provideDrawerRootContext } from './context';
import { useDrawer } from './controls';
import { CLOSE_THRESHOLD, SCROLL_LOCK_TIMEOUT, TRANSITIONS } from './constants';
import { DRAWER_STYLES, DRAWER_STYLE_ID, registerDrawerCssProperties } from './style';

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
  snapToSequentialPoints: false,
});

const emit = defineEmits<DrawerRootEmits>();

// Inject the critical drawer CSS once (reference-counted across every drawer).
useStyleTag(DRAWER_STYLES, { id: DRAWER_STYLE_ID });

if (isClient)
  registerDrawerCssProperties();

const fadeFromIndex = computed(() => props.fadeFromIndex ?? (props.snapPoints && props.snapPoints.length - 1));

// `isOpen` is the single source of truth for the open state. It's seeded from the
// controlled `open` prop (or `defaultOpen`), kept in sync with the prop while
// controlled, and is the ref the engine and the underlying Dialog both read.
const isOpen = ref<boolean>(props.open ?? props.defaultOpen);

watch(() => props.open, (value) => {
  if (value !== undefined)
    isOpen.value = value;
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

const { modal, drawerRef, pendingReason, notifySettled, hasSnapPoints } = provideDrawerRootContext(
  useDrawer({
    ...emitHandlers,
    ...toRefs(props),
    activeSnapPoint,
    fadeFromIndex,
    open: isOpen,
  }),
);

// `animationEnd` fires on the drawer element's own transitionend/animationend
// (so dynamic settle durations and consumer-tuned animations report honestly),
// with a fixed-duration timeout kept as an upper-bound fallback for
// reduced-motion and animation-less environments. The listener rides the
// reactive `drawerRef`, so it (re)attaches whenever the content (re)mounts;
// `pendingAnimationEnd` gates it to the transition armed by the open flip.
let pendingAnimationEnd: boolean | null = null;
let animationEndTimer: ReturnType<typeof setTimeout> | undefined;

function fireAnimationEnd() {
  if (pendingAnimationEnd === null)
    return;

  const open = pendingAnimationEnd;

  pendingAnimationEnd = null;
  clearTimeout(animationEndTimer);
  // Advance the engine's lifecycle phase first, so `animationEnd` observers see
  // the settled state (e.g. the snap point already reset after a close).
  notifySettled();
  emit('animationEnd', open);
}

useEventListener(drawerRef, ['transitionend', 'animationend'], (event) => {
  // Only the drawer's own settle counts — ignore bubbled child transitions.
  if (event.target !== event.currentTarget)
    return;

  if (event.type === 'transitionend') {
    // Transform transitions signal a settle only for snap-point drawers; the
    // keyframe-driven enter/exit of plain drawers also sees transform
    // transitions from other sources (a nested child writing to this element,
    // a drag settle) that must not consume an armed flip.
    if (!hasSnapPoints.value || (event as TransitionEvent).propertyName !== 'transform')
      return;
  }
  // Only the stylesheet's slide keyframes mark a settle; consumer keyframes on
  // the content fall through to the fallback timeout instead.
  else if (!(event as AnimationEvent).animationName.startsWith('slide')) {
    return;
  }

  fireAnimationEnd();
});

// Every change to `isOpen` (from any source) notifies the consumer's `v-model`
// once — tagged with the reason armed by whichever part caused the flip — and
// arms `animationEnd`. Close-specific effects (`close`, snap reset) live in the
// engine's own watch on the same ref.
watch(isOpen, (o, _prev, onCleanup) => {
  const reason = pendingReason.current;

  pendingReason.current = undefined;
  emit('update:open', o, reason ? { reason } : undefined);

  pendingAnimationEnd = o;
  animationEndTimer = setTimeout(fireAnimationEnd, TRANSITIONS.DURATION * 1000);
  // Runs before the next flip re-arms, and on unmount — the fallback never
  // outlives the transition it was armed for.
  onCleanup(() => clearTimeout(animationEndTimer));
});

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
