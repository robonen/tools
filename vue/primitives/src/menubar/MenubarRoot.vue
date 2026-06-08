<script lang="ts">
import type { Direction } from '../config-provider';
import type { PrimitiveProps } from '../primitive';

export interface MenubarRootProps extends PrimitiveProps {
  modelValue?: string;
  defaultValue?: string;
  dir?: Direction;
  loop?: boolean;
}
export interface MenubarRootEmits {
  'update:modelValue': [value: string | undefined];
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, ref, toRef } from 'vue';

import { Primitive } from '../primitive';
import { provideMenubarRootContext } from './context';
import { useCollectionProvider } from '../collection';
import { useConfig } from '../config-provider';
import { useForwardExpose } from '@robonen/vue';

const {
  modelValue,
  defaultValue,
  dir: dirProp,
  loop = true,
  as = 'div',
} = defineProps<MenubarRootProps>();
const emit = defineEmits<MenubarRootEmits>();

const config = useConfig();
const dirRef = toRef(() => dirProp ?? config.dir.value);
const { forwardRef } = useForwardExpose();

const { getItems, CollectionSlot } = useCollectionProvider<string>();

const local = ref<string | undefined>(defaultValue);
const value = computed({
  get: () => modelValue !== undefined ? modelValue : local.value,
  set: (v) => {
    local.value = v;
    emit('update:modelValue', v);
  },
});

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
