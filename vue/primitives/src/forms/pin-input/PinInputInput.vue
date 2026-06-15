<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

const DIGIT_RE = /\d/;
const NON_DIGIT_G = /\D/g;

/**
 * A single cell of the pin input, identified by its zero-based `index`. Renders
 * one masked-or-plain character box that reads/writes its slot of the root's
 * value and handles typing (auto-advancing to the next cell), Backspace/Delete,
 * arrow/Home/End navigation, and paste (spreading text across cells). Render one
 * per character, with `index` from `0` to `length - 1`.
 *
 * Polymorphic via `as` (defaults to a native `<input>`); `as="template"` merges
 * onto a single child. A per-cell `disabled` prop is honored on top of the
 * root-level `disabled` and is skipped by arrow navigation.
 */
export interface PinInputInputProps extends PrimitiveProps {
  index: number;
  /** Disable this individual cell (merged with the root-level `disabled`). */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { rovingKeyToAction } from '../../internal/utils/roving-focus';
import { usePinInputContext } from './context';

const { index, disabled = false, as = 'input' } = defineProps<PinInputInputProps>();
const ctx = usePinInputContext();
const { forwardRef, currentElement } = useForwardExpose();

// `currentElement` works through `as="template"` and polymorphic tags, so the
// cell registers whatever element it resolves to.
watch(currentElement, (curr, prev) => {
  if (prev)
    ctx.unregister(prev as HTMLInputElement);
  if (curr)
    ctx.register(curr as HTMLInputElement);
});

const isDisabled = computed(() => disabled || ctx.disabled.value);

const displayed = computed(() => {
  const ch = ctx.value.value[index] ?? '';
  if (!ch)
    return '';
  return ctx.mask.value ? '•' : ch;
});

// Hide the placeholder on the focused empty cell for a cleaner look; restore it
// on blur (or once a value lands, since `displayed` then takes over).
const focused = ref(false);
const placeholderText = computed(() =>
  focused.value && !ctx.value.value[index] ? '' : ctx.placeholder.value);

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  const raw = target.value;
  // keep only the last typed character
  let ch = raw.length > 0 ? raw[raw.length - 1]! : '';
  if (ctx.type.value === 'number' && ch && !DIGIT_RE.test(ch))
    ch = '';
  ctx.setAt(index, ch);
  // re-sync DOM input since we overwrite with displayed
  target.value = ch ? (ctx.mask.value ? '•' : ch) : '';
  if (ch && index < ctx.length.value - 1)
    ctx.focusRelative(index, 1);
}

function onKeyDown(e: KeyboardEvent): void {
  const i = index;
  switch (e.key) {
    case 'Backspace': {
      const current = ctx.value.value[i] ?? '';
      if (current) {
        ctx.clearAt(i);
      }
      else if (i > 0) {
        ctx.focusIndex(i - 1);
        ctx.clearAt(i - 1);
      }
      e.preventDefault();
      return;
    }
    case 'Delete': {
      ctx.clearAt(i);
      e.preventDefault();
      return;
    }
  }

  // Arrow/Home/End navigation is direction-aware (RTL flips left/right) and
  // skips disabled cells. Vertical keys are ignored for this horizontal field.
  const action = rovingKeyToAction(e, { orientation: 'horizontal', dir: ctx.dir.value, loop: false });
  if (!action)
    return;
  e.preventDefault();
  ctx.focusRelative(i, action.delta, action.absolute);
}

function onFocus(e: FocusEvent): void {
  // OTP sequential-fill guard: never let the user start in the middle, redirect
  // to the first empty cell so the code is entered left-to-right without gaps.
  if (ctx.otp.value) {
    const firstEmpty = ctx.firstEmptyIndex();
    if (firstEmpty !== -1 && firstEmpty < index) {
      ctx.focusIndex(firstEmpty);
      return;
    }
  }
  focused.value = true;
  const target = e.target as HTMLInputElement;
  // Place the caret after the (single) character so typing overwrites predictably.
  try {
    target.setSelectionRange(1, 1);
  }
  catch {
    /* noop — non-text inputs */
  }
}

function onBlur(): void {
  focused.value = false;
}

function onPaste(e: ClipboardEvent): void {
  const data = e.clipboardData?.getData('text') ?? '';
  if (!data)
    return;
  e.preventDefault();
  const chars = ctx.type.value === 'number'
    ? data.replaceAll(NON_DIGIT_G, '').split('')
    : data.split('');
  let idx = index;
  for (const ch of chars) {
    if (idx >= ctx.length.value)
      break;
    ctx.setAt(idx, ch);
    idx++;
  }
  ctx.focusIndex(Math.min(idx, ctx.length.value - 1));
}

const inputType = computed(() => (ctx.mask.value ? 'password' : 'text'));
const inputMode = computed(() => (ctx.type.value === 'number' ? 'numeric' : 'text'));
const ariaLabel = computed(() => `pin input ${index + 1} of ${ctx.length.value}`);
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="inputType"
    autocapitalize="none"
    :inputmode="inputMode"
    :pattern="ctx.type.value === 'number' ? '[0-9]*' : undefined"
    :value="displayed"
    :placeholder="placeholderText"
    :disabled="isDisabled || undefined"
    :autocomplete="ctx.otp.value ? 'one-time-code' : 'off'"
    :aria-label="ariaLabel"
    :data-index="index"
    :data-disabled="isDisabled ? '' : undefined"
    :data-complete="ctx.isComplete.value ? '' : undefined"
    maxlength="1"
    @input="onInput"
    @keydown="onKeyDown"
    @focus="onFocus"
    @blur="onBlur"
    @paste="onPaste"
  />
</template>
