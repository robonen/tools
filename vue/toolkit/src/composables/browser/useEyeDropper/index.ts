import { shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useSupported } from '@/composables/browser/useSupported';

export interface EyeDropperOpenOptions {
  /**
   * An `AbortSignal` that can be used to cancel the operation.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
   */
  signal?: AbortSignal;
}

export interface EyeDropperResult {
  /**
   * The selected color, in sRGB hexadecimal format (e.g. `#a1b2c3`).
   */
  sRGBHex: string;
}

export interface EyeDropper {
  open: (options?: EyeDropperOpenOptions) => Promise<EyeDropperResult>;
  [Symbol.toStringTag]: 'EyeDropper';
}

export type EyeDropperConstructor = new () => EyeDropper;

export interface UseEyeDropperOptions extends ConfigurableWindow {
  /**
   * Initial `sRGBHex` value before any color has been picked.
   *
   * @default ''
   */
  initialValue?: string;
}

export interface UseEyeDropperReturn {
  /**
   * Whether the [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper) is supported
   */
  isSupported: ComputedRef<boolean>;

  /**
   * The most recently picked color, in sRGB hexadecimal format
   */
  sRGBHex: ShallowRef<string>;

  /**
   * Open the eyedropper and let the user pick a color. Resolves with the
   * result, or `undefined` when the API is unsupported.
   */
  open: (openOptions?: EyeDropperOpenOptions) => Promise<EyeDropperResult | undefined>;
}

/**
 * @name useEyeDropper
 * @category Browser
 * @description Reactive wrapper around the [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper) for picking colors from the screen.
 *
 * @param {UseEyeDropperOptions} [options={}] Options
 * @returns {UseEyeDropperReturn} `isSupported`, `sRGBHex`, and `open()`
 *
 * @example
 * const { isSupported, sRGBHex, open } = useEyeDropper();
 * if (isSupported.value)
 *   await open();
 *
 * @since 0.0.15
 */
export function useEyeDropper(options: UseEyeDropperOptions = {}): UseEyeDropperReturn {
  const {
    window = defaultWindow,
    initialValue = '',
  } = options;

  const isSupported = useSupported(() => !!window && 'EyeDropper' in window);
  const sRGBHex = shallowRef(initialValue);

  async function open(openOptions?: EyeDropperOpenOptions): Promise<EyeDropperResult | undefined> {
    if (!isSupported.value || !window)
      return;

    const EyeDropperCtor = (window as unknown as { EyeDropper: EyeDropperConstructor }).EyeDropper;
    const eyeDropper = new EyeDropperCtor();
    const result = await eyeDropper.open(openOptions);
    sRGBHex.value = result.sRGBHex;

    return result;
  }

  return {
    isSupported,
    sRGBHex,
    open,
  };
}
