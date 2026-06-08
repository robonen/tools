import { describe, expect, it } from 'vitest';
import { computed, isRef, ref } from 'vue';
import type { Ref } from 'vue';
import { extendRef } from '.';

describe(extendRef, () => {
  it('returns the same ref instance', () => {
    const source = ref('content');
    const extended = extendRef(source, { foo: 'bar' });
    expect(extended).toBe(source);
    expect(isRef(extended)).toBeTruthy();
  });

  it('keeps the ref value accessible and writable', () => {
    const extended = extendRef(ref('content'), { foo: 'bar' });
    expect(extended.value).toBe('content');
    extended.value = 'updated';
    expect(extended.value).toBe('updated');
  });

  it('attaches static (non-ref) properties', () => {
    const extended = extendRef(ref(0), { foo: 'bar', n: 1 });
    expect(extended.foo).toBe('bar');
    expect(extended.n).toBe(1);
  });

  it('never overwrites the ref value via a "value" key in extend', () => {
    const extended = extendRef(ref('keep'), { value: 'overwrite' });
    expect(extended.value).toBe('keep');
  });

  it('unwraps ref-valued properties by default (read)', () => {
    const count = ref(0);
    const extended = extendRef(count, { double: computed(() => count.value * 2) });
    expect(extended.double).toBe(0);
    count.value = 4;
    expect(extended.double).toBe(8);
  });

  it('unwraps ref-valued properties with two-way write', () => {
    const inner = ref(1);
    // `unwrap` (default true) auto-`.value`s the property at runtime, so it reads/writes as a number.
    const extended = extendRef(ref(0), { inner }) as unknown as Ref<number> & { inner: number };
    expect(extended.inner).toBe(1);
    extended.inner = 5;
    expect(inner.value).toBe(5);
    expect(extended.inner).toBe(5);
  });

  it('keeps refs as refs when unwrap is false', () => {
    const inner = ref(1);
    // With `unwrap: false` the property stays a real ref at runtime.
    const extended = extendRef(ref(0), { inner }, { unwrap: false }) as unknown as Ref<number> & { inner: Ref<number> };
    expect(isRef(extended.inner)).toBeTruthy();
    expect(extended.inner.value).toBe(1);
    inner.value = 2;
    expect(extended.inner.value).toBe(2);
  });

  it('extended properties are non-enumerable by default', () => {
    const extended = extendRef(ref(0), { foo: 'bar' });
    expect(Object.keys(extended)).not.toContain('foo');
    expect(extended.foo).toBe('bar');
  });

  it('extended properties become enumerable with enumerable: true', () => {
    const extended = extendRef(ref(0), { foo: 'bar' }, { enumerable: true });
    expect(Object.keys(extended)).toContain('foo');
  });

  it('enumerable applies to unwrapped ref properties too', () => {
    const extended = extendRef(ref(0), { inner: ref(1) }, { enumerable: true });
    expect(Object.keys(extended)).toContain('inner');
    expect(extended.inner).toBe(1);
  });

  it('supports multiple properties of mixed kinds', () => {
    const r = ref(2);
    const extended = extendRef(ref('x'), {
      label: 'tag',
      live: r,
      frozen: 99,
    });
    expect(extended.label).toBe('tag');
    expect(extended.live).toBe(2);
    expect(extended.frozen).toBe(99);
    r.value = 3;
    expect(extended.live).toBe(3);
  });

  it('remains reactive after extension (value tracked by computed)', () => {
    const source = ref(1);
    const extended = extendRef(source, { meta: 'm' });
    const derived = computed(() => extended.value * 10);
    expect(derived.value).toBe(10);
    extended.value = 5;
    expect(derived.value).toBe(50);
  });
});
