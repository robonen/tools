import { afterEach, describe, expect, it } from 'vitest';
import { useBodyScrollLock } from '.';

describe(useBodyScrollLock, () => {
  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.touchAction = '';
  });

  it('locks body overflow', () => {
    const release = useBodyScrollLock();
    expect(document.body.style.overflow).toBe('hidden');
    release();
  });

  it('restores original overflow after release', () => {
    document.body.style.overflow = 'auto';
    const release = useBodyScrollLock();
    expect(document.body.style.overflow).toBe('hidden');
    release();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('reference-counts concurrent holders', () => {
    const r1 = useBodyScrollLock();
    const r2 = useBodyScrollLock();
    expect(document.body.style.overflow).toBe('hidden');

    r1();
    expect(document.body.style.overflow).toBe('hidden');

    r2();
    expect(document.body.style.overflow).toBe('');
  });

  it('release is idempotent', () => {
    const release = useBodyScrollLock();
    release();
    release();
    expect(document.body.style.overflow).toBe('');
  });
});
