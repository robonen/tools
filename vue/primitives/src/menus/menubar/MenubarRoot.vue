<script lang="ts">
import type { Direction } from '../../utilities/config-provider';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A horizontal bar of menus, like the File / Edit / View row in a desktop app.
 * Each MenubarMenu owns a trigger and its dropdown; the root coordinates them so
 * only one is open at a time, arrow keys move between triggers, and typeahead
 * jumps to a trigger by name. Built on top of Menu, so every menu inherits
 * keyboard navigation, nested submenus, and checkbox/radio items.
 *
 * Use it for application-style menu bars in editors, dashboards, and tools. The
 * root holds which menu is open; bind `v-model` (or listen to
 * `update:modelValue`) to control or observe the active menu's value.
 */
export interface MenubarRootProps extends PrimitiveProps {
  defaultValue?: string;
  dir?: Direction;
  loop?: boolean;
}
</script>

<script setup lang="ts">
import { ref, toRef } from 'vue';

import { Primitive } from '../../internal/primitive';
import { provideMenubarRootContext } from './context';
import { useCollectionProvider } from '../../utilities/collection';
import { useConfig } from '../../utilities/config-provider';
import { refAutoReset, useForwardExpose } from '@robonen/vue';

const {
  defaultValue,
  dir: dirProp,
  loop = true,
  as = 'div',
} = defineProps<MenubarRootProps>();

defineSlots<{ default?: (props: { modelValue: string | undefined }) => unknown }>();

const localValue = ref<string | undefined>(defaultValue);

const value = defineModel<string | undefined>('modelValue', {
  default: undefined,
  get: v => v ?? localValue.value,
  set: (v) => {
    localValue.value = v;
    return v;
  },
});

const config = useConfig();
const dirRef = toRef(() => dirProp ?? config.dir.value);
const { forwardRef } = useForwardExpose();

const { getItems, CollectionSlot } = useCollectionProvider<string>();

// Roving tabindex: exactly one trigger is the menubar's tab stop. Seeded to the
// open menu's value (so reopening keeps the same stop) and updated on every
// open/toggle, mirroring how a roving-focus group tracks its current item.
const currentTabStopId = ref<string | undefined>(defaultValue);

// Typeahead buffer that auto-clears 1s after the last keystroke — each write
// restarts the idle timer (and it tears down on scope dispose). Mirrors the
// Select trigger's typeahead.
const searchRef = refAutoReset('', 1000);

provideMenubarRootContext({
  value,
  dir: dirRef,
  loop: toRef(() => loop),
  onMenuOpen: (v) => {
    value.value = v;
    currentTabStopId.value = v;
  },
  onMenuClose: (v) => {
    // Ignore a close request from a menu that is no longer the open one — this
    // happens when switching menus and the outgoing content fires a late
    // dismiss after the incoming menu has already been opened.
    if (v !== undefined && value.value !== v) return;
    value.value = undefined;
  },
  onMenuToggle: (v) => {
    value.value = value.value === v ? undefined : v;
    // `onMenuOpen` and `onMenuToggle` are mutually exclusive, so the tab stop is
    // updated here too — toggling moves the single tab stop onto this trigger.
    currentTabStopId.value = v;
  },
  getTriggers: (includeDisabled = false) => getItems(includeDisabled),
  searchRef,
  currentTabStopId,
  onTabStopChange: (v) => { currentTabStopId.value = v; },
});

function onKeyDownCapture(event: KeyboardEvent) {
  // Typeahead at the menubar level: alphanumeric single-character key when no modifiers.
  // Browsers report printable keys as `event.key.length === 1`; Space/Enter/Arrows are
  // longer or are non-printable.
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.key.length !== 1) return;
  searchRef.value += event.key;
}
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="menubar"
      aria-orientation="horizontal"
      :data-orientation="'horizontal'"
      :dir="dirRef"
      @keydown.capture="onKeyDownCapture"
    >
      <slot :model-value="value" />
    </Primitive>
  </CollectionSlot>
</template>
