import { computed, shallowRef, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';

/**
 * `window.showOpenFilePicker` parameters.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker#parameters
 */
export interface FileSystemAccessShowOpenFileOptions {
  multiple?: boolean;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
  excludeAcceptAllOption?: boolean;
}

/**
 * `window.showSaveFilePicker` parameters.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker#parameters
 */
export interface FileSystemAccessShowSaveFileOptions {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
  excludeAcceptAllOption?: boolean;
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
 */
export interface FileSystemWritableFileStreamWrite {
  (data: string | BufferSource | Blob): Promise<void>;
  (options: { type: 'write'; position: number; data: string | BufferSource | Blob }): Promise<void>;
  (options: { type: 'seek'; position: number }): Promise<void>;
  (options: { type: 'truncate'; size: number }): Promise<void>;
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream
 */
export interface FileSystemWritableFileStream extends WritableStream {
  write: FileSystemWritableFileStreamWrite;
  seek: (position: number) => Promise<void>;
  truncate: (size: number) => Promise<void>;
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle
 */
export interface FileSystemFileHandle {
  getFile: () => Promise<File>;
  createWritable: () => Promise<FileSystemWritableFileStream>;
}

/**
 * A `window` augmented with the File System Access API entry points.
 */
export type FileSystemAccessWindow
  = Window & {
    showSaveFilePicker: (options: FileSystemAccessShowSaveFileOptions) => Promise<FileSystemFileHandle>;
    showOpenFilePicker: (options: FileSystemAccessShowOpenFileOptions) => Promise<FileSystemFileHandle[]>;
  };

/**
 * The supported file data types.
 */
export type UseFileSystemAccessDataType = 'Text' | 'ArrayBuffer' | 'Blob';

/**
 * Picker options shared between open/create/save operations.
 */
export type UseFileSystemAccessCommonOptions
  = Pick<FileSystemAccessShowOpenFileOptions, 'types' | 'excludeAcceptAllOption'>;

/**
 * Picker options accepted by save-style operations.
 */
export type UseFileSystemAccessShowSaveFileOptions
  = Pick<FileSystemAccessShowSaveFileOptions, 'suggestedName'> & UseFileSystemAccessCommonOptions;

export type UseFileSystemAccessOptions
  = ConfigurableWindow & UseFileSystemAccessCommonOptions & {
    /**
     * How the file contents are read into `data`.
     *
     * @default 'Text'
     */
    dataType?: MaybeRefOrGetter<UseFileSystemAccessDataType>;

    /**
     * Called when a picker or file operation fails.
     *
     * User-cancelled pickers reject with an `AbortError`; route them here to
     * keep them out of the global unhandled-rejection channel.
     *
     * @default noop
     */
    onError?: (error: unknown) => void;
  };

export interface UseFileSystemAccessReturn<T = string | ArrayBuffer | Blob> {
  /**
   * Whether the File System Access API is available.
   */
  isSupported: ComputedRef<boolean>;

  /**
   * The current file contents, read according to `dataType`.
   */
  data: ShallowRef<T | undefined>;

  /**
   * The currently bound `File`, or `undefined` when no file is open.
   */
  file: ShallowRef<File | undefined>;

  /**
   * The current file name (empty string when no file is open).
   */
  fileName: ComputedRef<string>;

  /**
   * The current file MIME type (empty string when no file is open).
   */
  fileMIME: ComputedRef<string>;

  /**
   * The current file size in bytes (`0` when no file is open).
   */
  fileSize: ComputedRef<number>;

  /**
   * The current file's last-modified timestamp (`0` when no file is open).
   */
  fileLastModified: ComputedRef<number>;

  /**
   * Show the open-file picker and load the chosen file.
   */
  open: (options?: UseFileSystemAccessCommonOptions) => Promise<void>;

  /**
   * Show the save-file picker to create a new, empty file handle.
   */
  create: (options?: UseFileSystemAccessShowSaveFileOptions) => Promise<void>;

  /**
   * Write `data` back to the current handle (falls back to `saveAs` when none).
   */
  save: (options?: UseFileSystemAccessShowSaveFileOptions) => Promise<void>;

  /**
   * Show the save-file picker, then write `data` to the chosen handle.
   */
  saveAs: (options?: UseFileSystemAccessShowSaveFileOptions) => Promise<void>;

  /**
   * Re-read `data` (and metadata) from the current handle.
   */
  updateData: () => Promise<void>;
}

/**
 * @name useFileSystemAccess
 * @category Browser
 * @description Create, read, and write local files via the File System Access API.
 *
 * @param {UseFileSystemAccessOptions} [options={}] Options including `dataType`, `types`, `excludeAcceptAllOption`, and `onError`
 * @returns {UseFileSystemAccessReturn} `isSupported`, `data`, `file`, `fileName`, `fileMIME`, `fileSize`, `fileLastModified`, `open`, `create`, `save`, `saveAs`, `updateData`
 *
 * @example
 * const { isSupported, data, open, save } = useFileSystemAccess({ dataType: 'Text' });
 * await open();
 * data.value += '\nappended';
 * await save();
 *
 * @example
 * // Read raw bytes
 * const { data } = useFileSystemAccess({ dataType: 'ArrayBuffer' });
 *
 * @since 0.0.15
 */
export function useFileSystemAccess(): UseFileSystemAccessReturn<string | ArrayBuffer | Blob>;
export function useFileSystemAccess(options: UseFileSystemAccessOptions & { dataType: 'Text' }): UseFileSystemAccessReturn<string>;
export function useFileSystemAccess(options: UseFileSystemAccessOptions & { dataType: 'ArrayBuffer' }): UseFileSystemAccessReturn<ArrayBuffer>;
export function useFileSystemAccess(options: UseFileSystemAccessOptions & { dataType: 'Blob' }): UseFileSystemAccessReturn<Blob>;
export function useFileSystemAccess(options: UseFileSystemAccessOptions): UseFileSystemAccessReturn<string | ArrayBuffer | Blob>;
export function useFileSystemAccess(
  options: UseFileSystemAccessOptions = {},
): UseFileSystemAccessReturn<string | ArrayBuffer | Blob> {
  const {
    window: win = defaultWindow,
    dataType = 'Text',
    types,
    excludeAcceptAllOption,
    onError = noop,
  } = options;

  const fsWindow = win as FileSystemAccessWindow | undefined;
  const isSupported = useSupported(() => fsWindow && 'showSaveFilePicker' in fsWindow && 'showOpenFilePicker' in fsWindow);

  const fileHandle = shallowRef<FileSystemFileHandle>();
  const data = shallowRef<string | ArrayBuffer | Blob>();
  const file = shallowRef<File>();

  const fileName = computed(() => file.value?.name ?? '');
  const fileMIME = computed(() => file.value?.type ?? '');
  const fileSize = computed(() => file.value?.size ?? 0);
  const fileLastModified = computed(() => file.value?.lastModified ?? 0);

  // Resolve the picker defaults once per call rather than spreading the full
  // options bag (which carries `window`/`onError`) into the native picker.
  function pickerDefaults(): UseFileSystemAccessCommonOptions {
    return { types, excludeAcceptAllOption };
  }

  async function updateFile(): Promise<void> {
    file.value = await fileHandle.value?.getFile();
  }

  async function updateData(): Promise<void> {
    await updateFile();

    const type = toValue(dataType);

    if (type === 'Text')
      data.value = await file.value?.text();
    else if (type === 'ArrayBuffer')
      data.value = await file.value?.arrayBuffer();
    else if (type === 'Blob')
      data.value = file.value;
  }

  async function writeData(): Promise<void> {
    if (!fileHandle.value || data.value === undefined || data.value === null)
      return;

    const stream = await fileHandle.value.createWritable();
    await stream.write(data.value);
    await stream.close();
  }

  async function open(_options: UseFileSystemAccessCommonOptions = {}): Promise<void> {
    if (!isSupported.value || !fsWindow)
      return;

    try {
      const [handle] = await fsWindow.showOpenFilePicker({ ...pickerDefaults(), ..._options });
      if (!handle)
        return;
      fileHandle.value = handle;
      await updateData();
    }
    catch (error) {
      onError(error);
    }
  }

  async function create(_options: UseFileSystemAccessShowSaveFileOptions = {}): Promise<void> {
    if (!isSupported.value || !fsWindow)
      return;

    try {
      fileHandle.value = await fsWindow.showSaveFilePicker({ ...pickerDefaults(), ..._options });
      data.value = undefined;
      await updateData();
    }
    catch (error) {
      onError(error);
    }
  }

  async function saveAs(_options: UseFileSystemAccessShowSaveFileOptions = {}): Promise<void> {
    if (!isSupported.value || !fsWindow)
      return;

    try {
      fileHandle.value = await fsWindow.showSaveFilePicker({ ...pickerDefaults(), ..._options });
      await writeData();
      await updateFile();
    }
    catch (error) {
      onError(error);
    }
  }

  async function save(_options: UseFileSystemAccessShowSaveFileOptions = {}): Promise<void> {
    if (!isSupported.value)
      return;

    if (!fileHandle.value)
      return saveAs(_options);

    try {
      await writeData();
      await updateFile();
    }
    catch (error) {
      onError(error);
    }
  }

  // Re-read with the new strategy whenever `dataType` changes; skip the redundant
  // initial run since nothing is open yet.
  watch(() => toValue(dataType), () => {
    if (fileHandle.value)
      void updateData();
  });

  return {
    isSupported,
    data,
    file,
    fileName,
    fileMIME,
    fileSize,
    fileLastModified,
    open,
    create,
    save,
    saveAs,
    updateData,
  };
}
