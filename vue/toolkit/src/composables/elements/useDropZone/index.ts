import type { ComputedRef, MaybeRef, MaybeRefOrGetter, ShallowRef } from 'vue';
import { shallowRef, toValue, unref } from 'vue';
import { isFunction } from '@robonen/stdlib';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useSupported } from '@/composables/utilities/useSupported';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { defaultNavigator, defaultWindow } from '@/types';
import type { ConfigurableNavigator, ConfigurableWindow } from '@/types';

export type UseDropZoneDataTypes = MaybeRef<readonly string[]> | ((types: readonly string[]) => boolean);

export interface UseDropZoneOptions extends ConfigurableWindow, ConfigurableNavigator {
  /**
   * Allowed data types. If not set, all data types are allowed.
   * Can also be a predicate that receives the dragged item types and returns whether they are valid.
   */
  dataTypes?: UseDropZoneDataTypes;
  /**
   * Allow multiple files to be dropped.
   *
   * @default true
   */
  multiple?: boolean;
  /**
   * Call `preventDefault` even for drags that fail validation, suppressing the browser's default handling.
   *
   * @default false
   */
  preventDefaultForUnhandled?: boolean;
  /**
   * Fired when valid files are dropped on the target.
   */
  onDrop?: (files: File[] | null, event: DragEvent) => void;
  /**
   * Fired when a drag enters the target.
   */
  onEnter?: (files: File[] | null, event: DragEvent) => void;
  /**
   * Fired when a drag leaves the target.
   */
  onLeave?: (files: File[] | null, event: DragEvent) => void;
  /**
   * Fired repeatedly while a drag hovers over the target.
   */
  onOver?: (files: File[] | null, event: DragEvent) => void;
}

export interface UseDropZoneReturn {
  /**
   * Whether a valid drag is currently hovering over the target.
   */
  isOverDropZone: ShallowRef<boolean>;
  /**
   * The dropped files, or `null` when nothing has been dropped yet.
   */
  files: ShallowRef<File[] | null>;
  /**
   * Whether the Drag and Drop API is available in the current environment.
   */
  isSupported: ComputedRef<boolean>;
}

type DropZoneEventType = 'enter' | 'over' | 'leave' | 'drop';

/**
 * @name useDropZone
 * @category Elements
 * @description Create a drag-and-drop file drop zone on a target element or document.
 *
 * @param {MaybeComputedElementRef | MaybeRefOrGetter<Document | null | undefined>} target - The element (or document) acting as the drop zone.
 * @param {UseDropZoneOptions | UseDropZoneOptions['onDrop']} [options] - Drop zone options, or a shorthand `onDrop` callback.
 * @returns {UseDropZoneReturn} The reactive drop zone state.
 *
 * @example
 * const dropZone = useTemplateRef<HTMLElement>('dropZone');
 * const { isOverDropZone, files } = useDropZone(dropZone, {
 *   dataTypes: ['image/png'],
 *   onDrop: (files) => console.log(files),
 * });
 *
 * @since 0.0.15
 */
export function useDropZone(
  target: MaybeComputedElementRef | MaybeRefOrGetter<Document | null | undefined>,
  options: UseDropZoneOptions | UseDropZoneOptions['onDrop'] = {},
): UseDropZoneReturn {
  const _options: UseDropZoneOptions = isFunction(options) ? { onDrop: options } : options;
  const {
    window = defaultWindow,
    navigator = defaultNavigator,
    multiple = true,
    preventDefaultForUnhandled = false,
  } = _options;

  const isOverDropZone = shallowRef(false);
  const files = shallowRef<File[] | null>(null);
  const isSupported = useSupported(() => window && 'DataTransfer' in window);

  let counter = 0;
  let isValid = true;

  const getFiles = (event: DragEvent): File[] | null => {
    const list = Array.from(event.dataTransfer?.files ?? []);
    if (list.length === 0)
      return null;
    return multiple ? list : [list[0]!];
  };

  const checkDataTypes = (types: readonly string[]): boolean => {
    // `dataTypes` may be a predicate function, so unwrap with `unref` (not `toValue`,
    // which would call a function as a getter).
    const dataTypes = unref(_options.dataTypes);

    if (isFunction(dataTypes))
      return dataTypes(types);

    if (!dataTypes?.length)
      return true;

    if (types.length === 0)
      return false;

    return types.every(type => dataTypes.some(allowed => type.includes(allowed)));
  };

  const checkValidity = (items: DataTransferItemList): boolean => {
    const types = Array.from(items ?? []).map(item => item.type);
    const dataTypesValid = checkDataTypes(types);
    const multipleFilesValid = multiple || items.length <= 1;

    return dataTypesValid && multipleFilesValid;
  };

  // Safari fires drag events without populating `dataTransfer.items`, so validation
  // cannot be trusted there — always accept the drag and let `drop` resolve files.
  const isSafari = (): boolean => {
    if (!navigator || !window)
      return false;
    return /^(?:(?!chrome|android).)*safari/i.test(navigator.userAgent) && !('chrome' in window);
  };

  const handleDragEvent = (event: DragEvent, type: DropZoneEventType): void => {
    const items = event.dataTransfer?.items;
    isValid = (items && checkValidity(items)) ?? false;

    if (preventDefaultForUnhandled)
      event.preventDefault();

    if (!isSafari() && !isValid) {
      if (event.dataTransfer)
        event.dataTransfer.dropEffect = 'none';
      return;
    }

    event.preventDefault();
    if (event.dataTransfer)
      event.dataTransfer.dropEffect = 'copy';

    const currentFiles = getFiles(event);

    switch (type) {
      case 'enter':
        counter += 1;
        isOverDropZone.value = true;
        _options.onEnter?.(null, event);
        break;
      case 'over':
        _options.onOver?.(null, event);
        break;
      case 'leave':
        counter -= 1;
        if (counter === 0)
          isOverDropZone.value = false;
        _options.onLeave?.(null, event);
        break;
      case 'drop':
        counter = 0;
        isOverDropZone.value = false;
        if (isValid) {
          files.value = currentFiles;
          _options.onDrop?.(currentFiles, event);
        }
        break;
    }
  };

  const resolveTarget = (): EventTarget | null | undefined => {
    const value = toValue(target as MaybeRefOrGetter<unknown>);
    if (value instanceof Document)
      return value;
    return unrefElement(target as MaybeComputedElementRef);
  };

  useEventListener<DragEvent>(resolveTarget, 'dragenter', event => handleDragEvent(event, 'enter'));
  useEventListener<DragEvent>(resolveTarget, 'dragover', event => handleDragEvent(event, 'over'));
  useEventListener<DragEvent>(resolveTarget, 'dragleave', event => handleDragEvent(event, 'leave'));
  useEventListener<DragEvent>(resolveTarget, 'drop', event => handleDragEvent(event, 'drop'));

  return {
    isOverDropZone,
    files,
    isSupported,
  };
}
