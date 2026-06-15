<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The text field that displays and edits the value, rendered as a native
 * `<input role="spinbutton">` wired to the root context. It parses typed input,
 * mirrors the current value via `aria-valuenow`/`aria-valuemin`/`aria-valuemax`,
 * and handles Arrow/Page/Home/End keys to step, jump, or clamp to the bounds.
 * Mouse-wheel scrolling steps the value while focused, keystrokes that would
 * produce an invalid number are rejected, and the value is re-clamped, snapped,
 * and reformatted on blur or Enter.
 */
export interface NumberFieldInputProps extends PrimitiveProps {
  placeholder?: string;
  name?: string;
  required?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed, onMounted, ref, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { getActiveElement } from '@robonen/platform/browsers';
import { useNumberFieldContext } from './context';

const { as = 'input', placeholder, name, required } = defineProps<NumberFieldInputProps>();
const ctx = useNumberFieldContext();
const { forwardRef, currentElement } = useForwardExpose();

// Local mirror of the displayed text so in-progress edits (e.g. a trailing
// decimal separator) survive until the value is committed/reformatted.
const inputValue = ref(ctx.textValue.value);
watch(() => ctx.textValue.value, (v) => {
  inputValue.value = v;
});

const valueNow = computed(() => ctx.value.value ?? undefined);

onMounted(() => {
  ctx.onInputElement(currentElement.value as HTMLInputElement | undefined);
});

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  inputValue.value = target.value;
  // Live update: empty clears to null, unparseable also clears to null (the
  // value is re-clamped/snapped/reformatted only on commit via `applyInputValue`).
  const parsed = ctx.parseInput(target.value);
  ctx.setValue(parsed);
}

function onBeforeInput(event: InputEvent): void {
  const target = event.target as HTMLInputElement;
  const next
    = target.value.slice(0, target.selectionStart ?? undefined)
      + (event.data ?? '')
      + target.value.slice(target.selectionEnd ?? undefined);
  if (!ctx.validate(next))
    event.preventDefault();
}

function commit(event: Event): void {
  ctx.applyInputValue((event.target as HTMLInputElement).value);
}

function onWheel(event: WheelEvent): void {
  if (ctx.disableWheelChange.value || ctx.disabled.value || ctx.readonly.value)
    return;
  if (event.target !== getActiveElement())
    return;
  // Trackpads emit simultaneous X/Y; ignore mostly-horizontal scrolls.
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX))
    return;

  event.preventDefault();
  const goingDown = event.deltaY > 0;
  const decrease = goingDown !== ctx.invertWheelChange.value;
  if (decrease)
    ctx.decrement();
  else
    ctx.increment();
}

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value || ctx.readonly.value) return;
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      ctx.increment();
      break;
    case 'ArrowDown':
      event.preventDefault();
      ctx.decrement();
      break;
    case 'PageUp':
      event.preventDefault();
      ctx.increment(ctx.step.value * 10);
      break;
    case 'PageDown':
      event.preventDefault();
      ctx.decrement(ctx.step.value * 10);
      break;
    case 'Home':
      if (ctx.min.value !== undefined) {
        event.preventDefault();
        ctx.setValue(ctx.min.value);
      }
      break;
    case 'End':
      if (ctx.max.value !== undefined) {
        event.preventDefault();
        ctx.setValue(ctx.max.value);
      }
      break;
    case 'Enter':
      ctx.applyInputValue((event.target as HTMLInputElement).value);
      break;
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="ctx.inputId"
    role="spinbutton"
    type="text"
    tabindex="0"
    :inputmode="ctx.inputMode.value"
    autocomplete="off"
    autocorrect="off"
    spellcheck="false"
    aria-roledescription="Number field"
    :aria-valuemin="ctx.min.value"
    :aria-valuemax="ctx.max.value"
    :aria-valuenow="valueNow"
    :aria-disabled="ctx.disabled.value || undefined"
    :aria-readonly="ctx.readonly.value || undefined"
    :disabled="ctx.disabled.value || undefined"
    :readonly="ctx.readonly.value || undefined"
    :placeholder="placeholder"
    :name="name"
    :required="required || undefined"
    :value="inputValue"
    @beforeinput="onBeforeInput"
    @input="onInput"
    @keydown="onKeyDown"
    @wheel="onWheel"
    @change="commit"
    @blur="commit"
  />
</template>
