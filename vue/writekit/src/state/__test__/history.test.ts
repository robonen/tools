import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HistoryEntry } from '../history';
import type { Step } from '../step';
import { createHistory } from '../history';

const caret = { type: 'text', anchor: { blockId: 'b1', offset: 0 }, focus: { blockId: 'b1', offset: 0 } } as never;

function typing(blockId: string, text: string): HistoryEntry {
  return {
    steps: [{ type: 'insertInline', blockId, offset: 0, content: [{ text, marks: [] }] } as Step],
    inverted: [{ type: 'deleteText', blockId, from: 0, to: text.length } as Step],
    selectionBefore: caret,
    selectionAfter: caret,
  };
}

function structural(blockId: string): HistoryEntry {
  return {
    steps: [{ type: 'removeBlock', blockId } as Step],
    inverted: [{ type: 'insertBlock', node: { id: blockId, type: 'paragraph', attrs: {}, content: [] }, index: 0 } as never],
    selectionBefore: caret,
    selectionAfter: caret,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('history coalescing', () => {
  it('merges a typing burst in one block into one undo press', () => {
    const history = createHistory();

    for (const ch of ['h', 'e', 'l', 'l', 'o']) {
      history.record(typing('b1', ch));
      vi.advanceTimersByTime(100);
    }

    const entry = history.undo()!;

    expect(entry.steps).toHaveLength(5);
    expect(history.canUndo()).toBe(false);
  });

  it('keeps the replay order: later keystrokes undo first', () => {
    const history = createHistory();

    history.record(typing('b1', 'a'));
    history.record(typing('b1', 'b'));

    const entry = history.undo()!;

    // `inverted` stays in application order; undo replays it reversed, so the
    // inverse of "b" must sit AFTER the inverse of "a".
    expect(entry.inverted.map(step => (step as { to: number }).to)).toEqual([1, 1]);
    expect(entry.steps.map(step => (step as { content: Array<{ text: string }> }).content[0]!.text)).toEqual(['a', 'b']);
  });

  it('starts a new group after the time window', () => {
    const history = createHistory({ coalesceMs: 500 });

    history.record(typing('b1', 'a'));
    vi.advanceTimersByTime(600);
    history.record(typing('b1', 'b'));

    history.undo();

    expect(history.canUndo()).toBe(true);
  });

  it('never merges across blocks', () => {
    const history = createHistory();

    history.record(typing('b1', 'a'));
    history.record(typing('b2', 'b'));

    history.undo();

    expect(history.canUndo()).toBe(true);
  });

  it('never merges structural changes', () => {
    const history = createHistory();

    history.record(typing('b1', 'a'));
    history.record(structural('b1'));
    history.record(typing('b1', 'b'));

    expect(history.undo()!.steps).toHaveLength(1);
    expect(history.undo()!.steps).toHaveLength(1);
    expect(history.undo()!.steps).toHaveLength(1);
  });

  it('breaks the chain on interrupt — a foreign transaction is a boundary', () => {
    // A remote setDoc or an undo between keystrokes must not be spliced into
    // one undo press with them.
    const history = createHistory();

    history.record(typing('b1', 'a'));
    history.interrupt();
    history.record(typing('b1', 'b'));

    history.undo();

    expect(history.canUndo()).toBe(true);
  });

  it('counts groups, not keystrokes, against maxSize', () => {
    const history = createHistory({ maxSize: 2 });

    // Two bursts of three keystrokes: two groups — both must survive.
    for (const ch of ['a', 'b', 'c'])
      history.record(typing('b1', ch));
    vi.advanceTimersByTime(1000);
    for (const ch of ['d', 'e', 'f'])
      history.record(typing('b1', ch));

    expect(history.undo()!.steps).toHaveLength(3);
    expect(history.undo()!.steps).toHaveLength(3);
    expect(history.canUndo()).toBe(false);
  });

  it('can be disabled outright', () => {
    const history = createHistory({ coalesceMs: 0 });

    history.record(typing('b1', 'a'));
    history.record(typing('b1', 'b'));

    history.undo();

    expect(history.canUndo()).toBe(true);
  });
});
