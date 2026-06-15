<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * An optional shared container that all `NavigationMenuContent` panels teleport into,
 * positioned beneath the active trigger and sized to the open panel (exposed as CSS
 * variables for animating between panels). Render one inside `NavigationMenuRoot` for
 * a single animated mega-menu surface; omit it to render each content inline.
 */
export interface NavigationMenuViewportProps extends PrimitiveProps {
  /** Keep mounted regardless of open state. */
  forceMount?: boolean;
  /**
   * Alignment of the viewport relative to the active trigger. Applies to the
   * main axis (horizontal orientation) and the cross axis (vertical orientation).
   * @default 'center'
   */
  align?: 'start' | 'center' | 'end';
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';

import { useEventListener, useForwardExpose, useResizeObserver } from '@robonen/vue';
import { Presence } from '../../utilities/presence';
import { clamp } from '@robonen/stdlib';
import { Primitive } from '../../internal/primitive';
import { useNavigationMenuContext } from './context';
import { whenMouse } from './utils';

defineOptions({ inheritAttrs: false });

const { forceMount = false, align = 'center', as = 'div' } = defineProps<NavigationMenuViewportProps>();

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

// Bumped whenever the layout viewport / body / root resizes so the position
// recomputes (getBoundingClientRect isn't reactive on its own).
const repositionTick = ref(0);
function reposition() {
  repositionTick.value++;
}
useEventListener('resize', reposition);
useResizeObserver(currentElement, reposition);

const SCREEN_OFFSET = 10;

// Position based on active trigger, clamped to all four viewport edges. For
// horizontal orientation `align` shifts the main (horizontal) axis; for vertical
// orientation it shifts the cross (vertical) axis so a side-anchored panel can be
// start/center/end aligned against its trigger.
const positionStyle = computed(() => {
  // Touch the tick so resize re-runs the computation.
  void repositionTick.value;
  const viewport = currentElement.value;
  const trigger = menuContext.activeTrigger.value;
  if (!viewport || !trigger || !size.value) return {};

  const triggerRect = trigger.getBoundingClientRect();
  const viewportWidth = size.value.width;
  const viewportHeight = size.value.height;
  const isHorizontal = menuContext.orientation === 'horizontal';

  let left: number;
  let top: number;

  if (isHorizontal) {
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
    top = triggerRect.bottom;
  }
  else {
    // Vertical: open beside the trigger; `align` controls the cross (vertical) axis.
    left = triggerRect.right;
    switch (align) {
      case 'start':
        top = triggerRect.top;
        break;
      case 'end':
        top = triggerRect.bottom - viewportHeight;
        break;
      default:
        top = triggerRect.top + (triggerRect.height / 2) - (viewportHeight / 2);
    }
  }

  const maxLeft = window.innerWidth - viewportWidth - SCREEN_OFFSET;
  const maxTop = window.innerHeight - viewportHeight - SCREEN_OFFSET;
  left = clamp(left, SCREEN_OFFSET, Math.max(SCREEN_OFFSET, maxLeft));
  top = clamp(top, SCREEN_OFFSET, Math.max(SCREEN_OFFSET, maxTop));

  return {
    '--primitives-navigation-menu-viewport-width': `${viewportWidth}px`,
    '--primitives-navigation-menu-viewport-height': `${viewportHeight}px`,
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
  <Presence v-slot="{ present: isPresent }" :present="present" :force-mount="forceMount || !menuContext.unmountOnHide.value">
    <Primitive
      :ref="forwardRef"
      :as="as"
      :data-state="open ? 'open' : 'closed'"
      :data-orientation="menuContext.orientation"
      data-primitives-navigation-menu-viewport
      :hidden="!isPresent"
      :style="{
        ...positionStyle,
        // Prevent interaction while the panel is animating out.
        pointerEvents: !open && menuContext.isRootMenu ? 'none' : undefined,
      }"
      v-bind="$attrs"
      @pointerenter="handlePointerEnter"
      @pointerleave="handlePointerLeave"
    >
      <slot />
    </Primitive>
  </Presence>
</template>
