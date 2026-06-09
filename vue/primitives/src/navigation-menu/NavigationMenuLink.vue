<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A navigable link, rendered as an `<a>` by default, usable as a top-level menu item
 * or inside a content panel. Selecting it dismisses the open menu (unless the `select`
 * event is prevented) and marks itself with `aria-current` when `active`.
 */
export interface NavigationMenuLinkProps extends PrimitiveProps {
  /** Marks the link as active for styling and aria-current. */
  active?: boolean;
}

export interface NavigationMenuLinkEmits {
  select: [event: CustomEvent];
}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { COLLECTION_ITEM_ATTR, EVENT_ROOT_CONTENT_DISMISS, LINK_SELECT_EVENT } from './utils';

const { as = 'a', active = false } = defineProps<NavigationMenuLinkProps>();
const emit = defineEmits<NavigationMenuLinkEmits>();

const { forwardRef } = useForwardExpose();

function handleClick(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  const linkSelectEvent = new CustomEvent(LINK_SELECT_EVENT, {
    bubbles: true,
    cancelable: true,
  });
  // Browser event handlers run synchronously; listen once for prevention semantics.
  target.addEventListener(LINK_SELECT_EVENT, e => emit('select', e as CustomEvent), { once: true });
  target.dispatchEvent(linkSelectEvent);
  if (!linkSelectEvent.defaultPrevented && !event.metaKey) {
    const rootContentDismissEvent = new CustomEvent(EVENT_ROOT_CONTENT_DISMISS, {
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(rootContentDismissEvent);
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-active="active ? '' : undefined"
    :aria-current="active ? 'page' : undefined"
    :[COLLECTION_ITEM_ATTR]="''"
    @click="handleClick"
  >
    <slot />
  </Primitive>
</template>
