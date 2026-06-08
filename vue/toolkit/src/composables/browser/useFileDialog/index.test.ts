import { describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { useFileDialog } from '.';

function makeFile(name = 'a.txt'): File {
  return new File(['content'], name, { type: 'text/plain' });
}

function makeFileList(files: File[]): FileList {
  const list = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: () => files[Symbol.iterator](),
  } as unknown as FileList;
  files.forEach((file, index) => {
    (list as unknown as Record<number, File>)[index] = file;
  });
  return list;
}

function withScope<T>(fn: () => T): { result: T; stop: () => void } {
  const scope = effectScope();
  const result = scope.run(fn)!;
  return { result, stop: () => scope.stop() };
}

describe(useFileDialog, () => {
  it('exposes files, open, reset, onChange, onCancel', () => {
    const { result, stop } = withScope(() => useFileDialog());
    expect(result.files.value).toBeNull();
    expect(typeof result.open).toBe('function');
    expect(typeof result.reset).toBe('function');
    expect(typeof result.onChange).toBe('function');
    expect(typeof result.onCancel).toBe('function');
    stop();
  });

  it('seeds files from initialFiles (array)', () => {
    const file = makeFile();
    const { result, stop } = withScope(() => useFileDialog({ initialFiles: [file] }));
    expect(result.files.value).not.toBeNull();
    expect(result.files.value!).toHaveLength(1);
    expect(result.files.value![0]).toBe(file);
    stop();
  });

  it('seeds files from initialFiles (FileList)', () => {
    const list = makeFileList([makeFile('x.txt'), makeFile('y.txt')]);
    const { result, stop } = withScope(() => useFileDialog({ initialFiles: list }));
    expect(result.files.value!).toHaveLength(2);
    stop();
  });

  it('clicks the input element when open() is called', () => {
    const input = document.createElement('input');
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    const { result, stop } = withScope(() => useFileDialog({ input }));

    result.open();
    expect(click).toHaveBeenCalledTimes(1);
    stop();
  });

  it('applies options to the input element on open()', () => {
    const input = document.createElement('input');
    vi.spyOn(input, 'click').mockImplementation(() => {});
    const { result, stop } = withScope(() => useFileDialog({
      input,
      accept: 'image/*',
      multiple: false,
      directory: true,
    }));

    result.open();
    expect(input.accept).toBe('image/*');
    expect(input.multiple).toBeFalsy();
    expect(input.webkitdirectory).toBeTruthy();
    stop();
  });

  it('merges local options on open(), overriding instance options for that call', () => {
    const input = document.createElement('input');
    vi.spyOn(input, 'click').mockImplementation(() => {});
    const { result, stop } = withScope(() => useFileDialog({ input, accept: 'image/*' }));

    result.open({ accept: '.pdf', multiple: false });
    expect(input.accept).toBe('.pdf');
    expect(input.multiple).toBeFalsy();
    stop();
  });

  it('sets capture attribute only when provided', () => {
    const input = document.createElement('input');
    vi.spyOn(input, 'click').mockImplementation(() => {});
    const { result, stop } = withScope(() => useFileDialog({ input, capture: 'user' }));

    result.open();
    expect(input.capture).toBe('user');
    stop();
  });

  it('reads reactive options via getters/refs', () => {
    const input = document.createElement('input');
    vi.spyOn(input, 'click').mockImplementation(() => {});
    const accept = ref('image/*');
    const { result, stop } = withScope(() => useFileDialog({ input, accept }));

    result.open();
    expect(input.accept).toBe('image/*');

    accept.value = 'video/*';
    result.open();
    expect(input.accept).toBe('video/*');
    stop();
  });

  it('updates files and triggers onChange when the input changes', () => {
    const input = document.createElement('input');
    const { result, stop } = withScope(() => useFileDialog({ input }));

    const onChange = vi.fn();
    result.onChange(onChange);

    const list = makeFileList([makeFile()]);
    // jsdom does not let you assign input.files via real selection, so override the getter.
    Object.defineProperty(input, 'files', { configurable: true, get: () => list });
    input.dispatchEvent(new Event('change'));

    expect(result.files.value).toBe(list);
    expect(result.files.value!).toHaveLength(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(list);
    stop();
  });

  it('triggers onCancel when the dialog is dismissed', () => {
    const input = document.createElement('input');
    const { result, stop } = withScope(() => useFileDialog({ input }));

    const onCancel = vi.fn();
    result.onCancel(onCancel);

    input.dispatchEvent(new Event('cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    stop();
  });

  it('reset() clears files and fires onChange(null) when the input had a value', () => {
    const input = document.createElement('input');
    // jsdom forbids assigning a non-empty value to a file input, so stub value with a settable getter/setter.
    let internalValue = 'a.txt';
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => internalValue,
      set: (v: string) => { internalValue = v; },
    });
    const { result, stop } = withScope(() => useFileDialog({ input }));

    const onChange = vi.fn();
    result.onChange(onChange);

    const list = makeFileList([makeFile()]);
    Object.defineProperty(input, 'files', { configurable: true, get: () => list });
    input.dispatchEvent(new Event('change'));
    onChange.mockClear();

    result.reset();
    expect(result.files.value).toBeNull();
    expect(input.value).toBe('');
    expect(onChange).toHaveBeenCalledWith(null);
    stop();
  });

  it('open({ reset: true }) clears the previous selection before opening', () => {
    const input = document.createElement('input');
    vi.spyOn(input, 'click').mockImplementation(() => {});
    const { result, stop } = withScope(() => useFileDialog({ input }));

    const list = makeFileList([makeFile()]);
    Object.defineProperty(input, 'files', { configurable: true, get: () => list });
    input.dispatchEvent(new Event('change'));
    expect(result.files.value).not.toBeNull();

    result.open({ reset: true });
    expect(result.files.value).toBeNull();
    stop();
  });

  it('onChange returns an off() that unsubscribes', () => {
    const input = document.createElement('input');
    const { result, stop } = withScope(() => useFileDialog({ input }));

    const onChange = vi.fn();
    const { off } = result.onChange(onChange);
    off();

    Object.defineProperty(input, 'files', { configurable: true, value: makeFileList([makeFile()]) });
    input.dispatchEvent(new Event('change'));
    expect(onChange).not.toHaveBeenCalled();
    stop();
  });

  it('files ref is readonly (no input element created in SSR)', () => {
    // document undefined simulates SSR; no input is created so open() is a no-op.
    const { result, stop } = withScope(() => useFileDialog({ document: undefined }));
    expect(result.files.value).toBeNull();
    expect(() => result.open()).not.toThrow();
    expect(() => result.reset()).not.toThrow();
    stop();
  });
});
