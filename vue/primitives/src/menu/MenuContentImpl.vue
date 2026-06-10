<script lang="ts">
import type { PopperContentProps } from '../popper';
import type { PrimitiveProps } from '../primitive';

/**
 * Internal shared implementation behind MenuContent and MenuSubContent. It
 * composes Popper positioning, FocusScope, DismissableLayer, and a vertical
 * RovingFocusGroup, and adds typeahead search and pointer grace-area handling.
 * Not meant to be used directly — render MenuContent (or MenuSubContent) instead.
 */
export interface MenuContentImplProps extends PrimitiveProps, Pick<PopperContentProps,
  | 'side' | 'sideOffset' | 'sideFlip' | 'align' | 'alignOffset' | 'alignFlip'
  | 'avoidCollisions' | 'collisionBoundary' | 'collisionPadding' | 'arrowPadding'
  | 'sticky' | 'hideWhenDetached' | 'positionStrategy' | 'updatePositionStrategy'
  | 'reference' | 'prioritizePosition'
> {
  /** Whether keyboard focus should wrap from the last item back to the first (and vice versa). */
  loop?: boolean;
  /** Whether to trap focus inside the content while open (used for modal menus). */
  trapFocus?: boolean;
  /** Whether to block pointer events on everything outside the content (used for modal menus). */
  disableOutsidePointerEvents?: boolean;
}

export interface MenuContentImplEmits {
  closeAutoFocus: [event: Event];
  escapeKeyDown: [event: KeyboardEvent];
  pointerDownOutside: [event: PointerEvent | MouseEvent];
  focusOutside: [event: FocusEvent];
  interactOutside: [event: PointerEvent | MouseEvent | FocusEvent];
  dismiss: [];
  entryFocus: [event: Event];
  openAutoFocus: [event: Event];
}
</script>

<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';

import { DismissableLayer } from '../dismissable-layer';
import { FocusScope } from '../focus-scope';
import { PopperContent } from '../popper';
import { RovingFocusGroup } from '../roving-focus';
import { useForwardExpose } from '@robonen/vue';
import { provideMenuContentContext, useMenuContext, useMenuRootContext } from './context';
import { FIRST_LAST_KEYS, LAST_KEYS, focusFirst, getNextMatch, getOpenState, isPointerInGraceArea } from './utils';

const {
  loop = false,
  trapFocus = false,
  disableOutsidePointerEvents = false,
  side = 'bottom',
  sideOffset = 0,
  align = 'start',
  as = 'div',
  ...popperProps
} = defineProps<MenuContentImplProps>();

const emit = defineEmits<MenuContentImplEmits>();

const menuCtx = useMenuContext();
const rootCtx = useMenuRootContext();
const { forwardRef, currentElement: contentElement } = useForwardExpose();

const searchRef = ref('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;

function clearSearch() {
  clearTimeout(searchTimer);
  searchRef.value = '';
}

onScopeDispose(clearSearch);

const pointerGraceTimerRef = ref<number>(0);
const pointerGraceIntentRef = ref<{ area: Array<{ x: number; y: number }>; side: 'left' | 'right' } | null>(null);

provideMenuContentContext({
  onItemEnter: (event) => {
    if (pointerGraceIntentRef.value) {
      return isPointerInGraceArea(event, pointerGraceIntentRef.value.area);
    }
    return false;
  },
  onItemLeave: (_event) => {
    contentElement.value?.focus({ preventScroll: true });
  },
  onTriggerLeave: (event) => {
    if (pointerGraceIntentRef.value) {
      return isPointerInGraceArea(event, pointerGraceIntentRef.value.area);
    }
    return false;
  },
  searchRef,
  pointerGraceTimerRef,
  onPointerGraceIntentChange: (intent) => {
    pointerGraceIntentRef.value = intent;
  },
});

function handleMountAutoFocus(event: Event) {
  event.preventDefault();
  // Always focus the content so key events reach the menu even after a
  // pointer-open; entryFocus decides whether the first item gets focus.
  contentElement.value?.focus({ preventScroll: true });
  emit('openAutoFocus', event);
}

function handleKeyDown(event: KeyboardEvent) {
  const isCharKey = event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey;
  if (isCharKey) {
    clearTimeout(searchTimer);
    searchRef.value += event.key;
    const content = contentElement.value;
    if (!content) return;
    const items = Array.from(
      content.querySelectorAll<HTMLElement>('[data-primitives-menu-item]:not([data-disabled])'),
    );
    const currentItem = content.querySelector<HTMLElement>('[data-primitives-menu-item][data-highlighted]');
    const match = getNextMatch(items, searchRef.value, currentItem);
    if (match) match.focus({ preventScroll: true });
    searchTimer = setTimeout(clearSearch, 1000);
    event.stopPropagation();
  }

  if (FIRST_LAST_KEYS.includes(event.key)) {
    event.stopPropagation();
    // While the content itself is focused (e.g. right after a pointer-open),
    // arrow/Home/End must move focus into the items.
    const content = contentElement.value;
    if (content && event.target === content) {
      event.preventDefault();
      const items = Array.from(
        content.querySelectorAll<HTMLElement>('[data-primitives-menu-item]:not([data-disabled])'),
      );
      if (LAST_KEYS.includes(event.key)) items.reverse();
      focusFirst(items);
    }
  }
}

function handleBlur(event: FocusEvent) {
  const content = contentElement.value;
  if (!content) return;
  if (!content.contains(event.relatedTarget as Node)) {
    clearSearch();
  }
}
</script>

<template>
  <FocusScope
    as="template"
    :trapped="trapFocus"
    :loop="loop"
    @mount-auto-focus="handleMountAutoFocus"
    @unmount-auto-focus="emit('closeAutoFocus', $event)"
  >
    <DismissableLayer
      as="template"
      :disable-outside-pointer-events="disableOutsidePointerEvents"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
      @interact-outside="emit('interactOutside', $event)"
      @dismiss="emit('dismiss')"
    >
      <RovingFocusGroup
        as="template"
        orientation="vertical"
        :dir="rootCtx.dir.value"
        :loop="loop"
        @entry-focus="(event: Event) => {
          emit('entryFocus', event)
          if (!rootCtx.isUsingKeyboardRef.value) event.preventDefault()
        }"
      >
        <PopperContent
          :ref="forwardRef"
          :as="as"
          role="menu"
          aria-orientation="vertical"
          data-primitives-menu-content=""
          :data-state="getOpenState(menuCtx.open.value)"
          :dir="rootCtx.dir.value"
          :side="side"
          :side-offset="sideOffset"
          :align="align"
          :style="{
            '--primitives-menu-content-transform-origin': 'var(--popper-transform-origin)',
            '--primitives-menu-content-available-width': 'var(--popper-available-width)',
            '--primitives-menu-content-available-height': 'var(--popper-available-height)',
          }"
          v-bind="popperProps"
          @keydown="handleKeyDown"
          @blur="handleBlur"
        >
          <slot />
        </PopperContent>
      </RovingFocusGroup>
    </DismissableLayer>
  </FocusScope>
</template>
