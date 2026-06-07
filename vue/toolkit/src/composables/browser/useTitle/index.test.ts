import { beforeEach, describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useTitle } from '.';

describe(useTitle, () => {
  beforeEach(() => {
    document.title = 'initial';
  });

  it('reads the current document title', () => {
    const scope = effectScope();
    let title: ReturnType<typeof useTitle>;
    scope.run(() => {
      title = useTitle();
    });
    expect(title!.value).toBe('initial');
    scope.stop();
  });

  it('writes the document title when the ref changes', async () => {
    const scope = effectScope();
    let title: ReturnType<typeof useTitle>;
    scope.run(() => {
      title = useTitle();
    });

    title!.value = 'updated';
    await nextTick();
    expect(document.title).toBe('updated');
    scope.stop();
  });

  it('applies a title template', () => {
    const scope = effectScope();
    scope.run(() => useTitle('Page', { titleTemplate: '%s | App' }));
    expect(document.title).toBe('Page | App');
    scope.stop();
  });

  it('replaces every %s occurrence in the template', () => {
    const scope = effectScope();
    scope.run(() => useTitle('X', { titleTemplate: '%s - %s' }));
    expect(document.title).toBe('X - X');
    scope.stop();
  });

  it('supports a function title template', () => {
    const scope = effectScope();
    scope.run(() => useTitle('Home', { titleTemplate: t => `[${t}]` }));
    expect(document.title).toBe('[Home]');
    scope.stop();
  });

  it('reacts to a writable ref source', async () => {
    const scope = effectScope();
    const source = ref('one');
    scope.run(() => useTitle(source));
    await nextTick();
    expect(document.title).toBe('one');
    scope.stop();
  });

  it('returns a read-only ref when a getter source is passed and tracks it', async () => {
    const scope = effectScope();
    const count = ref(0);
    let title: ReturnType<typeof useTitle>;
    scope.run(() => {
      title = useTitle(() => `Count ${count.value}`);
    });

    expect(document.title).toBe('Count 0');
    expect(title!.value).toBe('Count 0');

    count.value = 5;
    await nextTick();
    expect(document.title).toBe('Count 5');
    expect(title!.value).toBe('Count 5');
    scope.stop();
  });

  it('restores the original title on scope dispose', async () => {
    const scope = effectScope();
    scope.run(() => useTitle('Temp', { restoreOnUnmount: original => original }));
    await nextTick();
    expect(document.title).toBe('Temp');

    scope.stop();
    await nextTick();
    expect(document.title).toBe('initial');
  });

  it('keeps the last title when restoreOnUnmount is omitted', async () => {
    const scope = effectScope();
    scope.run(() => useTitle('Sticky'));
    await nextTick();
    expect(document.title).toBe('Sticky');

    scope.stop();
    await nextTick();
    expect(document.title).toBe('Sticky');
  });

  it('does not restore when restoreOnUnmount returns null', async () => {
    const scope = effectScope();
    scope.run(() => useTitle('Kept', { restoreOnUnmount: () => null }));
    await nextTick();
    expect(document.title).toBe('Kept');

    scope.stop();
    await nextTick();
    expect(document.title).toBe('Kept');
  });

  it('syncs external title changes back to the ref when observing', async () => {
    const scope = effectScope();
    let title: ReturnType<typeof useTitle>;
    scope.run(() => {
      title = useTitle(null, { observe: true });
    });
    await nextTick();

    const titleEl = document.head.querySelector('title');
    expect(titleEl).not.toBeNull();

    document.title = 'external';
    // Wait for the MutationObserver callback to flush
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(title!.value).toBe('external');
    scope.stop();
  });

  it('is a no-op without a document (SSR-safe)', () => {
    const scope = effectScope();
    let title: ReturnType<typeof useTitle>;
    scope.run(() => {
      title = useTitle('SSR', { document: undefined });
    });
    expect(title!.value).toBe('SSR');
    scope.stop();
  });
});
