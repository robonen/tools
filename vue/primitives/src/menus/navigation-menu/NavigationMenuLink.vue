<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

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
  /**
   * Fired when the user selects the link (mouse or keyboard). Call
   * `event.preventDefault()` to keep the menu open. The `detail.originalEvent`
   * carries the originating click so consumers can inspect modifier keys etc.
   */
  select: [event: CustomEvent<{ originalEvent: Event }>];
}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { COLLECTION_ITEM_ATTR, EVENT_ROOT_CONTENT_DISMISS, LINK_SELECT_EVENT } from './utils';

const { as = 'a', active = false } = defineProps<NavigationMenuLinkProps>();
const emit = defineEmits<NavigationMenuLinkEmits>();

const { forwardRef } = useForwardExpose();

function handleClick(event: MouseEvent) {
  const currentTarget = event.currentTarget as HTMLElement | null;
  if (!currentTarget) return;
  const linkSelectEvent = new CustomEvent<{ originalEvent: Event }>(LINK_SELECT_EVENT, {
    bubbles: true,
    cancelable: true,
    detail: { originalEvent: event },
  });
  // Browser event handlers run synchronously; listen once for prevention semantics.
  currentTarget.addEventListener(
    LINK_SELECT_EVENT,
    e => emit('select', e as CustomEvent<{ originalEvent: Event }>),
    { once: true },
  );
  currentTarget.dispatchEvent(linkSelectEvent);
  if (!linkSelectEvent.defaultPrevented && !event.metaKey) {
    const rootContentDismissEvent = new CustomEvent(EVENT_ROOT_CONTENT_DISMISS, {
      bubbles: true,
      cancelable: true,
    });
    // Dispatch on the actual clicked target (matches APG/nested-link behavior).
    (event.target ?? currentTarget).dispatchEvent(rootContentDismissEvent);
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
