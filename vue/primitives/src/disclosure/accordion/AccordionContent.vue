<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The collapsible panel revealed when its item is open. Rendered as an ARIA
 * `region` labelled by its trigger and mounted/unmounted via `Presence` so
 * enter/leave transitions can run (use `forceMount` to keep it mounted for
 * custom animation).
 *
 * While transitioning it measures its natural size and exposes
 * `--accordion-content-height` / `--accordion-content-width` CSS variables so
 * consumers can drive height/width transitions purely from CSS. When the item
 * (or root) sets `unmountOnHide: false`, closed content stays in the DOM with
 * `hidden="until-found"` so the browser's find-in-page can reveal it.
 */
export interface AccordionContentProps extends PrimitiveProps {
  /** Keep content mounted even when closed. */
  forceMount?: boolean;
}

/** Emit contract for `AccordionContent`. */
export interface AccordionContentEmits {
  /**
   * Fired when the browser's find-in-page reveals the content via the
   * `beforematch` event (only possible when the item is kept mounted via
   * `unmountOnHide: false`, which renders closed content with
   * `hidden="until-found"`).
   */
  contentFound: [];
}
</script>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import { useAccordionContext, useAccordionItemContext } from './context';
import { Presence } from '../../utilities/presence';
import { Primitive } from '../../internal/primitive';
import { useEventListener, useForwardExpose } from '@robonen/vue';

defineOptions({
  inheritAttrs: false,
});

const { as = 'div', forceMount = false } = defineProps<AccordionContentProps>();
const emit = defineEmits<AccordionContentEmits>();

defineSlots<{
  default?: (props: {
    /** Current open state of the item. */
    open: boolean;
  }) => unknown;
}>();

const { forwardRef, currentElement } = useForwardExpose();
const ctx = useAccordionContext();
const item = useAccordionItemContext();

const presenceRef = useTemplateRef<ComponentPublicInstance & { present: boolean }>('presence');

// Measured natural dimensions of the content, exposed as CSS variables so
// consumers can transition height/width without JS. `shallowRef` because the
// numbers are replaced wholesale.
const width = shallowRef(0);
const height = shallowRef(0);

const isOpen = computed(() => item.open.value);

// Suppress the enter/leave animation on the very first frame so a panel that
// is open via `defaultValue` does not animate in on mount.
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

const sizeStyle = computed(() => ({
  '--accordion-content-height': `${height.value}px`,
  '--accordion-content-width': `${width.value}px`,
}));

onMounted(() => {
  requestAnimationFrame(() => {
    isMountAnimationPrevented.value = false;
  });
});

// `hidden="until-found"` lets the browser's find-in-page reveal collapsed
// content; when it does it fires `beforematch`, which we use to open the item
// and notify consumers.
useEventListener(currentElement, 'beforematch', () => {
  requestAnimationFrame(() => {
    ctx.open(item.value);
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

  return item.unmountOnHide.value ? '' : 'until-found';
});
</script>

<template>
  <Presence
    ref="presence"
    v-slot="{ present }"
    :present="forceMount || item.open.value"
    :force-mount="forceMount || !item.unmountOnHide.value"
  >
    <Primitive
      v-bind="$attrs"
      :ref="forwardRef"
      :as="as"
      role="region"
      :id="item.contentId.value"
      :aria-labelledby="item.triggerId.value"
      :data-state="item.open.value ? 'open' : 'closed'"
      :data-disabled="item.disabled.value ? '' : undefined"
      :data-orientation="ctx.orientation.value"
      :hidden="hidden"
      :style="sizeStyle"
    >
      <slot v-if="item.unmountOnHide.value ? present : true" :open="item.open.value" />
    </Primitive>
  </Presence>
</template>
