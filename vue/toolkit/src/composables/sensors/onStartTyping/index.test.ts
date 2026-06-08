import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { isFocusedElementEditable, isTypedCharValid, onStartTyping } from '.';

function keydown(key: string, modifiers: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers });
}

describe(onStartTyping, () => {
  afterEach(() => {
    document.body.innerHTML = '';
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });

  it('fires when typing a printable character on a non-editable element', () => {
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      onStartTyping(callback);
    });

    document.dispatchEvent(keydown('a'));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]![0]).toBeInstanceOf(KeyboardEvent);

    scope.stop();
  });

  it('passes the originating keydown event to the callback', () => {
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      onStartTyping(callback);
    });

    const event = keydown('z');
    document.dispatchEvent(event);

    expect(callback).toHaveBeenCalledWith(event);

    scope.stop();
  });

  it('does not fire for named/control keys', () => {
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      onStartTyping(callback);
    });

    document.dispatchEvent(keydown('Enter'));
    document.dispatchEvent(keydown('Tab'));
    document.dispatchEvent(keydown('ArrowUp'));
    document.dispatchEvent(keydown('Escape'));

    expect(callback).not.toHaveBeenCalled();

    scope.stop();
  });

  it('does not fire when a modifier key is held', () => {
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      onStartTyping(callback);
    });

    document.dispatchEvent(keydown('a', { metaKey: true }));
    document.dispatchEvent(keydown('a', { ctrlKey: true }));
    document.dispatchEvent(keydown('a', { altKey: true }));

    expect(callback).not.toHaveBeenCalled();

    scope.stop();
  });

  it('does not fire when focus is inside an input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      onStartTyping(callback);
    });

    document.dispatchEvent(keydown('a'));

    expect(callback).not.toHaveBeenCalled();

    scope.stop();
  });

  it('does not fire when focus is inside a textarea', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      onStartTyping(callback);
    });

    document.dispatchEvent(keydown('a'));

    expect(callback).not.toHaveBeenCalled();

    scope.stop();
  });

  it('does not fire when focus is inside a contenteditable element', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    editable.tabIndex = 0;
    document.body.appendChild(editable);
    editable.focus();

    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      onStartTyping(callback);
    });

    document.dispatchEvent(keydown('a'));

    expect(callback).not.toHaveBeenCalled();

    scope.stop();
  });

  it('fires when a non-editable element (e.g. a button) is focused', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      onStartTyping(callback);
    });

    document.dispatchEvent(keydown('a'));

    expect(callback).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('detaches the listener via the returned stop function', () => {
    const callback = vi.fn();
    const scope = effectScope();
    let stop: () => void;
    scope.run(() => {
      stop = onStartTyping(callback);
    });

    stop!();
    document.dispatchEvent(keydown('a'));

    expect(callback).not.toHaveBeenCalled();

    scope.stop();
  });

  it('detaches the listener when the scope is disposed', () => {
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      onStartTyping(callback);
    });

    scope.stop();
    document.dispatchEvent(keydown('a'));

    expect(callback).not.toHaveBeenCalled();
  });

  it('honors a custom isTypedCharValid predicate', () => {
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      onStartTyping(callback, { isTypedCharValid: event => event.key === 'Enter' });
    });

    document.dispatchEvent(keydown('a'));
    expect(callback).not.toHaveBeenCalled();

    document.dispatchEvent(keydown('Enter'));
    expect(callback).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('honors a custom isFocusedElementEditable predicate', () => {
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      // Treat everything as editable -> callback should never run.
      onStartTyping(callback, { isFocusedElementEditable: () => true });
    });

    document.dispatchEvent(keydown('a'));

    expect(callback).not.toHaveBeenCalled();

    scope.stop();
  });

  it('listens on a custom document passed via options', () => {
    const callback = vi.fn();
    const listeners = new Map<string, EventListener>();
    const fakeDocument = {
      activeElement: null,
      body: null,
      addEventListener: vi.fn((type: string, listener: EventListener) => listeners.set(type, listener)),
      removeEventListener: vi.fn((type: string) => listeners.delete(type)),
    } as unknown as Document;

    const scope = effectScope();
    scope.run(() => {
      onStartTyping(callback, { document: fakeDocument });
    });

    expect(fakeDocument.addEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      expect.objectContaining({ passive: true }),
    );

    // Drive the captured listener directly.
    listeners.get('keydown')!(keydown('a'));
    expect(callback).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('is SSR-safe: returns a no-op when document is undefined', () => {
    const callback = vi.fn();
    const scope = effectScope();
    let stop: () => void;
    scope.run(() => {
      stop = onStartTyping(callback, { document: undefined });
    });

    expect(typeof stop!).toBe('function');
    expect(() => stop!()).not.toThrow();
    expect(callback).not.toHaveBeenCalled();

    scope.stop();
  });
});

describe(isTypedCharValid, () => {
  it('accepts single printable characters', () => {
    expect(isTypedCharValid(keydown('a'))).toBeTruthy();
    expect(isTypedCharValid(keydown('Z'))).toBeTruthy();
    expect(isTypedCharValid(keydown('5'))).toBeTruthy();
    expect(isTypedCharValid(keydown('?'))).toBeTruthy();
  });

  it('accepts surrogate-pair characters (e.g. emoji)', () => {
    expect(isTypedCharValid(keydown('😀'))).toBeTruthy();
  });

  it('rejects named keys', () => {
    expect(isTypedCharValid(keydown('Enter'))).toBeFalsy();
    expect(isTypedCharValid(keydown('ArrowLeft'))).toBeFalsy();
    expect(isTypedCharValid(keydown('Shift'))).toBeFalsy();
  });

  it('rejects characters typed with a meta/ctrl/alt modifier', () => {
    expect(isTypedCharValid(keydown('a', { metaKey: true }))).toBeFalsy();
    expect(isTypedCharValid(keydown('a', { ctrlKey: true }))).toBeFalsy();
    expect(isTypedCharValid(keydown('a', { altKey: true }))).toBeFalsy();
  });
});

describe(isFocusedElementEditable, () => {
  afterEach(() => {
    document.body.innerHTML = '';
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });

  it('returns false when nothing is focused', () => {
    expect(isFocusedElementEditable(document)).toBeFalsy();
  });

  it('returns true when an input is focused', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    expect(isFocusedElementEditable(document)).toBeTruthy();
  });

  it('returns true when a contenteditable element is focused', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    editable.tabIndex = 0;
    document.body.appendChild(editable);
    editable.focus();
    expect(isFocusedElementEditable(document)).toBeTruthy();
  });

  it('returns false when a button is focused', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    expect(isFocusedElementEditable(document)).toBeFalsy();
  });
});
