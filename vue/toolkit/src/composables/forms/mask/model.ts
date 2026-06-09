import { isArray, isFunction, isString } from '@robonen/stdlib';
import {
  applyOverwriteMode,
  areElementStatesEqual,
  calibrateValueByMask,
  removeFixedMaskCharacters,
  resolveMask,
} from './conform';
import { maskFromTemplate } from './presets';
import type {
  ElementState,
  Mask,
  MaskAction,
  MaskOptionInput,
  MaskOptions,
  MaskPostprocessor,
  MaskPreprocessor,
  ResolvedMaskOptions,
  SelectionRange,
} from './types';

/**
 * Thrown by {@link MaskModel} mutations that produce no change, so callers can
 * swallow the gesture (e.g. typing a fixed character that is already present)
 * without polluting input/undo history.
 */
export const MASK_NOOP = Symbol('mask-noop');

/**
 * Apply {@link MaskOptions} defaults.
 */
export function resolveMaskOptions(options: MaskOptions): ResolvedMaskOptions {
  return {
    mask: options.mask,
    preprocessors: options.preprocessors ?? [],
    postprocessors: options.postprocessors ?? [],
    overwriteMode: options.overwriteMode ?? 'shift',
  };
}

/**
 * Normalize the friendly authoring union to full {@link MaskOptions}: a template
 * string is compiled via {@link maskFromTemplate}, a bare mask is wrapped, and
 * full options pass through.
 */
export function normalizeMaskOptions(input: MaskOptionInput): MaskOptions {
  if (isString(input))
    return { mask: maskFromTemplate(input) };

  if (input instanceof RegExp || isArray(input) || isFunction(input))
    return { mask: input as Mask };

  return input as MaskOptions;
}

/**
 * Run the preprocessor chain, threading `{ elementState, data }`.
 */
export function runPreprocessors(
  processors: readonly MaskPreprocessor[],
  elementState: ElementState,
  data: string,
  action: MaskAction,
): { elementState: ElementState; data: string } {
  let state = elementState;
  let currentData = data;

  for (const process of processors) {
    const result = process({ elementState: state, data: currentData }, action);
    state = result.elementState;
    if (result.data !== undefined)
      currentData = result.data;
  }

  return { elementState: state, data: currentData };
}

/**
 * Run the postprocessor chain against `initialState`.
 */
export function runPostprocessors(
  processors: readonly MaskPostprocessor[],
  state: ElementState,
  initialState: ElementState,
): ElementState {
  let current = state;

  for (const process of processors)
    current = process(current, initialState);

  return current;
}

/**
 * The stateful masking model. Holds the masked `value`/`selection` and performs
 * insertions/deletions in **unmasked space** (fixed characters stripped) before
 * re-calibrating to the masked form — the device that makes backspacing across
 * fixed characters and `overwriteMode` correct.
 */
export class MaskModel implements ElementState {
  public value: string;
  public selection: SelectionRange;

  private readonly options: ResolvedMaskOptions;

  constructor(initial: ElementState, options: ResolvedMaskOptions) {
    this.options = options;

    const calibrated = calibrateValueByMask(initial, options.mask);
    this.value = calibrated.value;
    this.selection = calibrated.selection;
  }

  /**
   * Insert `characters` at the current selection. Throws {@link MASK_NOOP} when
   * the result is identical to the current state.
   */
  public addCharacters(characters: string): void {
    const initial: ElementState = { value: this.value, selection: this.selection };
    const mask = resolveMask(this.options.mask, initial);

    const overwritten = applyOverwriteMode(initial, characters, this.options.overwriteMode);
    const unmasked = removeFixedMaskCharacters(overwritten, mask);
    const [from, to] = unmasked.selection;

    const leading = unmasked.value.slice(0, from) + characters;
    const nextValue = leading + unmasked.value.slice(to);
    const caret = leading.length;

    this.applyCalibrated({ value: nextValue, selection: [caret, caret] }, initial, true);
  }

  /**
   * Delete from the current selection. A collapsed caret removes one *unmasked*
   * character in the given direction (auto-skipping fixed characters); a range
   * removes its unmasked span.
   */
  public deleteCharacters(isForward: boolean): void {
    const initial: ElementState = { value: this.value, selection: this.selection };
    const mask = resolveMask(this.options.mask, initial);

    const unmasked = removeFixedMaskCharacters(initial, mask);
    let [from, to] = unmasked.selection;

    if (from === to) {
      if (isForward)
        to = Math.min(to + 1, unmasked.value.length);
      else
        from = Math.max(from - 1, 0);
    }

    const nextValue = unmasked.value.slice(0, from) + unmasked.value.slice(to);

    this.applyCalibrated({ value: nextValue, selection: [from, from] }, initial, false);
  }

  private applyCalibrated(candidate: ElementState, initial: ElementState, guardNoop: boolean): void {
    const calibrated = calibrateValueByMask(candidate, this.options.mask);

    if (guardNoop && areElementStatesEqual(initial, calibrated))
      throw MASK_NOOP;

    this.value = calibrated.value;
    this.selection = calibrated.selection;
  }
}

/**
 * @name maskTransform
 * @category Forms
 * @description Pure, DOM-free masking: conform a string (or {@link ElementState})
 * through the full preprocessor → mask → postprocessor pipeline. Ideal for SSR,
 * server-side validation, and tests. Returns a `string` for string input and an
 * {@link ElementState} for state input.
 *
 * @example
 * maskTransform('1234567890', maskPhoneOptions({ template: '+1 (###) ###-####' }));
 * // '+1 (123) 456-7890'
 *
 * @since 0.0.17
 */
export function maskTransform(value: string, options: MaskOptions): string;
export function maskTransform(state: ElementState, options: MaskOptions): ElementState;
export function maskTransform(valueOrState: string | ElementState, options: MaskOptions): string | ElementState {
  const resolved = resolveMaskOptions(options);
  const inputIsString = isString(valueOrState);
  const initial: ElementState = inputIsString
    ? { value: valueOrState, selection: [valueOrState.length, valueOrState.length] }
    : valueOrState;

  const pre = runPreprocessors(resolved.preprocessors, initial, '', 'validation');
  const model = new MaskModel(pre.elementState, resolved);
  const post = runPostprocessors(
    resolved.postprocessors,
    { value: model.value, selection: model.selection },
    initial,
  );

  return inputIsString ? post.value : post;
}

/**
 * @name unmask
 * @category Forms
 * @description The masked → raw bridge: strip a mask's fixed characters from a
 * masked string, without needing a DOM element. RegExp masks have no fixed
 * characters, so the value is returned unchanged.
 *
 * @example
 * unmask('+1 (123) 456-7890', maskPhoneOptions({ template: '+1 (###) ###-####' }));
 * // '1234567890'
 *
 * @since 0.0.17
 */
export function unmask(maskedValue: string, options: MaskOptions): string {
  const resolved = resolveMaskOptions(options);
  const state: ElementState = { value: maskedValue, selection: [maskedValue.length, maskedValue.length] };

  // Run preprocessors so preset normalizers (e.g. the number mask stripping
  // thousand separators/affixes) define the raw value too.
  const pre = runPreprocessors(resolved.preprocessors, state, '', 'validation');
  const mask = resolveMask(resolved.mask, pre.elementState);

  return removeFixedMaskCharacters(pre.elementState, mask).value;
}
