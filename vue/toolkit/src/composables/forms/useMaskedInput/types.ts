import type { ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue';
import type { MaskOptionInput, OverwriteMode } from '../mask';

/**
 * Options for {@link useMaskedInput}.
 */
export interface UseMaskedInputOptions {
  /**
   * The mask source: a full options object, a bare mask expression, or a
   * template string (e.g. `'+1 (###) ###-####'`). May be reactive.
   */
  mask: MaybeRefOrGetter<MaskOptionInput>;

  /**
   * Insert vs overwrite behavior under a collapsed caret. Overrides any
   * `overwriteMode` carried by the resolved mask options.
   *
   * @default 'shift'
   */
  overwriteMode?: OverwriteMode;

  /**
   * Conform the element's current value once, as soon as it is bound.
   *
   * @default true
   */
  initialCalibration?: boolean;

  /**
   * Called after each accepted change with both views of the value. The
   * one-liner bridge for feeding the raw value into a form.
   */
  onAccept?: (state: { masked: string; unmasked: string }) => void;
}

/**
 * Bindings to spread onto the `<input>`/`<textarea>` via `v-bind`. Contains the
 * template-ref callback that attaches the element plus the event handlers that
 * drive masking — no separate `ref` wiring needed.
 */
export interface MaskInputBindings {
  /**
   * Template-ref callback — attaches the element (`v-bind` sets it for you).
   */
  ref: (element: Element | null) => void;
  /**
   * `input` handler — re-conforms after exotic/composition input types.
   */
  onInput: () => void;
  /**
   * `beforeinput` handler — the insert/delete masking pipeline.
   */
  onBeforeinput: (event: InputEvent) => void;
  /**
   * `compositionend` handler — re-conforms after IME composition.
   */
  onCompositionend: () => void;
}

/**
 * The reactive API returned by {@link useMaskedInput}.
 */
export interface UseMaskedInputReturn {
  /**
   * The conformed, displayed value (kept in sync with the element).
   */
  masked: ShallowRef<string>;
  /**
   * The raw value with fixed mask characters (and preset separators) stripped.
   */
  unmasked: Readonly<ShallowRef<string>>;
  /**
   * Whether `masked` fully satisfies the mask.
   */
  complete: ComputedRef<boolean>;
  /**
   * Spread onto the input element: `<input v-bind="bind">`.
   */
  bind: MaskInputBindings;
  /**
   * Re-conform the element's current value (e.g. after a programmatic set).
   */
  ensureFitsMask: () => void;
  /**
   * Set the value programmatically — treated as raw input and conformed.
   */
  setValue: (value: string) => void;
}
