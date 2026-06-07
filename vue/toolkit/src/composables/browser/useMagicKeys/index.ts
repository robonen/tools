import type { AnyFunction } from '@robonen/stdlib';
import { isFunction, noop } from '@robonen/stdlib';
import type { ComputedRef, Ref, ShallowRef } from 'vue';
import { computed, reactive, shallowRef, toValue } from 'vue';
import { useEventListener } from '@/composables/browser/useEventListener';
import { defaultWindow } from '@/types';

export type UseMagicKeysAliasMap = Readonly<Record<string, string>>;

/**
 * Default lowercase alias map: maps common shorthand key names to their
 * canonical `KeyboardEvent.key` (lowercased) equivalents.
 */
export const DefaultMagicKeysAliasMap: UseMagicKeysAliasMap = /* #__PURE__ */ {
  ctrl: 'control',
  command: 'meta',
  cmd: 'meta',
  option: 'alt',
  opt: 'alt',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  esc: 'escape',
  space: ' ',
};

export interface UseMagicKeysOptions<Reactive extends boolean> {
  /**
   * Return a reactive object instead of an object of refs
   *
   * @default false
   */
  reactive?: Reactive;

  /**
   * Event target to attach the keyboard listeners to
   *
   * @default window
   */
  target?: EventTarget;

  /**
   * Alias map for keys, all keys should be lowercase
   * { foo: 'bar' } means that pressing `bar` will also trigger `foo`
   *
   * @default DefaultMagicKeysAliasMap
   */
  aliasMap?: UseMagicKeysAliasMap;

  /**
   * Register passive listeners
   *
   * @default true
   */
  passive?: boolean;

  /**
   * Custom event handler for the keyboard event. Useful for preventing default
   * behaviour for certain key combos. Called on every keydown and keyup.
   */
  onEventFired?: (event: KeyboardEvent) => void | boolean;
}

export interface UseMagicKeysReturn {
  /**
   * A Set of currently pressed keys (lowercase canonical names)
   */
  current: Set<string>;

  /**
   * Reset all tracked keys to `false` and clear the current Set
   */
  reset: () => void;
}

export type MagicKeys<Reactive extends boolean> = Readonly<
  Omit<
    Record<string, Reactive extends true ? boolean : ComputedRef<boolean>>,
    keyof UseMagicKeysReturn
  >
  & UseMagicKeysReturn
>;

type KeyRefs = Record<string, Ref<boolean> | ShallowRef<boolean> | ComputedRef<boolean>>;

/**
 * @name useMagicKeys
 * @category Browser
 * @description Reactive keys pressed state, with magical combination keys support via a Proxy.
 * Access combinations directly as properties, e.g. `keys['ctrl+a']` or `keys.ctrl_a`.
 *
 * @param {UseMagicKeysOptions} [options] Configuration options
 * @returns {MagicKeys} A Proxy of refs (or reactive booleans) plus `current` Set and `reset`
 *
 * @example
 * const keys = useMagicKeys();
 * const ctrlA = keys['ctrl+a'];
 * watch(ctrlA, v => { if (v) console.log('Ctrl + A pressed'); });
 *
 * @example
 * const { ctrl, a, current } = useMagicKeys({ reactive: true });
 *
 * @since 0.0.15
 */
export function useMagicKeys(options?: UseMagicKeysOptions<false>): MagicKeys<false>;
export function useMagicKeys(options: UseMagicKeysOptions<true>): MagicKeys<true>;
export function useMagicKeys(options: UseMagicKeysOptions<boolean> = {}): any {
  const {
    reactive: useReactive = false,
    target = defaultWindow,
    aliasMap = DefaultMagicKeysAliasMap,
    passive = true,
    onEventFired = noop as AnyFunction,
  } = options;

  const current = reactive(new Set<string>());
  const usedKeys = new Set<string>();
  // Keys pressed while Meta is held — on macOS, keyup is suppressed for other
  // keys while Cmd is down, so we clear them when Meta is released.
  const metaDeps = new Set<string>();

  function reset(): void {
    current.clear();

    for (const key of usedKeys)
      setRefs(key, false);
  }

  const obj: UseMagicKeysReturn = {
    current,
    reset,
  };

  const refs: KeyRefs = useReactive ? reactive(obj as any) : (obj as any);

  function setRefs(key: string, value: boolean): void {
    // Touch the proxy so the ref is materialized for keys we actually track,
    // even if the consumer hasn't accessed them yet.
    if (!(key in refs))
      void (proxy as any)[key];

    if (key in refs) {
      if (useReactive)
        (refs as any)[key] = value;
      else
        (refs[key] as Ref<boolean>).value = value;
    }
  }

  function updateRefs(event: KeyboardEvent, value: boolean): void {
    const key = event.key?.toLowerCase();
    const code = event.code?.toLowerCase();
    const values = [code, key].filter(Boolean) as string[];

    if (!key)
      return;

    if (value)
      current.add(key);
    else
      current.delete(key);

    for (const k of values) {
      usedKeys.add(k);
      setRefs(k, value);
    }

    if (key === 'meta' && !value) {
      // Cmd released on macOS: clear keys that were pressed during the chord
      metaDeps.forEach((k) => {
        current.delete(k);
        setRefs(k, false);
      });

      metaDeps.clear();
    }
    else if (isFunction(event.getModifierState) && event.getModifierState('Meta') && value) {
      [...current, ...values].forEach(k => metaDeps.add(k));
    }
  }

  if (target) {
    useEventListener(target, 'keydown', (event: KeyboardEvent) => {
      updateRefs(event, true);
      return onEventFired(event);
    }, { passive });

    useEventListener(target, 'keyup', (event: KeyboardEvent) => {
      updateRefs(event, false);
      return onEventFired(event);
    }, { passive });

    // Reset on blur so keys don't "stick" when focus leaves the page
    useEventListener('blur', reset, { passive: true });
    useEventListener('focus', reset, { passive: true });
  }

  const proxy = new Proxy(refs, {
    get(target, prop, receiver) {
      if (typeof prop !== 'string')
        return Reflect.get(target, prop, receiver);

      prop = prop.toLowerCase();

      // alias resolution
      if (prop in aliasMap)
        prop = aliasMap[prop] as string;

      // lazily create tracking ref for combos and single keys
      if (!(prop in refs)) {
        if (/[+_-]/.test(prop)) {
          const keys = prop.split(/[+_-]/g).map((i: string) => i.trim());
          refs[prop] = computed(() => keys.map(key => toValue((proxy as any)[key])).every(Boolean));
        }
        else {
          refs[prop] = shallowRef(false);
        }
      }

      const r = Reflect.get(target, prop, receiver);
      return useReactive ? toValue(r) : r;
    },
  });

  return proxy as any;
}
