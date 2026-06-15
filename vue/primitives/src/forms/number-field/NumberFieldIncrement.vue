<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A button that increases the value by one `step`. Rendered as a `<button>` by
 * default, kept out of the tab order (the input is the focusable spinbutton) but
 * exposed to assistive tech with an `aria-label`. Holding the button auto-repeats
 * the increment, and it is disabled when the root is `disabled`/`readonly`, when
 * its own `disabled` prop is set, or when the value is already at `max`.
 */
export interface NumberFieldIncrementProps extends PrimitiveProps {
  /** Disable this button independently of the root. */
  disabled?: boolean;
  /**
   * Accessible label for assistive tech. Bind via `aria-label` (Vue maps the
   * kebab-case attribute to this prop).
   * @default 'Increase'
   */
  ariaLabel?: string;
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useNumberFieldContext } from './context';
import { usePressedHold } from './utils';

const { as = 'button', disabled = false, ariaLabel = 'Increase' } = defineProps<NumberFieldIncrementProps>();
const { forwardRef, currentElement } = useForwardExpose();
const ctx = useNumberFieldContext();

const isDisabled = computed(() =>
  ctx.disabled.value || ctx.readonly.value || disabled || ctx.isIncrementDisabled.value);

const { isPressed, onTrigger, consumeClick } = usePressedHold({ target: currentElement, disabled: isDisabled });

onTrigger(() => ctx.increment());

function onClick(): void {
  // Pointer presses already fired via `onTrigger`; only handle clicks with no
  // preceding pointer press (programmatic `.click()`, keyboard activation).
  if (consumeClick() || isDisabled.value)
    return;
  ctx.increment();
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    tabindex="-1"
    :aria-label="ariaLabel"
    :style="{ userSelect: isPressed ? 'none' : undefined }"
    :disabled="isDisabled || undefined"
    :data-disabled="isDisabled ? '' : undefined"
    :data-pressed="isPressed ? 'true' : undefined"
    @click="onClick"
    @contextmenu.prevent
  >
    <slot />
  </Primitive>
</template>
