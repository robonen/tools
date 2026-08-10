import { describe, expect, it, vi } from 'vitest';
import { normalizeDocument } from '../normalize';
import { createSchema } from '../schema';

const schema = createSchema({
  nodes: new Map([
    ['paragraph', {
      content: { kind: 'text' as const },
      attrs: {
        condition: { default: null },
        level: { default: 1, validate: (v: unknown) => typeof v === 'number' && v >= 1 && v <= 6 },
      },
    }],
    ['bare', { content: { kind: 'atom' as const } }],
  ]),
  marks: new Map(),
});

describe('attr coercion', () => {
  it('keeps unknown attributes instead of erasing them', () => {
    // Coercion is not a whitelist: a document must round-trip through an
    // editor whose schema does not know every field — dropping them silently
    // erased consumer data, and the loss was autosaved before anyone saw it.
    const attrs = schema.coerceAttrs('paragraph', {
      condition: { op: 'flag', key: 'met' },
      futureField: 'still here',
    });

    expect(attrs.futureField).toBe('still here');
    expect(attrs.condition).toEqual({ op: 'flag', key: 'met' });
    expect(attrs.level).toBe(1);
  });

  it('keeps attrs even when the spec declares none', () => {
    expect(schema.coerceAttrs('bare', { anything: 1 })).toEqual({ anything: 1 });
  });

  it('runs validate and falls back to the default on a rejected value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // `validate` looked like enforcement and never ran; an out-of-range level
    // normalized cleanly and rendered <h99>.
    const attrs = schema.coerceAttrs('paragraph', { level: 99 });

    expect(attrs.level).toBe(1);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('accepts a value validate approves', () => {
    expect(schema.coerceAttrs('paragraph', { level: 3 }).level).toBe(3);
  });

  it('is idempotent — a second pass changes nothing', () => {
    const once = schema.coerceAttrs('paragraph', { level: 2, custom: [1, 2] });
    const twice = schema.coerceAttrs('paragraph', once);

    expect(twice).toEqual(once);
  });

  it('carries unknown attrs through normalizeDocument', () => {
    const doc = {
      content: [{
        id: 'b1',
        type: 'paragraph',
        attrs: { condition: { op: 'flag', key: 'met' }, futureField: true },
        content: [{ text: 'hi', marks: [] }],
      }],
    };

    const normalized = normalizeDocument(doc as never, schema);

    expect(normalized.content[0]!.attrs.futureField).toBe(true);
    expect(normalized.content[0]!.attrs.condition).toEqual({ op: 'flag', key: 'met' });
  });
});
