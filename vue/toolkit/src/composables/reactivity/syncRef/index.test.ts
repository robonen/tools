import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { syncRef } from '.';

describe(syncRef, () => {
  it('keeps both refs in sync two-way by default', () => {
    const left = ref('foo');
    const right = ref('bar');

    syncRef(left, right);

    // immediate sync: ltr propagates left -> right on setup
    expect(right.value).toBe('foo');

    left.value = 'left-change';
    expect(right.value).toBe('left-change');

    right.value = 'right-change';
    expect(left.value).toBe('right-change');
  });

  it('does not enter an infinite feedback loop', () => {
    const left = ref(0);
    const right = ref(0);

    syncRef(left, right);

    left.value = 1;
    expect(left.value).toBe(1);
    expect(right.value).toBe(1);

    right.value = 2;
    expect(left.value).toBe(2);
    expect(right.value).toBe(2);
  });

  it('respects direction: ltr (one-way left -> right)', () => {
    const left = ref('a');
    const right = ref('b');

    syncRef(left, right, { direction: 'ltr' });

    // immediate ltr sync
    expect(right.value).toBe('a');

    left.value = 'c';
    expect(right.value).toBe('c');

    // right does not propagate back to left
    right.value = 'd';
    expect(left.value).toBe('c');
  });

  it('respects direction: rtl (one-way right -> left)', () => {
    const left = ref('a');
    const right = ref('b');

    syncRef(left, right, { direction: 'rtl' });

    // immediate rtl sync
    expect(left.value).toBe('b');

    right.value = 'c';
    expect(left.value).toBe('c');

    // left does not propagate to right
    left.value = 'd';
    expect(right.value).toBe('c');
  });

  it('applies transforms for both directions', () => {
    const left = ref(10);
    const right = ref('0');

    syncRef(left, right, {
      transform: {
        ltr: value => String(value),
        rtl: value => Number(value),
      },
    });

    // immediate: left (10) -> right ('10')
    expect(right.value).toBe('10');

    left.value = 42;
    expect(right.value).toBe('42');

    right.value = '7';
    expect(left.value).toBe(7);
  });

  it('applies a one-way ltr transform', () => {
    const count = ref(0);
    const text = ref('');

    syncRef(count, text, {
      direction: 'ltr',
      transform: { ltr: value => `count: ${value}` },
    });

    expect(text.value).toBe('count: 0');

    count.value = 5;
    expect(text.value).toBe('count: 5');
  });

  it('skips the immediate sync when immediate is false', () => {
    const left = ref('initial-left');
    const right = ref('initial-right');

    syncRef(left, right, { immediate: false });

    // no initial sync
    expect(right.value).toBe('initial-right');
    expect(left.value).toBe('initial-left');

    left.value = 'updated';
    expect(right.value).toBe('updated');
  });

  it('stops synchronizing after stop() is called', () => {
    const left = ref(0);
    const right = ref(0);

    const { stop } = syncRef(left, right);

    left.value = 1;
    expect(right.value).toBe(1);

    stop();

    left.value = 2;
    right.value = 3;
    expect(right.value).toBe(3);
    expect(left.value).toBe(2);
  });

  it('supports async flush (pre) with nextTick', async () => {
    const left = ref('x');
    const right = ref('y');

    syncRef(left, right, { flush: 'pre', immediate: false });

    left.value = 'changed';
    // pre flush is async
    expect(right.value).toBe('y');

    await nextTick();
    expect(right.value).toBe('changed');

    right.value = 'back';
    await nextTick();
    expect(left.value).toBe('back');
  });

  it('syncs deep object changes when deep is enabled', () => {
    const left = ref({ nested: { count: 0 } });
    const right = ref({ nested: { count: 0 } });

    syncRef(left, right, { deep: true });

    left.value.nested.count = 5;
    expect(right.value.nested.count).toBe(5);
  });

  it('works inside an effect scope and is disposed with it', () => {
    const left = ref(0);
    const right = ref(0);
    const scope = effectScope();

    scope.run(() => {
      syncRef(left, right);
    });

    left.value = 1;
    expect(right.value).toBe(1);

    scope.stop();

    left.value = 2;
    // watchers torn down with the scope
    expect(right.value).toBe(1);
  });
});
