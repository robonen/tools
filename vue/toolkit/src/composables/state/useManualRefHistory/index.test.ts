import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useManualRefHistory } from '.';

describe(useManualRefHistory, () => {
  it('starts with a single record snapshotting the initial value', () => {
    const source = ref(0);
    const { history, last, canUndo, canRedo } = useManualRefHistory(source);

    expect(history.value).toHaveLength(1);
    expect(history.value[0]!.snapshot).toBe(0);
    expect(last.value.snapshot).toBe(0);
    expect(canUndo.value).toBeFalsy();
    expect(canRedo.value).toBeFalsy();
  });

  it('attaches a timestamp to each record', () => {
    const now = 1_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const source = ref(0);
    const { last } = useManualRefHistory(source);

    expect(last.value.timestamp).toBe(now);
    vi.restoreAllMocks();
  });

  it('only records snapshots when commit is called', () => {
    const source = ref(0);
    const { history, commit } = useManualRefHistory(source);

    source.value = 1;
    expect(history.value).toHaveLength(1);
    expect(history.value[0]!.snapshot).toBe(0);

    commit();
    expect(history.value).toHaveLength(2);
    expect(history.value[0]!.snapshot).toBe(1);
    expect(history.value[1]!.snapshot).toBe(0);
  });

  it('exposes the most recent record first in history', () => {
    const source = ref('a');
    const { history, commit } = useManualRefHistory(source);

    source.value = 'b';
    commit();
    source.value = 'c';
    commit();

    expect(history.value.map(r => r.snapshot)).toEqual(['c', 'b', 'a']);
  });

  it('undoes to the previous committed value', () => {
    const source = ref(0);
    const { commit, undo, canUndo, canRedo } = useManualRefHistory(source);

    source.value = 1;
    commit();
    expect(canUndo.value).toBeTruthy();

    undo();
    expect(source.value).toBe(0);
    expect(canUndo.value).toBeFalsy();
    expect(canRedo.value).toBeTruthy();
  });

  it('redoes a previously undone value', () => {
    const source = ref(0);
    const { commit, undo, redo, canRedo } = useManualRefHistory(source);

    source.value = 1;
    commit();
    undo();
    expect(source.value).toBe(0);

    redo();
    expect(source.value).toBe(1);
    expect(canRedo.value).toBeFalsy();
  });

  it('is a no-op when undoing or redoing with empty stacks', () => {
    const source = ref(5);
    const { undo, redo } = useManualRefHistory(source);

    undo();
    redo();
    expect(source.value).toBe(5);
  });

  it('clears the redo stack on a new commit', () => {
    const source = ref(0);
    const { commit, undo, canRedo } = useManualRefHistory(source);

    source.value = 1;
    commit();
    undo();
    expect(canRedo.value).toBeTruthy();

    source.value = 2;
    commit();
    expect(canRedo.value).toBeFalsy();
  });

  it('clear empties both stacks but keeps last', () => {
    const source = ref(0);
    const { commit, clear, history, last, canUndo, canRedo } = useManualRefHistory(source);

    source.value = 1;
    commit();
    source.value = 2;
    commit();

    clear();
    expect(canUndo.value).toBeFalsy();
    expect(canRedo.value).toBeFalsy();
    expect(history.value).toHaveLength(1);
    expect(last.value.snapshot).toBe(2);
  });

  it('reset restores the source to the last committed snapshot', () => {
    const source = ref(0);
    const { commit, reset } = useManualRefHistory(source);

    source.value = 1;
    commit();
    source.value = 999;

    reset();
    expect(source.value).toBe(1);
  });

  it('respects the capacity option', () => {
    const source = ref(0);
    const { commit, undoStack, history } = useManualRefHistory(source, { capacity: 2 });

    for (let i = 1; i <= 5; i++) {
      source.value = i;
      commit();
    }

    expect(undoStack.value).toHaveLength(2);
    // last (5) + 2 undo records
    expect(history.value.map(r => r.snapshot)).toEqual([5, 4, 3]);
  });

  it('does not clone snapshots by default (shares references)', () => {
    const source = ref({ count: 0 });
    const { commit, history } = useManualRefHistory(source);

    commit();
    expect(history.value[0]!.snapshot).toBe(source.value);
  });

  it('deep clones snapshots when clone: true', () => {
    const obj = { count: 0 };
    const source = ref(obj);
    const { commit, history } = useManualRefHistory(source, { clone: true });

    commit();
    const snapshot = history.value[0]!.snapshot;

    expect(snapshot).toEqual(obj);
    expect(snapshot).not.toBe(obj);
  });

  it('clone deep-isolates undo restoration from later source mutation', () => {
    const source = ref({ value: 'initial' });
    const { commit, undo } = useManualRefHistory(source, { clone: true });

    source.value = { value: 'changed' };
    commit();
    source.value.value = 'mutated';

    undo();
    expect(source.value.value).toBe('initial');
  });

  it('accepts a custom clone function', () => {
    const clone = vi.fn((v: { n: number }) => ({ n: v.n }));
    const source = ref({ n: 1 });
    const { commit } = useManualRefHistory(source, { clone });

    commit();
    expect(clone).toHaveBeenCalled();
  });

  it('supports custom dump and parse serialization', () => {
    const source = ref({ a: 1 });
    const { commit, undo, history } = useManualRefHistory<{ a: number }, string>(source, {
      dump: v => JSON.stringify(v),
      parse: s => JSON.parse(s) as { a: number },
    });

    source.value = { a: 2 };
    commit();
    expect(history.value[0]!.snapshot).toBe('{"a":2}');

    undo();
    expect(source.value).toEqual({ a: 1 });
  });

  it('supports a custom setSource', () => {
    const source = ref(0);
    const setSource = vi.fn((s: typeof source, v: number) => {
      s.value = v;
    });
    const { commit, undo } = useManualRefHistory(source, { setSource });

    source.value = 1;
    commit();
    undo();

    expect(setSource).toHaveBeenCalled();
    expect(source.value).toBe(0);
  });

  it('returns the original source ref', () => {
    const source = ref(0);
    const result = useManualRefHistory(source);
    expect(result.source).toBe(source);
  });

  it('works in an SSR-like environment without DOM globals', () => {
    // No window/document/navigator are touched by this composable; verify it
    // operates purely on the ref it is given.
    const source = ref(42);
    const { commit, undo, history } = useManualRefHistory(source);

    source.value = 43;
    commit();
    expect(history.value).toHaveLength(2);

    undo();
    expect(source.value).toBe(42);
  });
});
