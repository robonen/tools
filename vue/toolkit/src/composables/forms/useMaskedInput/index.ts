import { computed, shallowRef, toValue, watch } from 'vue';
import { readInputState, writeInputState } from '@robonen/platform/browsers';
import type { TextFieldElement } from '@robonen/platform/browsers';
import { isMaskComplete, resolveMask } from '../mask/conform';
import {
  MASK_NOOP,
  MaskModel,
  maskTransform,
  normalizeMaskOptions,
  resolveMaskOptions,
  runPostprocessors,
  runPreprocessors,
  unmask,
} from '../mask/model';
import type { ElementState, MaskOptionInput, ResolvedMaskOptions } from '../mask/types';
import type { MaskInputBindings, UseMaskedInputOptions, UseMaskedInputReturn } from './types';

export type { MaskInputBindings, UseMaskedInputOptions, UseMaskedInputReturn } from './types';

/**
 * @name useMaskedInput
 * @category Forms
 * @description Headless input masking. Returns a `bind` object to spread onto an
 * `<input>`/`<textarea>` (`<input v-bind="bind">`) — it carries the template ref
 * and the event handlers, so there is no separate ref wiring. Conforms the value
 * on every keystroke (insert/delete/paste/IME) with a correct caret, and exposes
 * the `masked`/`unmasked` views plus a `complete` signal.
 *
 * @param {UseMaskedInputOptions} options The mask and behavior
 * @returns {UseMaskedInputReturn} `bind`, `masked`, `unmasked`, `complete`, `ensureFitsMask`, `setValue`
 *
 * @example
 * const phone = useMaskedInput({ mask: '+1 (###) ###-####' });
 * // <input v-bind="phone.bind">
 * // phone.unmasked.value → '1234567890'
 *
 * @example
 * const amount = useMaskedInput({
 *   mask: maskNumberOptions({ thousandSeparator: ',', precision: 2, prefix: '$' }),
 *   onAccept: ({ unmasked }) => save(unmasked),
 * });
 *
 * @since 0.0.17
 */
export function useMaskedInput(options: UseMaskedInputOptions): UseMaskedInputReturn {
  const masked = shallowRef('');
  const unmasked = shallowRef('');
  const element = shallowRef<TextFieldElement | null>(null);

  // Memoize the resolved options on the mask source: currentOptions() runs on
  // every event/handler and every `complete` read, but the result is a pure
  // function of the (referentially stable) mask source + overwriteMode.
  let cachedSource: MaskOptionInput | undefined;
  let cachedResolved: ResolvedMaskOptions | undefined;

  function currentOptions(): ResolvedMaskOptions {
    const source = toValue(options.mask);
    if (source !== cachedSource || cachedResolved === undefined) {
      cachedSource = source;
      const base = normalizeMaskOptions(source);
      cachedResolved = resolveMaskOptions({
        ...base,
        overwriteMode: options.overwriteMode ?? base.overwriteMode,
      });
    }
    return cachedResolved;
  }

  const complete = computed<boolean>(() => {
    const value = masked.value;
    const mask = resolveMask(currentOptions().mask, { value, selection: [value.length, value.length] });
    return isMaskComplete(value, mask);
  });

  function commit(el: TextFieldElement, state: ElementState, options_: ResolvedMaskOptions): void {
    writeInputState(el, state);

    if (masked.value === el.value)
      return;

    masked.value = el.value;
    unmasked.value = unmask(el.value, options_);
    options.onAccept?.({ masked: masked.value, unmasked: unmasked.value });
  }

  function ensureFitsMask(): void {
    const el = element.value;
    if (!el)
      return;

    const options_ = currentOptions();
    commit(el, maskTransform(readInputState(el), options_), options_);
  }

  function setValue(value: string): void {
    const options_ = currentOptions();
    const next = maskTransform({ value, selection: [value.length, value.length] }, options_);
    const el = element.value;

    if (el) {
      commit(el, next, options_);
      return;
    }

    // No element bound yet — keep the exposed refs in sync anyway.
    if (masked.value !== next.value) {
      masked.value = next.value;
      unmasked.value = unmask(next.value, options_);
      options.onAccept?.({ masked: masked.value, unmasked: unmasked.value });
    }
  }

  function onBeforeinput(event: InputEvent): void {
    const el = element.value;
    if (!el)
      return;

    const { inputType, data } = event;
    const options_ = currentOptions();
    const before = readInputState(el);

    try {
      let next: ElementState;

      if (inputType.startsWith('insert') && data !== null) {
        const pre = runPreprocessors(options_.preprocessors, before, data, 'insert');
        const model = new MaskModel(pre.elementState, options_);
        model.addCharacters(pre.data);
        next = runPostprocessors(options_.postprocessors, { value: model.value, selection: model.selection }, before);
      }
      else if (inputType.startsWith('delete')) {
        const isForward = inputType.toLowerCase().includes('forward');
        const pre = runPreprocessors(options_.preprocessors, before, '', isForward ? 'deleteForward' : 'deleteBackward');
        const model = new MaskModel(pre.elementState, options_);
        model.deleteCharacters(isForward);
        next = runPostprocessors(options_.postprocessors, { value: model.value, selection: model.selection }, before);
      }
      else {
        // Exotic input types (word delete, replacement, history) and composition
        // fall through to the `input` handler's full re-conform.
        return;
      }

      event.preventDefault();
      commit(el, next, options_);
    }
    catch (error) {
      if (error === MASK_NOOP) {
        event.preventDefault();
        return;
      }
      throw error;
    }
  }

  function onInput(): void {
    const el = element.value;
    // Re-entrancy guard: skip when the value already matches what we produced.
    if (!el || el.value === masked.value)
      return;

    ensureFitsMask();
  }

  const bind: MaskInputBindings = {
    ref: (el) => {
      element.value = (el as TextFieldElement | null) ?? null;
    },
    onInput,
    onBeforeinput,
    onCompositionend: ensureFitsMask,
  };

  // Initial calibration + re-conform when the element binds or the mask changes.
  watch(
    () => [element.value, toValue(options.mask)] as const,
    ([el]) => {
      if (el && options.initialCalibration !== false)
        ensureFitsMask();
    },
    { immediate: true, flush: 'post' },
  );

  return { masked, unmasked, complete, bind, ensureFitsMask, setValue };
}
