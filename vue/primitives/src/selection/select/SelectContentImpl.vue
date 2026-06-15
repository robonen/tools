<script lang="ts">
import type { DismissableLayerEmits } from '../../utilities/dismissable-layer';
import type { FocusScopeEmits } from '../../utilities/focus-scope';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The mounted body of the content panel: it traps focus, dismisses on outside
 * pointer/escape, locks body scroll, hides sibling content from assistive tech,
 * installs focus guards, focuses the selected option on open, and handles
 * keyboard navigation and cycling type-ahead. Rendered by `SelectContent` once
 * open — prefer using `SelectContent` rather than this part directly.
 */
export interface SelectContentImplProps extends PrimitiveProps {
  /** Position mode. @default 'item-aligned' */
  position?: 'item-aligned' | 'popper';
  /** Block outside pointer events. @default true */
  disableOutsidePointerEvents?: boolean;
  /** Lock body scroll while open. @default true */
  bodyLock?: boolean;
}

export interface SelectContentImplEmits {
  closeAutoFocus: FocusScopeEmits['unmountAutoFocus'];
  escapeKeyDown: DismissableLayerEmits['escapeKeyDown'];
  pointerDownOutside: DismissableLayerEmits['pointerDownOutside'];
}
</script>

<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue';

import { refAutoReset, useBodyScrollLock, useFocusGuard, useForwardExpose } from '@robonen/vue';
import { getActiveElement } from '@robonen/platform/browsers';
import { DismissableLayer } from '../../utilities/dismissable-layer';
import { FocusScope } from '../../utilities/focus-scope';
import { useHideOthers } from '../../internal/utils/useHideOthers';
import { provideSelectContentContext, useSelectRootContext } from './context';
import SelectItemAlignedPosition from './SelectItemAlignedPosition.vue';
import SelectPopperPosition from './SelectPopperPosition.vue';
import { getNextMatch } from './utils';

const {
  as = 'div',
  position = 'item-aligned',
  disableOutsidePointerEvents = true,
  bodyLock = true,
} = defineProps<SelectContentImplProps>();

const emit = defineEmits<SelectContentImplEmits>();

const { forwardRef } = useForwardExpose();
const rootCtx = useSelectRootContext();

if (bodyLock) useBodyScrollLock();
useFocusGuard();

const isPositioned = ref(false);
const search = refAutoReset('', 1000);
const viewportRef = shallowRef<HTMLElement | undefined>(undefined);
const contentRef = shallowRef<HTMLElement | undefined>(undefined);
const selectedItemRef = rootCtx.selectedItemRef;
const selectedItemTextRef = rootCtx.selectedItemTextRef;

const firstValidItemFoundRef = ref(false);

// Recompute the selected/first-valid item afresh for this open cycle.
selectedItemRef.value = undefined;

// Resolve the actual listbox content element. The item-aligned strategy renders
// a positioning wrapper whose first child is the listbox; the popper strategy
// renders a wrapper marked `data-primitives-popper-content-wrapper`.
function setContentRef(vnode: unknown) {
  forwardRef(vnode as never);
  const el = (vnode as { $el?: HTMLElement } | null)?.$el ?? (vnode as HTMLElement | null);
  if (!el) {
    contentRef.value = undefined;
    return;
  }
  if (el.hasAttribute?.('data-primitives-select-content-wrapper')
    || el.hasAttribute?.('data-popper-content-wrapper')) {
    contentRef.value = (el.firstElementChild as HTMLElement | null) ?? el;
  }
  else {
    contentRef.value = el;
  }
}

useHideOthers(contentRef);

function focusFirst(candidates: Array<HTMLElement | undefined>) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const prev = getActiveElement();
    candidate.focus({ preventScroll: true });
    if (getActiveElement() !== prev) return;
  }
}

function focusSelectedItem() {
  focusFirst([selectedItemRef.value, contentRef.value]);
}

// Focus the selected option (or content) once positioning completes.
watch(isPositioned, (positioned) => {
  if (positioned) focusSelectedItem();
});

function getItems(): HTMLElement[] {
  const viewport = viewportRef.value ?? contentRef.value;
  if (!viewport) return [];
  return Array.from(
    viewport.querySelectorAll<HTMLElement>('[data-primitives-select-item]:not([data-disabled])'),
  );
}

function textOf(el: HTMLElement): string {
  return el.dataset['textValue'] ?? el.textContent?.trim() ?? '';
}

function handleTypeahead(key: string) {
  search.value += key;
  const items = getItems();
  if (items.length === 0) return;
  const values = items.map(textOf);
  const active = getActiveElement() as HTMLElement | null;
  const currentMatch = active && items.includes(active) ? textOf(active) : undefined;
  const next = getNextMatch(values, search.value, currentMatch);
  if (next === undefined) return;
  const matched = items[values.indexOf(next)];
  matched?.focus({ preventScroll: true });
}

function handleKeyDown(event: KeyboardEvent) {
  const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;

  // The listbox should not be Tab-navigable.
  if (event.key === 'Tab') {
    event.preventDefault();
    return;
  }

  if (!isModifierKey && event.key.length === 1) {
    handleTypeahead(event.key);
  }

  const items = getItems();
  if (items.length === 0) return;
  let candidates = [...items];

  if (['ArrowUp', 'End'].includes(event.key)) {
    candidates = candidates.slice().reverse();
  }

  if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
    const current = getActiveElement() as HTMLElement;
    const currentIndex = candidates.indexOf(current);
    candidates = candidates.slice(currentIndex + 1);
  }

  if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    setTimeout(() => focusFirst(candidates));
  }
}

function itemRefCallback(el: HTMLElement | undefined, value: unknown, disabled: boolean) {
  const isFirstValidItem = !firstValidItemFoundRef.value && !disabled;
  rootCtx.itemRefCallback(el, value as never, disabled);
  if (isFirstValidItem && !selectedItemRef.value) {
    selectedItemRef.value = el;
    firstValidItemFoundRef.value = true;
  }
  else if (isFirstValidItem) {
    firstValidItemFoundRef.value = true;
  }
}

provideSelectContentContext({
  viewportRef,
  onViewportChange: (el) => { viewportRef.value = el; },
  contentRef,
  selectedItemRef,
  selectedItemTextRef,
  onItemLeave: () => { contentRef.value?.focus(); },
  focusSelectedItem,
  itemRefCallback,
  itemTextRefCallback: rootCtx.itemTextRefCallback,
  isPositioned,
  searchRef: search,
  position,
});
</script>

<template>
  <FocusScope
    as="template"
    :loop="true"
    :trapped="true"
    @unmount-auto-focus="emit('closeAutoFocus', $event)"
  >
    <DismissableLayer
      as="template"
      :disable-outside-pointer-events="disableOutsidePointerEvents"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @dismiss="rootCtx.onOpenChange(false)"
    >
      <SelectItemAlignedPosition
        v-if="position === 'item-aligned'"
        :ref="setContentRef"
        :as="as"
        :id="rootCtx.contentId.value"
        role="listbox"
        :data-state="rootCtx.open.value ? 'open' : 'closed'"
        :dir="rootCtx.dir.value"
        style="display: flex; flex-direction: column; outline: none"
        @contextmenu.prevent
        @placed="isPositioned = true"
        @keydown="handleKeyDown"
      >
        <slot />
      </SelectItemAlignedPosition>

      <SelectPopperPosition
        v-else
        :ref="setContentRef"
        :as="as"
        :id="rootCtx.contentId.value"
        role="listbox"
        :data-state="rootCtx.open.value ? 'open' : 'closed'"
        :dir="rootCtx.dir.value"
        style="display: flex; flex-direction: column; outline: none"
        @contextmenu.prevent
        @placed="isPositioned = true"
        @keydown="handleKeyDown"
      >
        <slot />
      </SelectPopperPosition>
    </DismissableLayer>
  </FocusScope>
</template>
