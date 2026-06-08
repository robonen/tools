<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ToggleProps extends PrimitiveProps {

  /** Uncontrolled initial pressed state. */
  defaultPressed?: boolean;
  /** Disables the toggle. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { ref } from 'vue';
import { useForwardExpose } from '@robonen/vue';

const { defaultPressed = false, disabled = false, as = 'button' } = defineProps<ToggleProps>();

const { forwardRef } = useForwardExpose();

const localPressed = ref<boolean>(defaultPressed);

const pressed = defineModel<boolean>('pressed', {
  default: undefined,
  get: v => v ?? localPressed.value,
  set: (v) => {
    localPressed.value = v;
    return v;
  },
});

function toggle() {
  if (disabled) return;
  pressed.value = !pressed.value;
}

function onClick() {
  toggle();
}

function onKeydown(event: KeyboardEvent) {
  // <button> handles Space/Enter natively; synthesize only for non-button hosts.
  if (as === 'button') return;
  if (event.key !== ' ' && event.key !== 'Enter') return;
  event.preventDefault();
  toggle();
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    :tabindex="as === 'button' ? undefined : (disabled ? -1 : 0)"
    :aria-pressed="pressed"
    :aria-disabled="as === 'button' ? undefined : (disabled ? true : undefined)"
    :data-state="pressed ? 'on' : 'off'"
    :data-disabled="disabled ? '' : undefined"
    :disabled="as === 'button' ? disabled : undefined"
    @click="onClick"
    @keydown="onKeydown"
  >
    <slot :pressed="pressed" />
  </Primitive>
</template>
