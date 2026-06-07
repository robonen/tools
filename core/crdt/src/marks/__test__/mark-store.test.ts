import { describe, expect, it } from 'vitest';
import { opId } from '../../clock';
import { MarkStore } from '..';

describe('markStore', () => {
  it('resolves overlapping spans by highest op id per character/type', () => {
    const chars = [opId('a', 1), opId('a', 2), opId('a', 3)];
    const store = new MarkStore();
    store.add({ id: opId('a', 10), type: 'bold', value: true, start: chars[0]!, end: chars[2]! });
    store.add({ id: opId('a', 11), type: 'bold', value: null, start: chars[1]!, end: chars[1]! });

    const active = store.resolve(chars);
    expect(active[0]!.get('bold')).toBe(true);
    expect(active[1]!.has('bold')).toBe(false); // cleared by the higher-id span
    expect(active[2]!.get('bold')).toBe(true);
  });

  it('converges regardless of span insertion order', () => {
    const chars = [opId('a', 1), opId('a', 2)];
    const spanA = { id: opId('a', 10), type: 'bold', value: true, start: chars[0]!, end: chars[1]! };
    const spanB = { id: opId('b', 10), type: 'bold', value: null, start: chars[0]!, end: chars[0]! };

    const first = new MarkStore();
    first.add(spanA);
    first.add(spanB);
    const second = new MarkStore();
    second.add(spanB);
    second.add(spanA);

    expect(first.resolve(chars).map(m => m.get('bold')))
      .toEqual(second.resolve(chars).map(m => m.get('bold')));
  });
});
