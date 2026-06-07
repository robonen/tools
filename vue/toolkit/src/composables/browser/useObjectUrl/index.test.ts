import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useObjectUrl } from '.';

function createUrlStub() {
  let counter = 0;
  const createObjectURL = vi.fn((_object: Blob | MediaSource) => `blob:mock/${counter++}`);
  const revokeObjectURL = vi.fn((_url: string) => {});
  const window = { URL: { createObjectURL, revokeObjectURL } } as unknown as Window;

  return { window, createObjectURL, revokeObjectURL };
}

function makeBlob(content = 'hello') {
  return new Blob([content], { type: 'text/plain' });
}

describe(useObjectUrl, () => {
  it('creates an object URL for an initial value', () => {
    const { window, createObjectURL } = createUrlStub();
    const blob = makeBlob();
    const scope = effectScope();

    let url: ReturnType<typeof useObjectUrl>;
    scope.run(() => {
      url = useObjectUrl(shallowRef(blob), { window });
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(url!.value).toBe('blob:mock/0');

    scope.stop();
  });

  it('returns undefined when the source is null/undefined', () => {
    const { window, createObjectURL } = createUrlStub();
    const scope = effectScope();

    let url: ReturnType<typeof useObjectUrl>;
    scope.run(() => {
      url = useObjectUrl(shallowRef<Blob | undefined>(undefined), { window });
    });

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(url!.value).toBeUndefined();

    scope.stop();
  });

  it('revokes the previous URL and creates a new one when the source changes', async () => {
    const { window, createObjectURL, revokeObjectURL } = createUrlStub();
    const source = shallowRef<Blob | undefined>(makeBlob('a'));
    const scope = effectScope();

    let url: ReturnType<typeof useObjectUrl>;
    scope.run(() => {
      url = useObjectUrl(source, { window });
    });

    expect(url!.value).toBe('blob:mock/0');

    source.value = makeBlob('b');
    await nextTick();

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/0');
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(url!.value).toBe('blob:mock/1');

    scope.stop();
  });

  it('revokes and clears when the source becomes null', async () => {
    const { window, revokeObjectURL } = createUrlStub();
    const source = shallowRef<Blob | null>(makeBlob());
    const scope = effectScope();

    let url: ReturnType<typeof useObjectUrl>;
    scope.run(() => {
      url = useObjectUrl(source, { window });
    });

    expect(url!.value).toBe('blob:mock/0');

    source.value = null;
    await nextTick();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/0');
    expect(url!.value).toBeUndefined();

    scope.stop();
  });

  it('revokes the active URL on scope dispose', () => {
    const { window, revokeObjectURL } = createUrlStub();
    const scope = effectScope();

    let url: ReturnType<typeof useObjectUrl>;
    scope.run(() => {
      url = useObjectUrl(shallowRef(makeBlob()), { window });
    });

    expect(url!.value).toBe('blob:mock/0');
    expect(revokeObjectURL).not.toHaveBeenCalled();

    scope.stop();

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/0');
  });

  it('accepts a getter source', async () => {
    const { window, createObjectURL } = createUrlStub();
    const source = shallowRef<Blob | undefined>(undefined);
    const scope = effectScope();

    let url: ReturnType<typeof useObjectUrl>;
    scope.run(() => {
      url = useObjectUrl(() => source.value, { window });
    });

    expect(url!.value).toBeUndefined();

    source.value = makeBlob();
    await nextTick();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(url!.value).toBe('blob:mock/0');

    scope.stop();
  });

  it('returns a read-only ref', () => {
    const { window } = createUrlStub();
    const scope = effectScope();

    let url: ReturnType<typeof useObjectUrl>;
    scope.run(() => {
      url = useObjectUrl(shallowRef(makeBlob()), { window });
    });

    // shallowReadonly should warn and not mutate when written to
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // @ts-expect-error read-only ref
    url!.value = 'mutated';
    expect(url!.value).toBe('blob:mock/0');
    warn.mockRestore();

    scope.stop();
  });

  it('does nothing in an unsupported / SSR environment (no window)', () => {
    const scope = effectScope();

    // Simulate SSR: no `window` available. Destructuring defaults only kick in
    // for `undefined`, so pass an explicit `null` to mirror `defaultWindow`
    // being `undefined` on the server (the guard treats any falsy window the same).
    let url: ReturnType<typeof useObjectUrl>;
    scope.run(() => {
      url = useObjectUrl(shallowRef(makeBlob()), { window: null as unknown as Window });
    });

    expect(url!.value).toBeUndefined();

    // disposing must not throw even though there is no window
    expect(() => scope.stop()).not.toThrow();
  });
});
