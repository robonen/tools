<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/** Canonical `data-state` value reflected on the host element. */
export type ToggleState = 'on' | 'off';

/** Events emitted by `Toggle`. */
export interface ToggleEmits {
  /** Fired when the pressed state changes. Backs `v-model:pressed`. */
  'update:pressed': [pressed: boolean];
}

/**
 * A two-state button that can be pressed on or off, like a bold or italic
 * control in a text editor toolbar. Renders a native `<button>` by default
 * (handling Space/Enter and the `disabled` attribute for you), exposes
 * `aria-pressed`, `data-state` (`on`/`off`), and `data-disabled` for styling,
 * and works uncontrolled (`defaultPressed`) or controlled via `v-model:pressed`.
 * When rendered as a non-button element it synthesizes keyboard activation and
 * the appropriate `tabindex`/`aria-disabled`. Provide `name` to mirror the
 * pressed state into a hidden checkbox so it participates in native form
 * submission (suppressed automatically when nested in a `ToggleGroup`, which
 * owns the submitted value). Use it for a single standalone toggle; for a set
 * of mutually related toggles use `ToggleGroup` instead.
 */
export interface ToggleProps extends PrimitiveProps {

  /** Uncontrolled initial pressed state. */
  defaultPressed?: boolean;
  /** Disables the toggle. */
  disabled?: boolean;
  /**
   * Name for the hidden form input. When provided (and the toggle lives inside
   * a `<form>` and is not nested in a `ToggleGroup`), a hidden checkbox mirrors
   * the pressed state so it is submitted with the owning form.
   */
  name?: string;
  /** Marks the control as required for form submission (native validation). */
  required?: boolean;
  /** Value submitted by the hidden form input when pressed. Defaults to `'on'`. */
  value?: string;
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed, ref } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { VisuallyHiddenInput } from '../../utilities/visually-hidden';
import { useToggleGroupContext } from '../toggle-group/context';

const {
  defaultPressed = false,
  disabled = false,
  as = 'button',
  name,
  required = false,
  value = 'on',
} = defineProps<ToggleProps>();

defineEmits<ToggleEmits>();

const { forwardRef, currentElement } = useForwardExpose();

// A standalone Toggle nested inside a ToggleGroup must not also submit its own
// value — the group owns the form value. `null` fallback keeps this optional.
const toggleGroupContext = useToggleGroupContext(null);

const localPressed = ref<boolean>(defaultPressed);

const pressed = defineModel<boolean>('pressed', {
  default: undefined,
  get: v => v ?? localPressed.value,
  set: (v) => {
    localPressed.value = v;
    return v;
  },
});

const dataState = computed<ToggleState>(() => (pressed.value ? 'on' : 'off'));

// Whether the toggle lives inside a real <form>; SSR defaults to bridging so
// the value still submits server-side. Mirrors the package-wide check.
const isFormControl = computed(() => {
  const el = currentElement.value;
  return typeof document === 'undefined' ? true : (!!el && !!el.closest('form'));
});

const renderHiddenInput = computed(() =>
  !!name && !toggleGroupContext && isFormControl.value);

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
    :data-state="dataState"
    :data-disabled="disabled ? '' : undefined"
    :disabled="as === 'button' ? disabled : undefined"
    @click="onClick"
    @keydown="onKeydown"
  >
    <slot :pressed="pressed" :disabled="disabled" :state="dataState" />

    <VisuallyHiddenInput
      v-if="renderHiddenInput"
      :name="name!"
      :value="pressed ? value : ''"
      :checked="pressed"
      :required="required"
      :disabled="disabled"
    />
  </Primitive>
</template>
