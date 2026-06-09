<script lang="ts">
import type { SelectContentImplEmits, SelectContentImplProps } from './SelectContentImpl.vue';

/**
 * The floating panel that holds the options. Mounts only while the select is
 * open (it gates `SelectContentImpl` behind `Presence`), so it can animate in
 * and out. Usually placed inside a `SelectPortal` and contains a
 * `SelectViewport` of `SelectItem`s.
 */
export type SelectContentProps = SelectContentImplProps;
export type SelectContentEmits = SelectContentImplEmits;
</script>

<script setup lang="ts">
import { Presence } from '../presence';
import { useSelectRootContext } from './context';
import SelectContentImpl from './SelectContentImpl.vue';

const props = defineProps<SelectContentProps>();
const emit = defineEmits<SelectContentEmits>();
const rootCtx = useSelectRootContext();
</script>

<template>
  <Presence :present="rootCtx.open.value">
    <SelectContentImpl
      v-bind="props"
      @close-auto-focus="emit('closeAutoFocus', $event)"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
    />
  </Presence>
</template>
