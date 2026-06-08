import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useDropZone } from '.';

interface FakeDataTransfer {
  files: File[];
  items: Array<{ type: string }>;
  dropEffect: string;
}

function makeFile(name = 'a.png', type = 'image/png'): File {
  return new File(['x'], name, { type });
}

// jsdom lacks DragEvent / DataTransfer, so we synthesize an Event with a dataTransfer payload.
function dispatchDrag(
  el: EventTarget,
  type: 'dragenter' | 'dragover' | 'dragleave' | 'drop',
  files: File[] = [],
): { event: Event; dataTransfer: FakeDataTransfer } {
  const dataTransfer: FakeDataTransfer = {
    files,
    items: files.map(f => ({ type: f.type })),
    dropEffect: 'none',
  };

  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer, configurable: true });

  el.dispatchEvent(event);
  return { event, dataTransfer };
}

describe(useDropZone, () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
    vi.unstubAllGlobals();
  });

  it('exposes reactive state', () => {
    const scope = effectScope();
    scope.run(() => {
      const { isOverDropZone, files, isSupported } = useDropZone(el);
      expect(isOverDropZone.value).toBeFalsy();
      expect(files.value).toBeNull();
      expect(isSupported).toBeDefined();
    });
    scope.stop();
  });

  it('sets isOverDropZone on dragenter and clears on matching dragleave', () => {
    const scope = effectScope();
    scope.run(() => {
      const { isOverDropZone } = useDropZone(el);

      dispatchDrag(el, 'dragenter', [makeFile()]);
      expect(isOverDropZone.value).toBeTruthy();

      dispatchDrag(el, 'dragleave', [makeFile()]);
      expect(isOverDropZone.value).toBeFalsy();
    });
    scope.stop();
  });

  it('uses a counter so nested enter/leave keeps isOverDropZone true', () => {
    const scope = effectScope();
    scope.run(() => {
      const { isOverDropZone } = useDropZone(el);

      dispatchDrag(el, 'dragenter', [makeFile()]);
      dispatchDrag(el, 'dragenter', [makeFile()]);
      expect(isOverDropZone.value).toBeTruthy();

      dispatchDrag(el, 'dragleave', [makeFile()]);
      expect(isOverDropZone.value).toBeTruthy();

      dispatchDrag(el, 'dragleave', [makeFile()]);
      expect(isOverDropZone.value).toBeFalsy();
    });
    scope.stop();
  });

  it('collects dropped files and resets isOverDropZone', () => {
    const scope = effectScope();
    scope.run(() => {
      const { files, isOverDropZone } = useDropZone(el);

      dispatchDrag(el, 'dragenter', [makeFile()]);
      const dropped = [makeFile('one.png'), makeFile('two.png')];
      dispatchDrag(el, 'drop', dropped);

      expect(files.value).toHaveLength(2);
      expect(files.value?.[0]!.name).toBe('one.png');
      expect(isOverDropZone.value).toBeFalsy();
    });
    scope.stop();
  });

  it('invokes lifecycle callbacks', () => {
    const scope = effectScope();
    scope.run(() => {
      const onEnter = vi.fn();
      const onOver = vi.fn();
      const onLeave = vi.fn();
      const onDrop = vi.fn();

      useDropZone(el, { onEnter, onOver, onLeave, onDrop });

      const f = [makeFile()];
      dispatchDrag(el, 'dragenter', f);
      dispatchDrag(el, 'dragover', f);
      dispatchDrag(el, 'dragleave', f);
      dispatchDrag(el, 'drop', f);

      expect(onEnter).toHaveBeenCalledTimes(1);
      expect(onOver).toHaveBeenCalledTimes(1);
      expect(onLeave).toHaveBeenCalledTimes(1);
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(onEnter).toHaveBeenCalledWith(null, expect.any(Event));
      expect(onDrop.mock.calls[0]![0]).toHaveLength(1);
    });
    scope.stop();
  });

  it('accepts a shorthand onDrop function as options', () => {
    const scope = effectScope();
    scope.run(() => {
      const onDrop = vi.fn();
      useDropZone(el, onDrop);

      dispatchDrag(el, 'drop', [makeFile()]);
      expect(onDrop).toHaveBeenCalledTimes(1);
    });
    scope.stop();
  });

  it('respects multiple: false by keeping only the first file', () => {
    const scope = effectScope();
    scope.run(() => {
      const { files } = useDropZone(el, { multiple: false });

      // Two files dragged: validation should reject, so drop is ignored
      dispatchDrag(el, 'drop', [makeFile('a.png'), makeFile('b.png')]);
      expect(files.value).toBeNull();

      // Single file passes and only the first is kept
      dispatchDrag(el, 'drop', [makeFile('solo.png')]);
      expect(files.value).toHaveLength(1);
      expect(files.value?.[0]!.name).toBe('solo.png');
    });
    scope.stop();
  });

  it('filters by dataTypes array', () => {
    const scope = effectScope();
    scope.run(() => {
      const onDrop = vi.fn();
      const { files } = useDropZone(el, { dataTypes: ['image/png'], onDrop });

      // wrong type rejected
      dispatchDrag(el, 'drop', [makeFile('doc.pdf', 'application/pdf')]);
      expect(files.value).toBeNull();
      expect(onDrop).not.toHaveBeenCalled();

      // correct type accepted
      dispatchDrag(el, 'drop', [makeFile('img.png', 'image/png')]);
      expect(files.value).toHaveLength(1);
      expect(onDrop).toHaveBeenCalledTimes(1);
    });
    scope.stop();
  });

  it('supports dataTypes as a predicate function', () => {
    const scope = effectScope();
    scope.run(() => {
      const predicate = vi.fn((types: readonly string[]) => types.includes('image/png'));
      const { files } = useDropZone(el, { dataTypes: predicate });

      dispatchDrag(el, 'drop', [makeFile('img.png', 'image/png')]);
      expect(predicate).toHaveBeenCalled();
      expect(files.value).toHaveLength(1);
    });
    scope.stop();
  });

  it('reacts to a reactive dataTypes ref', () => {
    const scope = effectScope();
    scope.run(() => {
      const allowed = ref<string[]>(['image/png']);
      const { files } = useDropZone(el, { dataTypes: allowed });

      dispatchDrag(el, 'drop', [makeFile('doc.pdf', 'application/pdf')]);
      expect(files.value).toBeNull();

      allowed.value = ['application/pdf'];
      dispatchDrag(el, 'drop', [makeFile('doc.pdf', 'application/pdf')]);
      expect(files.value).toHaveLength(1);
    });
    scope.stop();
  });

  it('sets dropEffect to none for invalid drags', () => {
    const scope = effectScope();
    scope.run(() => {
      useDropZone(el, { dataTypes: ['image/png'] });

      const { dataTransfer } = dispatchDrag(el, 'dragenter', [makeFile('doc.pdf', 'application/pdf')]);
      expect(dataTransfer.dropEffect).toBe('none');
    });
    scope.stop();
  });

  it('sets dropEffect to copy for valid drags', () => {
    const scope = effectScope();
    scope.run(() => {
      useDropZone(el, { dataTypes: ['image/png'] });

      const { dataTransfer } = dispatchDrag(el, 'dragenter', [makeFile('img.png', 'image/png')]);
      expect(dataTransfer.dropEffect).toBe('copy');
    });
    scope.stop();
  });

  it('preventDefaultForUnhandled calls preventDefault on invalid drags', () => {
    const scope = effectScope();
    scope.run(() => {
      useDropZone(el, { dataTypes: ['image/png'], preventDefaultForUnhandled: true });

      const { event } = dispatchDrag(el, 'dragenter', [makeFile('doc.pdf', 'application/pdf')]);
      expect(event.defaultPrevented).toBeTruthy();
    });
    scope.stop();
  });

  it('works with a reactive element ref target', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const target = ref<HTMLElement | null>(null);
      const { isOverDropZone } = useDropZone(target);

      target.value = el;
      await nextTick();

      dispatchDrag(el, 'dragenter', [makeFile()]);
      expect(isOverDropZone.value).toBeTruthy();
    });
    scope.stop();
  });

  it('works with document as the target', () => {
    const scope = effectScope();
    scope.run(() => {
      const { isOverDropZone } = useDropZone(document);

      dispatchDrag(document, 'dragenter', [makeFile()]);
      expect(isOverDropZone.value).toBeTruthy();
    });
    scope.stop();
  });

  it('stops listening after the scope is disposed', () => {
    const onDrop = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      useDropZone(el, { onDrop });
    });
    scope.stop();

    dispatchDrag(el, 'drop', [makeFile()]);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('reports isSupported via the configurable window option', () => {
    const scope = effectScope();
    scope.run(() => {
      const { isSupported } = useDropZone(el, { window: undefined });
      expect(isSupported.value).toBeFalsy();
    });
    scope.stop();
  });
});
