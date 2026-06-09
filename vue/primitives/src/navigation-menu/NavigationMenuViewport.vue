<script lang="ts">
/**
 * An optional shared container that all `NavigationMenuContent` panels teleport into,
 * positioned beneath the active trigger and sized to the open panel (exposed as CSS
 * variables for animating between panels). Render one inside `NavigationMenuRoot` for
 * a single animated mega-menu surface; omit it to render each content inline.
 */
export interface NavigationMenuViewportProps {
  /** Keep mounted regardless of open state. */
  forceMount?: boolean;
  /**
   * Horizontal alignment of the viewport relative to the active trigger.
   * @default 'center'
   */
  align?: 'start' | 'center' | 'end';
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Presence } from '../presence';
import { Primitive } from '../primitive';
import { useNavigationMenuContext } from './context';
import { clamp, whenMouse } from './utils';

defineOptions({ inheritAttrs: false });

const { forceMount = false, align = 'center' } = defineProps<NavigationMenuViewportProps>();

const menuContext = useNavigationMenuContext();
const { forwardRef, currentElement } = useForwardExpose();

const open = computed(() => menuContext.modelValue.value !== '');
const present = computed(() => open.value);

const size = ref<{ width: number; height: number } | undefined>();
const activeContentEl = shallowRef<HTMLElement | undefined>(undefined);

watch(currentElement, (el) => {
  menuContext.onViewportChange(el);
});

// Track which content is currently open and observe its size.
let contentObserver: ResizeObserver | undefined;
function watchOpenContent() {
  contentObserver?.disconnect();
  const root = currentElement.value;
  if (!root) return;
  const openContent = root.querySelector<HTMLElement>('[data-state=open]');
  activeContentEl.value = openContent ?? undefined;
  if (!openContent) return;
  contentObserver = new ResizeObserver(() => {
    size.value = { width: openContent.offsetWidth, height: openContent.offsetHeight };
  });
  contentObserver.observe(openContent);
  size.value = { width: openContent.offsetWidth, height: openContent.offsetHeight };
}

watch(() => menuContext.modelValue.value, () => {
  // Defer to next microtask so the new content has mounted.
  queueMicrotask(watchOpenContent);
});

watch(currentElement, () => {
  if (currentElement.value) watchOpenContent();
});

onScopeDispose(() => {
  contentObserver?.disconnect();
});

// Position based on active trigger, clamped to viewport edges.
const positionStyle = computed(() => {
  const viewport = currentElement.value;
  const trigger = menuContext.activeTrigger.value;
  if (!viewport || !trigger || !size.value) return {};
  const triggerRect = trigger.getBoundingClientRect();
  const viewportWidth = size.value.width;
  let left: number;
  switch (align) {
    case 'start':
      left = triggerRect.left;
      break;
    case 'end':
      left = triggerRect.right - viewportWidth;
      break;
    default:
      left = triggerRect.left + (triggerRect.width / 2) - (viewportWidth / 2);
  }
  const maxLeft = window.innerWidth - viewportWidth - 10;
  left = clamp(left, 10, Math.max(10, maxLeft));
  const top = triggerRect.bottom;
  return {
    '--primitives-navigation-menu-viewport-width': `${size.value.width}px`,
    '--primitives-navigation-menu-viewport-height': `${size.value.height}px`,
    '--primitives-navigation-menu-viewport-left': `${left}px`,
    '--primitives-navigation-menu-viewport-top': `${top}px`,
  };
});

function handlePointerEnter() {
  menuContext.onContentEnter(menuContext.modelValue.value);
}

const handlePointerLeave = whenMouse(() => {
  menuContext.onContentLeave();
});
</script>

<template>
  <Presence :present="present" :force-mount="forceMount || !menuContext.unmountOnHide.value">
    <Primitive
      :ref="forwardRef"
      :data-state="open ? 'open' : 'closed'"
      :data-orientation="menuContext.orientation"
      data-primitives-navigation-menu-viewport
      :style="positionStyle"
      v-bind="$attrs"
      @pointerenter="handlePointerEnter"
      @pointerleave="handlePointerLeave"
    >
      <slot />
    </Primitive>
  </Presence>
</template>
