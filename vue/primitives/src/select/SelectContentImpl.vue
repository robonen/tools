<script lang="ts">
import type { DismissableLayerEmits } from '../dismissable-layer';
import type { FocusScopeEmits } from '../focus-scope';
import type { PrimitiveProps } from '../primitive';

/**
 * The mounted body of the content panel: it traps focus, dismisses on outside
 * pointer/escape, locks body scroll, and handles keyboard navigation and
 * type-ahead. Rendered by `SelectContent` once open — prefer using
 * `SelectContent` rather than this part directly.
 */
export interface SelectContentImplProps extends PrimitiveProps {
  /** Position mode. @default 'item-aligned' */
  position?: 'item-aligned' | 'popper';
  /** Block outside pointer events. @default true */
  disableOutsidePointerEvents?: boolean;
}

export interface SelectContentImplEmits {
  closeAutoFocus: FocusScopeEmits['unmountAutoFocus'];
  escapeKeyDown: DismissableLayerEmits['escapeKeyDown'];
  pointerDownOutside: DismissableLayerEmits['pointerDownOutside'];
}
</script>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';

import { useBodyScrollLock, useForwardExpose } from '@robonen/vue';
import { DismissableLayer } from '../dismissable-layer';
import { FocusScope } from '../focus-scope';
import { provideSelectContentContext, useSelectRootContext } from './context';
import SelectItemAlignedPosition from './SelectItemAlignedPosition.vue';
import SelectPopperPosition from './SelectPopperPosition.vue';

const {
  as = 'div',
  position = 'item-aligned',
  disableOutsidePointerEvents = true,
} = defineProps<SelectContentImplProps>();

const emit = defineEmits<SelectContentImplEmits>();

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useSelectRootContext();

useBodyScrollLock();

const isPositioned = ref(false);
const searchRef = ref('');
const viewportRef = shallowRef<HTMLElement | undefined>(undefined);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function handleTypeahead(key: string) {
  searchRef.value += key;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchRef.value = '';
  }, 1000);

  const viewport = viewportRef.value;
  if (!viewport) return;
  const items = Array.from(viewport.querySelectorAll<HTMLElement>(
    '[data-primitives-select-item]:not([data-disabled])',
  ));
  const match = items.find(item =>
    item.textContent?.trim().toLowerCase().startsWith(searchRef.value.toLowerCase()),
  );
  match?.focus();
}

function handleKeyDown(event: KeyboardEvent) {
  const viewport = viewportRef.value;
  if (!viewport) return;

  const items = Array.from(viewport.querySelectorAll<HTMLElement>(
    '[data-primitives-select-item]:not([data-disabled])',
  ));
  const currentIdx = items.indexOf(document.activeElement as HTMLElement);

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    const next = items[currentIdx + 1] ?? items[0];
    next?.focus();
  }
  else if (event.key === 'ArrowUp') {
    event.preventDefault();
    const prev = items[currentIdx - 1] ?? items[items.length - 1];
    prev?.focus();
  }
  else if (event.key === 'Home') {
    event.preventDefault();
    items[0]?.focus();
  }
  else if (event.key === 'End') {
    event.preventDefault();
    items[items.length - 1]?.focus();
  }
  else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    handleTypeahead(event.key);
  }
}

provideSelectContentContext({
  viewportRef,
  onViewportChange: (el) => { viewportRef.value = el; },
  selectedItemRef: rootCtx.selectedItemRef,
  selectedItemTextRef: rootCtx.selectedItemTextRef,
  onItemLeave: () => { currentElement.value?.focus(); },
  itemRefCallback: rootCtx.itemRefCallback,
  itemTextRefCallback: rootCtx.itemTextRefCallback,
  isPositioned,
  searchRef,
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
        :ref="forwardRef"
        :as="as"
        :data-state="rootCtx.open.value ? 'open' : 'closed'"
        :dir="rootCtx.dir.value"
        @placed="isPositioned = true"
        @keydown="handleKeyDown"
      >
        <slot />
      </SelectItemAlignedPosition>

      <SelectPopperPosition
        v-else
        :ref="forwardRef"
        :as="as"
        :data-state="rootCtx.open.value ? 'open' : 'closed'"
        :dir="rootCtx.dir.value"
        @placed="isPositioned = true"
        @keydown="handleKeyDown"
      >
        <slot />
      </SelectPopperPosition>
    </DismissableLayer>
  </FocusScope>
</template>
