<script lang="ts">
import type { PopperContentProps } from '../../overlays/popper';
import type { PrimitiveProps } from '../../internal/primitive';

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

// Static CSS-variable bridge from Popper's exported vars to the menu-content
// namespace. Hoisted to module scope so a stable reference is bound every
// render (avoids per-render object allocation; the style values never change).
const CONTENT_STYLE = {
  '--primitives-menu-content-transform-origin': 'var(--popper-transform-origin)',
  '--primitives-menu-content-available-width': 'var(--popper-available-width)',
  '--primitives-menu-content-available-height': 'var(--popper-available-height)',
} as const;
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { DismissableLayer } from '../../utilities/dismissable-layer';
import { FocusScope } from '../../utilities/focus-scope';
import { PopperContent } from '../../overlays/popper';
import { RovingFocusGroup } from '../../utilities/roving-focus';
import { refAutoReset, useForwardExpose } from '@robonen/vue';
import { provideMenuContentContext, provideMenuItemSelectContext, useMenuContext, useMenuRootContext } from './context';
import type { GraceIntent, Side } from './utils';
import { FIRST_LAST_KEYS, LAST_KEYS, focusFirst, getNextMatch, getOpenState, isMousePointer, isPointerInGraceArea } from './utils';

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

// Typeahead buffer that auto-clears 1s after the last keystroke — each write
// restarts the idle timer (and it tears down on scope dispose). Mirrors the
// Menubar/Select typeahead.
const searchRef = refAutoReset('', 1000);

const pointerGraceTimerRef = ref<number>(0);
const pointerGraceIntentRef = ref<GraceIntent | null>(null);

// Track which way the pointer is travelling so the grace area only keeps the
// submenu open when the cursor is heading *toward* it (a downward/sideways
// drift back over the parent items must still close it).
const pointerDirRef = ref<Side>('right');
const lastPointerXRef = ref(0);

function isPointerMovingToSubmenu(event: PointerEvent): boolean {
  const isMovingTowards = pointerDirRef.value === pointerGraceIntentRef.value?.side;
  return isMovingTowards && isPointerInGraceArea(event, pointerGraceIntentRef.value?.area);
}

function handlePointerMove(event: PointerEvent) {
  if (!isMousePointer(event)) return;
  const target = event.target as HTMLElement;
  const pointerXHasChanged = lastPointerXRef.value !== event.clientX;
  // Safari always reports `movementX === 0`, so compare clientX ourselves.
  if ((event.currentTarget as HTMLElement)?.contains(target) && pointerXHasChanged) {
    pointerDirRef.value = event.clientX > lastPointerXRef.value ? 'right' : 'left';
    lastPointerXRef.value = event.clientX;
  }
}

provideMenuContentContext({
  onItemEnter: (event) => {
    return isPointerMovingToSubmenu(event);
  },
  onItemLeave: (event) => {
    if (isPointerMovingToSubmenu(event)) return;
    contentElement.value?.focus({ preventScroll: true });
  },
  onTriggerLeave: (event) => {
    return isPointerMovingToSubmenu(event);
  },
  searchRef,
  pointerGraceTimerRef,
  onPointerGraceIntentChange: (intent) => {
    pointerGraceIntentRef.value = intent;
  },
});

// Exposed to selectable items so Space can extend type-ahead instead of
// activating the focused item while the user is mid-search.
const isTypingAhead = computed(() => searchRef.value !== '');
provideMenuItemSelectContext({ isTypingAhead });

function handleMountAutoFocus(event: Event) {
  event.preventDefault();
  // Always focus the content so key events reach the menu even after a
  // pointer-open; entryFocus decides whether the first item gets focus.
  contentElement.value?.focus({ preventScroll: true });
  emit('openAutoFocus', event);
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) return;

  const target = event.target as HTMLElement;
  // Submenu key events bubble up through portals; only act on keys that
  // originate inside *this* content, not a nested submenu's.
  const isKeyDownInside = target.closest('[data-primitives-menu-content]') === event.currentTarget;
  // Don't hijack typing inside an embedded input/textarea (e.g. a filter field).
  const isKeyDownInTextField = ['input', 'textarea'].includes(target.tagName.toLowerCase());

  // Menus must not be exited via Tab — keep focus inside (ARIA menu pattern).
  if (isKeyDownInside && event.key === 'Tab') event.preventDefault();

  const isCharKey = event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey;
  // Space drives selection (handled by the item), never typeahead.
  if (isCharKey && event.key !== ' ' && isKeyDownInside && !isKeyDownInTextField) {
    searchRef.value += event.key;
    const content = contentElement.value;
    if (!content) return;
    const items = Array.from(
      content.querySelectorAll<HTMLElement>('[data-primitives-menu-item]:not([data-disabled])'),
    );
    const currentItem = content.querySelector<HTMLElement>('[data-primitives-menu-item][data-highlighted]');
    const match = getNextMatch(items, searchRef.value, currentItem);
    if (match) match.focus({ preventScroll: true });
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
    searchRef.value = '';
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
          :style="CONTENT_STYLE"
          v-bind="popperProps"
          @keydown="handleKeyDown"
          @blur="handleBlur"
          @pointermove="handlePointerMove"
        >
          <slot />
        </PopperContent>
      </RovingFocusGroup>
    </DismissableLayer>
  </FocusScope>
</template>
