import { computed, shallowRef, toValue, watchEffect } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument } from '@/types';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';

export interface UseFileDialogOptions extends ConfigurableDocument {
  /**
   * Allow selecting multiple files
   *
   * @default true
   */
  multiple?: MaybeRefOrGetter<boolean>;

  /**
   * Comma-separated list of accepted file types (the input's `accept` attribute)
   *
   * @default '*'
   */
  accept?: MaybeRefOrGetter<string>;

  /**
   * Hint for which camera/microphone to use on mobile capture (the input's `capture` attribute)
   */
  capture?: MaybeRefOrGetter<string>;

  /**
   * Reset the selected files each time `open()` is called
   *
   * @default false
   */
  reset?: MaybeRefOrGetter<boolean>;

  /**
   * Select directories instead of files (sets `webkitdirectory`)
   *
   * @default false
   */
  directory?: MaybeRefOrGetter<boolean>;

  /**
   * Initial files to seed `files` with before any dialog is opened
   */
  initialFiles?: File[] | FileList;

  /**
   * Use a custom `<input type="file">` element instead of an internally created one
   */
  input?: MaybeComputedElementRef<HTMLInputElement>;
}

/**
 * Subscribe to an event; returns an unsubscribe function.
 */
export type FileDialogEventHookOn<T = void> = (callback: (param: T) => void) => { off: () => void };

export interface UseFileDialogReturn {
  /**
   * The currently selected files, or `null` when none are selected
   */
  files: ComputedRef<FileList | null>;

  /**
   * Open the file dialog, optionally overriding options for this call only
   */
  open: (localOptions?: Partial<UseFileDialogOptions>) => void;

  /**
   * Clear the current selection
   */
  reset: () => void;

  /**
   * Register a callback fired when the selection changes
   */
  onChange: FileDialogEventHookOn<FileList | null>;

  /**
   * Register a callback fired when the dialog is dismissed without a selection
   */
  onCancel: FileDialogEventHookOn;
}

const DEFAULT_OPTIONS: UseFileDialogOptions = {
  multiple: true,
  accept: '*',
  reset: false,
  directory: false,
};

interface EventHook<T> {
  on: FileDialogEventHookOn<T>;
  trigger: (param: T) => void;
}

function createEventHook<T = void>(): EventHook<T> {
  const callbacks = new Set<(param: T) => void>();

  const on: FileDialogEventHookOn<T> = (callback) => {
    callbacks.add(callback);
    return {
      off: () => {
        callbacks.delete(callback);
      },
    };
  };

  const trigger = (param: T): void => {
    callbacks.forEach(cb => cb(param));
  };

  return { on, trigger };
}

function toFileList(files: File[] | FileList | undefined): FileList | null {
  if (!files)
    return null;

  if (typeof FileList !== 'undefined' && files instanceof FileList)
    return files;

  // Materialize a plain array into a FileList via DataTransfer when available.
  if (typeof DataTransfer !== 'undefined') {
    const dt = new DataTransfer();
    for (const file of files)
      dt.items.add(file);
    return dt.files;
  }

  // Fallback: build a FileList-like object (environments without DataTransfer, e.g. jsdom).
  const array = Array.from(files);
  const list = {
    length: array.length,
    item: (index: number) => array[index] ?? null,
    [Symbol.iterator]: () => array[Symbol.iterator](),
  } as unknown as FileList;
  array.forEach((file, index) => {
    (list as unknown as Record<number, File>)[index] = file;
  });
  return list;
}

/**
 * @name useFileDialog
 * @category Browser
 * @description Open a native file dialog programmatically and reactively track the selected files.
 *
 * @param {UseFileDialogOptions} [options={}] Options
 * @returns {UseFileDialogReturn} `files`, `open`, `reset`, `onChange`, and `onCancel`
 *
 * @example
 * const { files, open, onChange } = useFileDialog({ accept: 'image/*' });
 * onChange((selected) => console.log(selected));
 * open();
 *
 * @example
 * // Override options for a single call
 * const { open } = useFileDialog();
 * open({ multiple: false, accept: '.pdf' });
 *
 * @since 0.0.15
 */
export function useFileDialog(options: UseFileDialogOptions = {}): UseFileDialogReturn {
  const {
    document = defaultDocument,
  } = options;

  const files = shallowRef<FileList | null>(toFileList(options.initialFiles));

  const { on: onChange, trigger: changeTrigger } = createEventHook<FileList | null>();
  const { on: onCancel, trigger: cancelTrigger } = createEventHook();

  const inputRef = shallowRef<HTMLInputElement | undefined>();

  // Eagerly resolve the input element (custom or internally created) and wire its
  // handlers, re-running if a reactive `options.input` target changes.
  watchEffect(() => {
    const input = unrefElement(options.input)
      ?? (document ? document.createElement('input') : undefined);

    if (input) {
      input.type = 'file';
      input.onchange = (event: Event) => {
        const result = event.target as HTMLInputElement;
        files.value = result.files;
        changeTrigger(files.value);
      };
      input.oncancel = () => {
        cancelTrigger();
      };
    }

    inputRef.value = input;
  });

  const reset = (): void => {
    files.value = null;
    const el = inputRef.value;
    if (el && el.value) {
      el.value = '';
      changeTrigger(null);
    }
  };

  const applyOptions = (opts: UseFileDialogOptions): void => {
    const el = inputRef.value;
    if (!el)
      return;

    el.multiple = toValue(opts.multiple)!;
    el.accept = toValue(opts.accept)!;
    el.webkitdirectory = toValue(opts.directory)!;
    if ('capture' in opts)
      el.capture = toValue(opts.capture)!;
  };

  const open = (localOptions?: Partial<UseFileDialogOptions>): void => {
    const el = inputRef.value;
    if (!el)
      return;

    const mergedOptions: UseFileDialogOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
      ...localOptions,
    };

    applyOptions(mergedOptions);

    if (toValue(mergedOptions.reset))
      reset();

    el.click();
  };

  return {
    files: computed(() => files.value),
    open,
    reset,
    onChange,
    onCancel,
  };
}
