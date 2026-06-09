<script lang="ts">
import type { Direction } from '../config-provider';
import type { PrimitiveProps } from '../primitive';

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
import { onScopeDispose, ref, toRef } from 'vue';

import { Primitive } from '../primitive';
import { provideMenubarRootContext } from './context';
import { useCollectionProvider } from '../collection';
import { useConfig } from '../config-provider';
import { useForwardExpose } from '@robonen/vue';

const {
  defaultValue,
  dir: dirProp,
  loop = true,
  as = 'div',
} = defineProps<MenubarRootProps>();

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

const searchRef = ref('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;

function clearSearch() {
  clearTimeout(searchTimer);
  searchRef.value = '';
}

onScopeDispose(clearSearch);

// Reset the typeahead buffer once after every keystroke (1s idle window).
function bumpSearchIdleTimer() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(clearSearch, 1000);
}

provideMenubarRootContext({
  value,
  dir: dirRef,
  loop: toRef(() => loop),
  onMenuOpen: (v) => { value.value = v; },
  onMenuClose: () => { value.value = undefined; },
  onMenuToggle: (v) => { value.value = value.value === v ? undefined : v; },
  getTriggers: (includeDisabled = false) => getItems(includeDisabled),
  searchRef,
});

function onKeyDownCapture(event: KeyboardEvent) {
  // Typeahead at the menubar level: alphanumeric single-character key when no modifiers.
  // Browsers report printable keys as `event.key.length === 1`; Space/Enter/Arrows are
  // longer or are non-printable.
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.key.length !== 1) return;
  searchRef.value += event.key;
  bumpSearchIdleTimer();
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
      <slot />
    </Primitive>
  </CollectionSlot>
</template>
