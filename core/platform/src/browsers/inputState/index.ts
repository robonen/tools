/**
 * The editable state of a text field: its current text and selection bounds.
 * Framework-agnostic and structurally compatible with any `{ value, selection }`
 * pair (e.g. an input-masking engine's element state).
 */
export interface InputState {
  /**
   * The element's current `value`.
   */
  readonly value: string;
  /**
   * The selection as `[from, to]` (collapsed caret when `from === to`).
   */
  readonly selection: readonly [from: number, to: number];
}

/**
 * A text field whose value and selection can be read and written.
 */
export type TextFieldElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * @name readInputState
 * @category Browsers
 * @description Reads the value and current selection of an `<input>`/`<textarea>`
 * into a plain {@link InputState}. A `null` selection (some input types report it)
 * falls back to a collapsed caret at the end of the value.
 *
 * @param {TextFieldElement} element The input or textarea to read
 * @returns {InputState} The element's `{ value, selection }`
 *
 * @example
 * const { value, selection } = readInputState(inputEl);
 *
 * @since 0.0.5
 */
export function readInputState(element: TextFieldElement): InputState {
  const { value, selectionStart, selectionEnd } = element;
  const end = value.length;

  return {
    value,
    selection: [selectionStart ?? end, selectionEnd ?? end],
  };
}

/**
 * @name writeInputState
 * @category Browsers
 * @description Writes value and selection back to an `<input>`/`<textarea>`. The
 * value is only assigned when it actually changed (avoids spurious cursor jumps),
 * and the caret is moved **only while the element is focused** so programmatic
 * updates never steal or reposition focus. `setSelectionRange` is guarded because
 * some input types (`number`, `email`, `date`) forbid it.
 *
 * @param {TextFieldElement} element The input or textarea to update
 * @param {InputState} state The `{ value, selection }` to apply
 * @returns {void}
 *
 * @example
 * writeInputState(inputEl, { value: '(123)', selection: [5, 5] });
 *
 * @since 0.0.5
 */
export function writeInputState(element: TextFieldElement, state: InputState): void {
  const [from, to] = state.selection;

  if (element.value !== state.value)
    element.value = state.value;

  if (element.ownerDocument.activeElement !== element)
    return;

  try {
    element.setSelectionRange(from, to);
  }
  catch {
    // Input types like number/email/date throw on setSelectionRange — ignore.
  }
}
