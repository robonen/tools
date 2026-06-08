import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, toValue, watch } from 'vue';
import { DefaultMagicKeysAliasMap, useMagicKeys } from '.';

function keydown(key: string, init: KeyboardEventInit = {}, target: EventTarget = globalThis) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }));
}

function keyup(key: string, init: KeyboardEventInit = {}, target: EventTarget = globalThis) {
  target.dispatchEvent(new KeyboardEvent('keyup', { key, ...init }));
}

describe(useMagicKeys, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tracks a single pressed key', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys();

      expect(keys.a!.value).toBeFalsy();

      keydown('a');
      expect(keys.a!.value).toBeTruthy();

      keyup('a');
      expect(keys.a!.value).toBeFalsy();
    });

    scope.stop();
  });

  it('exposes the current Set of pressed keys', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys();

      keydown('a');
      keydown('b');

      expect([...keys.current]).toEqual(['a', 'b']);

      keyup('a');
      expect([...keys.current]).toEqual(['b']);
    });

    scope.stop();
  });

  it('supports combinations via proxy property (ctrl+a)', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys();
      const ctrlA = keys['ctrl+a']!;

      expect(ctrlA.value).toBeFalsy();

      keydown('Control');
      expect(ctrlA.value).toBeFalsy();

      keydown('a');
      expect(ctrlA.value).toBeTruthy();

      keyup('a');
      expect(ctrlA.value).toBeFalsy();
    });

    scope.stop();
  });

  it('supports combos with _ and - delimiters', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys();
      const underscore = keys.ctrl_a!;
      const dash = keys['ctrl-a']!;

      keydown('Control');
      keydown('a');

      expect(underscore.value).toBeTruthy();
      expect(dash.value).toBeTruthy();
    });

    scope.stop();
  });

  it('resolves aliases (cmd -> meta, esc -> escape)', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys();

      keydown('Meta');
      expect(keys.cmd!.value).toBeTruthy();
      expect(keys.command!.value).toBeTruthy();
      expect(keys.meta!.value).toBeTruthy();

      keyup('Meta');

      keydown('Escape');
      expect(keys.esc!.value).toBeTruthy();
    });

    scope.stop();
  });

  it('respects a custom aliasMap', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys({ aliasMap: { fire: 'f' } });

      keydown('f');
      expect(keys.fire!.value).toBeTruthy();
    });

    scope.stop();
  });

  it('is case-insensitive on property access', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys();

      keydown('a');
      expect(keys.A!.value).toBeTruthy();
    });

    scope.stop();
  });

  it('tracks event.code as well as key', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys();

      keydown('a', { code: 'KeyA' });
      expect((keys as any).keya.value).toBeTruthy();

      keyup('a', { code: 'KeyA' });
      expect((keys as any).keya.value).toBeFalsy();
    });

    scope.stop();
  });

  it('reactive mode returns plain booleans', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys({ reactive: true });

      expect(keys.a).toBeFalsy();

      keydown('a');
      expect(keys.a).toBeTruthy();
    });

    scope.stop();
  });

  it('reset() clears the current Set and all refs', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys();

      keydown('a');
      keydown('b');
      expect(keys.a!.value).toBeTruthy();

      keys.reset();

      expect(keys.a!.value).toBeFalsy();
      expect(keys.b!.value).toBeFalsy();
      expect(keys.current.size).toBe(0);
    });

    scope.stop();
  });

  it('resets on blur so keys do not stick', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys();

      keydown('a');
      expect(keys.a!.value).toBeTruthy();

      globalThis.dispatchEvent(new Event('blur'));
      expect(keys.a!.value).toBeFalsy();
      expect(keys.current.size).toBe(0);
    });

    scope.stop();
  });

  it('clears meta-dependent keys when Meta is released (macOS behaviour)', () => {
    const scope = effectScope();

    scope.run(() => {
      const keys = useMagicKeys();

      // Press Cmd, then 'a' while Cmd held (getModifierState reports Meta)
      keydown('Meta');
      keydown('a', { metaKey: true });

      expect(keys.a!.value).toBeTruthy();
      expect(keys.current.has('a')).toBeTruthy();

      // Releasing Meta should drop 'a' too (no keyup fires for it on macOS)
      keyup('Meta');

      expect(keys.meta!.value).toBeFalsy();
      expect(keys.a!.value).toBeFalsy();
      expect(keys.current.has('a')).toBeFalsy();
    });

    scope.stop();
  });

  it('invokes onEventFired for keydown and keyup', () => {
    const scope = effectScope();

    scope.run(() => {
      const onEventFired = vi.fn();
      useMagicKeys({ onEventFired });

      keydown('a');
      keyup('a');

      expect(onEventFired).toHaveBeenCalledTimes(2);
      expect(onEventFired.mock.calls[0]![0]).toBeInstanceOf(KeyboardEvent);
    });

    scope.stop();
  });

  it('attaches to a custom target', () => {
    const scope = effectScope();

    scope.run(() => {
      const el = document.createElement('div');
      const keys = useMagicKeys({ target: el });

      keydown('a', {}, el);
      expect(keys.a!.value).toBeTruthy();

      // window events should not affect a custom target
      keyup('a', {}, el);
      keydown('b');
      expect(keys.b!.value).toBeFalsy();
    });

    scope.stop();
  });

  it('combination refs are reactive (computed)', async () => {
    const scope = effectScope();

    await scope.run(async () => {
      const keys = useMagicKeys();
      const combo = keys['shift+a']!;

      const seen: boolean[] = [];
      watch(combo, v => seen.push(v));

      keydown('Shift');
      keydown('a');
      await nextTick();

      expect(toValue(combo)).toBeTruthy();
      expect(seen).toContain(true);
    });

    scope.stop();
  });

  it('exposes DefaultMagicKeysAliasMap with expected aliases', () => {
    expect(DefaultMagicKeysAliasMap.ctrl).toBe('control');
    expect(DefaultMagicKeysAliasMap.cmd).toBe('meta');
    expect(DefaultMagicKeysAliasMap.command).toBe('meta');
    expect(DefaultMagicKeysAliasMap.option).toBe('alt');
    expect(DefaultMagicKeysAliasMap.up).toBe('arrowup');
  });

  it('does not throw and returns an object when window is absent (SSR path)', () => {
    // No target available -> listeners are skipped, refs still usable
    const keys = useMagicKeys({ target: undefined as unknown as EventTarget });

    expect(keys.current.size).toBe(0);
    // accessing a key lazily creates a ref defaulting to false
    expect(keys.a!.value).toBeFalsy();
  });
});
