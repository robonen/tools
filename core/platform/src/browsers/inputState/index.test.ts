import { describe, expect, it } from 'vitest';
import { readInputState, writeInputState } from './index';

function makeInput(value = ''): HTMLInputElement {
  const input = document.createElement('input');
  input.value = value;
  document.body.append(input);
  return input;
}

describe('readInputState', () => {
  it('reads value and selection', () => {
    const input = makeInput('hello');
    input.setSelectionRange(1, 3);

    expect(readInputState(input)).toEqual({ value: 'hello', selection: [1, 3] });
  });

  it('falls back to a collapsed caret at the end when selection is null', () => {
    const input = makeInput('abc');
    // Force a null selection (some input types report null).
    Object.defineProperty(input, 'selectionStart', { value: null });
    Object.defineProperty(input, 'selectionEnd', { value: null });

    expect(readInputState(input)).toEqual({ value: 'abc', selection: [3, 3] });
  });
});

describe('writeInputState', () => {
  it('writes the value', () => {
    const input = makeInput('a');
    writeInputState(input, { value: '(12)', selection: [4, 4] });

    expect(input.value).toBe('(12)');
  });

  it('moves the caret only while the element is focused', () => {
    const input = makeInput('12345');
    input.focus();
    writeInputState(input, { value: '12345', selection: [2, 4] });

    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(4);
  });

  it('does not reposition the caret when not focused', () => {
    const input = makeInput('12345');
    input.setSelectionRange(0, 0);
    input.blur();
    writeInputState(input, { value: '12345', selection: [3, 3] });

    // Unfocused: selection is left untouched by setSelectionRange.
    expect(input.selectionStart).toBe(0);
  });
});
