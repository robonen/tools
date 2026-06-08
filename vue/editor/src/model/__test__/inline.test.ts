import { describe, expect, it } from 'vitest';
import type { Inline } from '../inline';
import {
  addMarkInline,
  deleteTextInline,
  inlineText,
  insertTextInline,
  marksAt,
  normalizeInline,
  removeMarkInline,
} from '../inline';

const bold = { type: 'bold' };

describe('inline', () => {
  it('merges adjacent equal-mark runs and drops empties', () => {
    const input: Inline = [{ text: 'a', marks: [] }, { text: '', marks: [] }, { text: 'b', marks: [] }];
    expect(normalizeInline(input)).toEqual([{ text: 'ab', marks: [] }]);
  });

  it('inserts text at an offset', () => {
    expect(inlineText(insertTextInline([{ text: 'ac', marks: [] }], 1, 'b', []))).toBe('abc');
  });

  it('adds a mark over a range, splitting runs', () => {
    expect(addMarkInline([{ text: 'abc', marks: [] }], 1, 2, bold)).toEqual([
      { text: 'a', marks: [] },
      { text: 'b', marks: [bold] },
      { text: 'c', marks: [] },
    ]);
  });

  it('removes a mark over a range', () => {
    expect(removeMarkInline([{ text: 'abc', marks: [bold] }], 0, 3, 'bold')).toEqual([{ text: 'abc', marks: [] }]);
  });

  it('deletes a range', () => {
    expect(inlineText(deleteTextInline([{ text: 'abcd', marks: [] }], 1, 3))).toBe('ad');
  });

  it('reads marks at a caret as the preceding character marks', () => {
    const marked: Inline = [{ text: 'ab', marks: [bold] }, { text: 'c', marks: [] }];
    expect(marksAt(marked, 2)).toEqual([bold]);
    expect(marksAt(marked, 3)).toEqual([]);
  });
});
