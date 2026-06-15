<script lang="ts">
import type { MenuSubEmits, MenuSubProps } from '../menu';

/**
 * Wraps a nested submenu, pairing a `ContextMenuSubTrigger` with its
 * `ContextMenuSubContent` and owning that submenu's open state. Bind
 * `v-model:open` to control it, or leave it unbound and pass `defaultOpen` to
 * use it uncontrolled. Listen to `update:open` to track expansion; the default
 * slot also exposes the current `open` value.
 */
export interface ContextMenuSubProps extends MenuSubProps {
  /** The open state of the submenu when initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean;
}
export type ContextMenuSubEmits = MenuSubEmits;
</script>

<script setup lang="ts">
import { ref, watch } from 'vue';

import { MenuSub } from '../menu';

// `open: undefined` opts out of Vue's boolean-prop coercion (an absent boolean
// prop would otherwise become `false`), so we can tell "uncontrolled" (use
// `defaultOpen`) apart from an explicit `:open="false"` (controlled).
// `open: undefined` is load-bearing: it keeps an absent boolean prop `undefined`
// instead of letting Vue coerce it to `false`, so the `open ?? defaultOpen`
// uncontrolled seed works. Reactive props destructure can't preserve this, so
// this stays as `withDefaults` + `props`.
const props = withDefaults(defineProps<ContextMenuSubProps>(), {
  open: undefined,
  defaultOpen: false,
});
const emit = defineEmits<ContextMenuSubEmits>();
defineSlots<{ default?: (props: { open: boolean }) => unknown }>();

// Controlled when the `open` prop is supplied; otherwise the local ref (seeded
// by `defaultOpen`) drives it.
const local = ref(props.open ?? props.defaultOpen);

watch(() => props.open, (value) => {
  if (value !== undefined) local.value = value;
});

function setOpen(value: boolean) {
  local.value = value;
  emit('update:open', value);
}
</script>

<template>
  <MenuSub
    :open="local"
    @update:open="setOpen"
  >
    <slot :open="local" />
  </MenuSub>
</template>
