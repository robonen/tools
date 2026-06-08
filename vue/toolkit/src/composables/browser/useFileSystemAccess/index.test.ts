import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import type { FileSystemFileHandle, UseFileSystemAccessReturn } from '.';
import { useFileSystemAccess } from '.';

interface WritableSpy {
  write: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

function makeFile(contents = 'hello world', name = 'demo.txt', type = 'text/plain'): File {
  const file = {
    name,
    type,
    size: contents.length,
    lastModified: 1234,
    text: vi.fn(async () => contents),
    arrayBuffer: vi.fn(async () => new ArrayBuffer(contents.length)),
  };
  return file as unknown as File;
}

function makeHandle(file: File): { handle: FileSystemFileHandle; writable: WritableSpy } {
  const writable: WritableSpy = {
    write: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
  const handle = {
    getFile: vi.fn(async () => file),
    createWritable: vi.fn(async () => writable),
  } as unknown as FileSystemFileHandle;
  return { handle, writable };
}

function stubWindow(handle?: FileSystemFileHandle) {
  const showOpenFilePicker = vi.fn(async () => (handle ? [handle] : []));
  const showSaveFilePicker = vi.fn(async () => handle);
  const window = {
    showOpenFilePicker,
    showSaveFilePicker,
  } as unknown as Window;
  return { window, showOpenFilePicker, showSaveFilePicker };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(useFileSystemAccess, () => {
  it('reports support when the picker APIs exist', () => {
    const { window } = stubWindow();
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn;
    scope.run(() => {
      fsa = useFileSystemAccess({ window });
    });
    expect(fsa!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('is not supported without the picker APIs', () => {
    const window = {} as unknown as Window;
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn;
    scope.run(() => {
      fsa = useFileSystemAccess({ window });
    });
    expect(fsa!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('is not supported and is a no-op under SSR (no window)', async () => {
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn;
    scope.run(() => {
      fsa = useFileSystemAccess({ window: undefined });
    });
    expect(fsa!.isSupported.value).toBeFalsy();
    await expect(fsa!.open()).resolves.toBeUndefined();
    await expect(fsa!.save()).resolves.toBeUndefined();
    expect(fsa!.fileName.value).toBe('');
    expect(fsa!.fileSize.value).toBe(0);
    expect(fsa!.data.value).toBeUndefined();
    scope.stop();
  });

  it('opens a file and reads it as text by default', async () => {
    const file = makeFile('content');
    const { handle } = makeHandle(file);
    const { window, showOpenFilePicker } = stubWindow(handle);
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn<string>;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, dataType: 'Text' });
    });

    await fsa!.open();
    expect(showOpenFilePicker).toHaveBeenCalledOnce();
    expect(fsa!.data.value).toBe('content');
    expect(fsa!.file.value).toBe(file);
    expect(fsa!.fileName.value).toBe('demo.txt');
    expect(fsa!.fileMIME.value).toBe('text/plain');
    expect(fsa!.fileSize.value).toBe(7);
    expect(fsa!.fileLastModified.value).toBe(1234);
    scope.stop();
  });

  it('reads as ArrayBuffer when dataType is ArrayBuffer', async () => {
    const file = makeFile('abc');
    const { handle } = makeHandle(file);
    const { window } = stubWindow(handle);
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn<ArrayBuffer>;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, dataType: 'ArrayBuffer' });
    });

    await fsa!.open();
    expect(fsa!.data.value).toBeInstanceOf(ArrayBuffer);
    expect(file.arrayBuffer).toHaveBeenCalled();
    scope.stop();
  });

  it('exposes the File itself when dataType is Blob', async () => {
    const file = makeFile('abc');
    const { handle } = makeHandle(file);
    const { window } = stubWindow(handle);
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn<Blob>;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, dataType: 'Blob' });
    });

    await fsa!.open();
    expect(fsa!.data.value).toBe(file);
    scope.stop();
  });

  it('passes types and excludeAcceptAllOption to the open picker', async () => {
    const file = makeFile();
    const { handle } = makeHandle(file);
    const { window, showOpenFilePicker } = stubWindow(handle);
    const types = [{ description: 'text', accept: { 'text/plain': ['.txt'] } }];
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, types, excludeAcceptAllOption: true });
    });

    await fsa!.open();
    expect(showOpenFilePicker).toHaveBeenCalledWith({ types, excludeAcceptAllOption: true });
    scope.stop();
  });

  it('lets per-call open options override the defaults', async () => {
    const file = makeFile();
    const { handle } = makeHandle(file);
    const { window, showOpenFilePicker } = stubWindow(handle);
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, excludeAcceptAllOption: false });
    });

    await fsa!.open({ excludeAcceptAllOption: true });
    expect(showOpenFilePicker).toHaveBeenCalledWith({ types: undefined, excludeAcceptAllOption: true });
    scope.stop();
  });

  it('creates a new empty handle and clears prior data', async () => {
    const file = makeFile('');
    const { handle } = makeHandle(file);
    const { window, showSaveFilePicker } = stubWindow(handle);
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn;
    scope.run(() => {
      fsa = useFileSystemAccess({ window });
    });

    await fsa!.create({ suggestedName: 'new.txt' });
    expect(showSaveFilePicker).toHaveBeenCalledWith({ types: undefined, excludeAcceptAllOption: undefined, suggestedName: 'new.txt' });
    expect(fsa!.file.value).toBe(file);
    scope.stop();
  });

  it('save writes current data to the existing handle', async () => {
    const file = makeFile('original');
    const { handle, writable } = makeHandle(file);
    const { window } = stubWindow(handle);
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn<string>;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, dataType: 'Text' });
    });

    await fsa!.open();
    fsa!.data.value = 'edited';
    await fsa!.save();

    expect(writable.write).toHaveBeenCalledWith('edited');
    expect(writable.close).toHaveBeenCalledOnce();
    scope.stop();
  });

  it('save falls back to saveAs when there is no handle', async () => {
    const file = makeFile('');
    const { handle, writable } = makeHandle(file);
    const { window, showSaveFilePicker, showOpenFilePicker } = stubWindow(handle);
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn<string>;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, dataType: 'Text' });
    });

    fsa!.data.value = 'fresh';
    await fsa!.save();

    expect(showOpenFilePicker).not.toHaveBeenCalled();
    expect(showSaveFilePicker).toHaveBeenCalledOnce();
    expect(writable.write).toHaveBeenCalledWith('fresh');
    scope.stop();
  });

  it('saveAs requests a new handle and writes data', async () => {
    const file = makeFile('');
    const { handle, writable } = makeHandle(file);
    const { window, showSaveFilePicker } = stubWindow(handle);
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn<string>;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, dataType: 'Text' });
    });

    fsa!.data.value = 'payload';
    await fsa!.saveAs({ suggestedName: 'out.txt' });

    expect(showSaveFilePicker).toHaveBeenCalledWith({ types: undefined, excludeAcceptAllOption: undefined, suggestedName: 'out.txt' });
    expect(writable.write).toHaveBeenCalledWith('payload');
    scope.stop();
  });

  it('does not write when there is no data', async () => {
    const file = makeFile('');
    const { handle, writable } = makeHandle(file);
    const { window } = stubWindow(handle);
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn<string>;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, dataType: 'Text' });
    });

    await fsa!.saveAs();
    expect(writable.write).not.toHaveBeenCalled();
    scope.stop();
  });

  it('updateData re-reads the current file', async () => {
    const file = makeFile('v1');
    const { handle } = makeHandle(file);
    const { window } = stubWindow(handle);
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn<string>;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, dataType: 'Text' });
    });

    await fsa!.open();
    expect(fsa!.data.value).toBe('v1');

    (file.text as ReturnType<typeof vi.fn>).mockResolvedValueOnce('v2');
    await fsa!.updateData();
    expect(fsa!.data.value).toBe('v2');
    scope.stop();
  });

  it('re-reads data when a reactive dataType changes', async () => {
    const file = makeFile('reactive');
    const { handle } = makeHandle(file);
    const { window } = stubWindow(handle);
    const dataType = ref<'Text' | 'Blob'>('Text');
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, dataType });
    });

    await fsa!.open();
    expect(fsa!.data.value).toBe('reactive');

    dataType.value = 'Blob';
    await nextTick();
    await Promise.resolve();
    expect(fsa!.data.value).toBe(file);
    scope.stop();
  });

  it('routes picker errors to onError instead of throwing', async () => {
    const abort = new DOMException('cancelled', 'AbortError');
    const window = {
      showOpenFilePicker: vi.fn(async () => { throw abort; }),
      showSaveFilePicker: vi.fn(async () => { throw abort; }),
    } as unknown as Window;
    const onError = vi.fn();
    const scope = effectScope();
    let fsa: UseFileSystemAccessReturn;
    scope.run(() => {
      fsa = useFileSystemAccess({ window, onError });
    });

    await expect(fsa!.open()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(abort);
    scope.stop();
  });
});
