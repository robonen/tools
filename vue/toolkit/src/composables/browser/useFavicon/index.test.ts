import { beforeEach, describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useFavicon } from '.';

describe(useFavicon, () => {
  beforeEach(() => {
    document.head.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove());
  });

  it('creates a link element with the icon href', () => {
    const scope = effectScope();
    scope.run(() => useFavicon('/icon.png'));

    const link = document.head.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    expect(link).not.toBeNull();
    expect(link!.href).toContain('/icon.png');
    scope.stop();
  });

  it('updates the href when the ref changes', async () => {
    const scope = effectScope();
    let favicon: ReturnType<typeof useFavicon>;
    scope.run(() => {
      favicon = useFavicon('/a.png');
    });

    favicon!.value = '/b.png';
    await nextTick();

    const link = document.head.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    expect(link!.href).toContain('/b.png');
    scope.stop();
  });

  it('prepends the baseUrl', () => {
    const scope = effectScope();
    scope.run(() => useFavicon('icon.png', { baseUrl: 'https://cdn.example.com/' }));

    const link = document.head.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    expect(link!.href).toBe('https://cdn.example.com/icon.png');
    scope.stop();
  });

  it('sets the MIME type from the file extension', () => {
    const scope = effectScope();
    scope.run(() => useFavicon('/icon.svg'));

    const link = document.head.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    expect(link!.type).toBe('image/svg');
    scope.stop();
  });

  it('does not set a bogus MIME type for query-string or data hrefs', () => {
    const scope = effectScope();
    scope.run(() => useFavicon('/icon.png?v=2'));

    const link = document.head.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    expect(link!.href).toContain('/icon.png?v=2');
    expect(link!.type).toBe('');
    scope.stop();
  });

  it('does not set a bogus MIME type for extensionless hrefs', () => {
    const scope = effectScope();
    scope.run(() => useFavicon('/favicon'));

    const link = document.head.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    expect(link!.type).toBe('');
    scope.stop();
  });

  it('tracks a getter source reactively', async () => {
    const scope = effectScope();
    const dark = ref(false);
    scope.run(() => useFavicon(() => (dark.value ? '/dark.png' : '/light.png')));

    let link = document.head.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    expect(link!.href).toContain('/light.png');

    dark.value = true;
    await nextTick();

    link = document.head.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    expect(link!.href).toContain('/dark.png');
    scope.stop();
  });

  it('follows an external writable ref passed as source', async () => {
    const scope = effectScope();
    const source = ref('/one.png');
    let favicon: ReturnType<typeof useFavicon>;
    scope.run(() => {
      favicon = useFavicon(source);
    });

    // returned ref reflects the source
    expect(favicon!.value).toBe('/one.png');

    source.value = '/two.png';
    await nextTick();

    const link = document.head.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    expect(link!.href).toContain('/two.png');
    scope.stop();
  });

  it('respects a custom rel attribute', () => {
    const scope = effectScope();
    scope.run(() => useFavicon('/apple.png', { rel: 'apple-touch-icon' }));

    const link = document.head.querySelector<HTMLLinkElement>('link[rel*="apple-touch-icon"]');
    expect(link).not.toBeNull();
    expect(link!.href).toContain('/apple.png');
    link!.remove();
    scope.stop();
  });

  it('reuses existing matching link elements instead of creating new ones', async () => {
    const scope = effectScope();
    let favicon: ReturnType<typeof useFavicon>;
    scope.run(() => {
      favicon = useFavicon('/first.png');
    });

    favicon!.value = '/second.png';
    await nextTick();

    const links = document.head.querySelectorAll('link[rel*="icon"]');
    expect(links).toHaveLength(1);
    expect((links[0] as HTMLLinkElement).href).toContain('/second.png');
    scope.stop();
  });

  it('is SSR-safe when no document is available', () => {
    const scope = effectScope();
    expect(() => {
      scope.run(() => useFavicon('/icon.png', { document: undefined }));
    }).not.toThrow();
    scope.stop();
  });
});
