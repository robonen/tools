import { computed, shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface DocumentPictureInPictureOptions {
  /**
   * The initial width of the Picture-in-Picture window, in pixels.
   */
  width?: number;

  /**
   * The initial height of the Picture-in-Picture window, in pixels.
   */
  height?: number;

  /**
   * Hide the "back to tab" button in the Picture-in-Picture window.
   *
   * @default false
   */
  disallowReturnToOpener?: boolean;

  /**
   * Open the window in its default position/size rather than reusing the last one.
   *
   * @default false
   */
  preferInitialWindowPlacement?: boolean;
}

interface DocumentPictureInPicture {
  readonly window: Window | null;
  requestWindow: (options?: DocumentPictureInPictureOptions) => Promise<Window>;
}

interface WindowWithDocumentPiP {
  documentPictureInPicture: DocumentPictureInPicture;
}

export interface UseDocumentPiPOptions extends ConfigurableWindow {
  /**
   * Called when `open()` rejects (e.g. not triggered by a user gesture) instead
   * of throwing. The same value is also stored in the returned `error` ref.
   *
   * @default noop
   */
  onError?: (error: unknown) => void;
}

export interface UseDocumentPiPReturn {
  /**
   * Whether the [Document Picture-in-Picture API](https://developer.mozilla.org/en-US/docs/Web/API/DocumentPictureInPicture) is supported
   */
  isSupported: ComputedRef<boolean>;

  /**
   * The active Picture-in-Picture `Window`, or `null` when none is open
   */
  pipWindow: ShallowRef<Window | null>;

  /**
   * Whether a Picture-in-Picture window is currently open
   */
  isOpen: ComputedRef<boolean>;

  /**
   * The last error thrown by `open()`, or `null`
   */
  error: ShallowRef<unknown | null>;

  /**
   * Open a Picture-in-Picture window. Must be called from a user gesture.
   * Resolves with the new `Window`, or `undefined` when unsupported.
   */
  open: (pipOptions?: DocumentPictureInPictureOptions) => Promise<Window | undefined>;

  /**
   * Close the active Picture-in-Picture window, if any
   */
  close: () => void;
}

/**
 * @name useDocumentPiP
 * @category Browser
 * @description Reactive wrapper around the [Document Picture-in-Picture API](https://developer.mozilla.org/en-US/docs/Web/API/DocumentPictureInPicture) for rendering arbitrary DOM in an always-on-top window.
 *
 * @param {UseDocumentPiPOptions} [options={}] Options
 * @param {Function} [options.onError=noop] Error callback invoked instead of throwing
 * @param {Window} [options.window=defaultWindow] Custom `window` instance
 * @returns {UseDocumentPiPReturn} `isSupported`, `pipWindow`, `isOpen`, `error`, `open()`, and `close()`
 *
 * @example
 * const { isSupported, pipWindow, open } = useDocumentPiP();
 * async function popOut(content: HTMLElement) {
 *   const win = await open({ width: 320, height: 240 });
 *   win?.document.body.append(content);
 * }
 *
 * @example
 * // Move a player into the PiP window and track open state
 * const { isOpen, pipWindow, open, close } = useDocumentPiP();
 * watchEffect(() => {
 *   if (pipWindow.value)
 *     pipWindow.value.document.body.append(playerEl);
 * });
 *
 * @since 0.0.15
 */
export function useDocumentPiP(options: UseDocumentPiPOptions = {}): UseDocumentPiPReturn {
  const {
    window = defaultWindow,
    onError = noop,
  } = options;

  const isSupported = useSupported(() => !!window && 'documentPictureInPicture' in window);
  const pipWindow = shallowRef<Window | null>(null);
  const error = shallowRef<unknown | null>(null);

  const isOpen = computed<boolean>(() => pipWindow.value !== null);

  function handleClose(): void {
    pipWindow.value = null;
  }

  async function open(pipOptions?: DocumentPictureInPictureOptions): Promise<Window | undefined> {
    if (!isSupported.value || !window)
      return undefined;

    error.value = null;

    try {
      const controller = (window as unknown as WindowWithDocumentPiP).documentPictureInPicture;
      const pip = await controller.requestWindow(pipOptions);

      // The PiP window closing (user or programmatic) clears our reference.
      pip.addEventListener('pagehide', handleClose, { once: true });
      pipWindow.value = pip;

      return pip;
    }
    catch (err) {
      error.value = err;
      onError(err);

      return undefined;
    }
  }

  function close(): void {
    pipWindow.value?.close();
    pipWindow.value = null;
  }

  tryOnScopeDispose(close);

  return {
    isSupported,
    pipWindow,
    isOpen,
    error,
    open,
    close,
  };
}
