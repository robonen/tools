<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The panel revealed when the collapsible is open. Mounts and unmounts with
 * the open state (via `Presence`), is referenced by the trigger's
 * `aria-controls`, and is hidden from layout and assistive tech while closed.
 *
 * While transitioning it measures its natural size and exposes
 * `--collapsible-content-height` / `--collapsible-content-width` CSS variables
 * so consumers can drive height/width transitions purely from CSS.
 */
export interface CollapsibleContentProps extends PrimitiveProps {

  /** Render the content even when closed (useful for animation control). */
  forceMount?: boolean;
}

/** Emit contract for `CollapsibleContent`. */
export interface CollapsibleContentEmits {
  /**
   * Fired when the browser's find-in-page reveals the content via the
   * `beforematch` event (only possible when the root has `unmountOnHide` set
   * to `false`, which renders closed content with `hidden="until-found"`).
   */
  contentFound: [];
}
</script>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import { Presence } from '../../utilities/presence';
import { Primitive } from '../../internal/primitive';
import { useCollapsibleContext } from './context';
import { useEventListener, useForwardExpose } from '@robonen/vue';

defineOptions({
  inheritAttrs: false,
});

const { as = 'div', forceMount = false } = defineProps<CollapsibleContentProps>();
const emit = defineEmits<CollapsibleContentEmits>();

defineSlots<{
  default?: (props: {
    /** Current open state of the collapsible. */
    open: boolean;
  }) => unknown;
}>();

const { forwardRef, currentElement } = useForwardExpose();
const ctx = useCollapsibleContext();

const presenceRef = useTemplateRef<ComponentPublicInstance & { present: boolean }>('presence');

// Measured natural dimensions of the content, exposed as CSS variables so
// consumers can transition height/width without JS. `shallowRef` because the
// numbers are replaced wholesale.
const width = shallowRef(0);
const height = shallowRef(0);

const isOpen = computed(() => ctx.open.value);

// Suppress the enter/leave animation on the very first frame so a
// `defaultOpen` collapsible does not animate in on mount.
const isMountAnimationPrevented = ref(isOpen.value);
const originalStyle = shallowRef<{ transitionDuration: string; animationName: string }>();

watch(
  () => [isOpen.value, presenceRef.value?.present] as const,
  async () => {
    await nextTick();
    const node = currentElement.value;
    if (!node)
      return;

    // Cache the author-defined styles once so we can restore them later.
    originalStyle.value ||= {
      transitionDuration: node.style.transitionDuration,
      animationName: node.style.animationName,
    };

    // Freeze animations/transitions so the element settles at its full size.
    node.style.transitionDuration = '0s';
    node.style.animationName = 'none';

    const rect = node.getBoundingClientRect();
    height.value = rect.height;
    width.value = rect.width;

    // Restore the original animation setup unless this is the initial mount.
    if (!isMountAnimationPrevented.value) {
      node.style.transitionDuration = originalStyle.value.transitionDuration;
      node.style.animationName = originalStyle.value.animationName;
    }
  },
  { immediate: true },
);

const skipAnimation = computed(() => isMountAnimationPrevented.value && isOpen.value);

const dataState = computed(() => {
  if (skipAnimation.value)
    return undefined;

  return isOpen.value ? 'open' : 'closed';
});

const sizeStyle = computed(() => ({
  '--collapsible-content-height': `${height.value}px`,
  '--collapsible-content-width': `${width.value}px`,
}));

onMounted(() => {
  requestAnimationFrame(() => {
    isMountAnimationPrevented.value = false;
  });
});

// `hidden="until-found"` lets the browser's find-in-page reveal collapsed
// content; when it does it fires `beforematch`, which we use to open the
// collapsible and notify consumers.
useEventListener(currentElement, 'beforematch', () => {
  requestAnimationFrame(() => {
    ctx.onOpen();
    emit('contentFound');
  });
});

// `hidden` reflects the logical open state (not Presence's mounted state) so
// content kept mounted via `forceMount` / `unmountOnHide` is still hidden from
// layout and assistive tech while closed. `until-found` keeps it discoverable
// by the browser's find-in-page when the consumer opted out of unmounting.
const hidden = computed<'' | 'until-found' | undefined>(() => {
  if (isOpen.value)
    return undefined;

  return ctx.unmountOnHide.value ? '' : 'until-found';
});
</script>

<template>
  <Presence
    ref="presence"
    v-slot="{ present }"
    :present="forceMount || ctx.open.value"
    :force-mount="forceMount || !ctx.unmountOnHide.value"
  >
    <Primitive
      v-bind="$attrs"
      :id="ctx.contentId.value"
      :ref="forwardRef"
      :as="as"
      :data-state="dataState"
      :data-disabled="ctx.disabled.value ? '' : undefined"
      :hidden="hidden"
      :style="sizeStyle"
    >
      <slot v-if="ctx.unmountOnHide.value ? present : true" :open="ctx.open.value" />
    </Primitive>
  </Presence>
</template>
