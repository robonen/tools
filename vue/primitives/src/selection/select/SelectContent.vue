<script lang="ts">
import type { SelectContentImplEmits, SelectContentImplProps } from './SelectContentImpl.vue';

/**
 * The floating panel that holds the options. While open it mounts
 * `SelectContentImpl` behind `Presence` (so it can animate in and out); while
 * closed it still renders the options into a detached `DocumentFragment` so each
 * `SelectItem` registers its value/label and `SelectValue` shows the
 * initially-selected label before the dropdown is ever opened. Usually placed
 * inside a `SelectPortal` and contains a `SelectViewport` of `SelectItem`s.
 */
export interface SelectContentProps extends SelectContentImplProps {
  /**
   * Force mounting (keeps the panel in the DOM) for externally-controlled
   * animation libraries.
   */
  forceMount?: boolean;
}

export type SelectContentEmits = SelectContentImplEmits;
</script>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';

import { Presence } from '../../utilities/presence';
import { useSelectRootContext } from './context';
import SelectContentImpl from './SelectContentImpl.vue';
import SelectProvider from './SelectProvider.vue';

const props = defineProps<SelectContentProps>();
const emit = defineEmits<SelectContentEmits>();
const rootCtx = useSelectRootContext();

const present = computed(() => props.forceMount || rootCtx.open.value);

// Delay toggling render-presence so children re-render with the latest state
// before the exit transition runs (state-based `data-state=closed` animations).
const renderPresence = ref(present.value);
function syncRenderPresence() {
  renderPresence.value = present.value;
}
watch(present, () => {
  setTimeout(syncRenderPresence);
});

// Detached fragment that keeps options mounted (and registered) while closed.
const fragment = shallowRef<DocumentFragment | undefined>(undefined);
onMounted(() => {
  fragment.value = typeof DocumentFragment !== 'undefined' ? new DocumentFragment() : undefined;
});
</script>

<template>
  <Presence
    v-if="present || renderPresence"
    :present="present"
  >
    <SelectContentImpl
      v-bind="props"
      @close-auto-focus="emit('closeAutoFocus', $event)"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
    >
      <slot />
    </SelectContentImpl>
  </Presence>

  <Teleport v-else-if="fragment" :to="fragment">
    <SelectProvider :context="rootCtx">
      <slot />
    </SelectProvider>
  </Teleport>
</template>
