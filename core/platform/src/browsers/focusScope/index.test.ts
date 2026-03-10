import { afterEach, describe, it, expect } from 'vitest';
import {
  getActiveElement,
  getTabbableCandidates,
  getTabbableEdges,
  focusFirst,
  focus,
  isHidden,
  isSelectableInput,
  AUTOFOCUS_ON_MOUNT,
  AUTOFOCUS_ON_UNMOUNT,
  EVENT_OPTIONS,
} from '.';

function createContainer(html: string): HTMLElement {
  const container = document.createElement('div');

  container.innerHTML = html;
  document.body.appendChild(container);

  return container;
}

describe('constants', () => {
  it('exports correct event names', () => {
    expect(AUTOFOCUS_ON_MOUNT).toBe('focusScope.autoFocusOnMount');
    expect(AUTOFOCUS_ON_UNMOUNT).toBe('focusScope.autoFocusOnUnmount');
  });

  it('exports correct event options', () => {
    expect(EVENT_OPTIONS).toEqual({ bubbles: false, cancelable: true });
  });
});

describe('getActiveElement', () => {
  it('returns document.body when nothing is focused', () => {
    const active = getActiveElement();
    expect(active).toBe(document.body);
  });

  it('returns the focused element', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    expect(getActiveElement()).toBe(input);

    input.remove();
  });
});

describe('getTabbableCandidates', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns focusable elements with tabindex >= 0', () => {
    const container = createContainer(`
      <input type="text" />
      <button>Click</button>
      <a href="#">Link</a>
      <div tabindex="0">Div</div>
    `);

    const candidates = getTabbableCandidates(container);
    expect(candidates.length).toBe(4);

    container.remove();
  });

  it('skips disabled elements', () => {
    const container = createContainer(`
      <button disabled>Disabled</button>
      <input type="text" />
    `);

    const candidates = getTabbableCandidates(container);
    expect(candidates.length).toBe(1);
    expect(candidates[0]!.tagName).toBe('INPUT');

    container.remove();
  });

  it('skips hidden inputs', () => {
    const container = createContainer(`
      <input type="hidden" />
      <input type="text" />
    `);

    const candidates = getTabbableCandidates(container);
    expect(candidates.length).toBe(1);
    expect((candidates[0] as HTMLInputElement).type).toBe('text');

    container.remove();
  });

  it('skips elements with hidden attribute', () => {
    const container = createContainer(`
      <input type="text" hidden />
      <input type="text" />
    `);

    const candidates = getTabbableCandidates(container);
    expect(candidates.length).toBe(1);

    container.remove();
  });

  it('returns empty array for container with no focusable elements', () => {
    const container = createContainer(`
      <div>Just text</div>
      <span>More text</span>
    `);

    const candidates = getTabbableCandidates(container);
    expect(candidates.length).toBe(0);

    container.remove();
  });
});

describe('getTabbableEdges', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns first and last tabbable elements', () => {
    const container = createContainer(`
      <input type="text" data-testid="first" />
      <button>Middle</button>
      <input type="text" data-testid="last" />
    `);

    const { first, last } = getTabbableEdges(container);
    expect(first?.getAttribute('data-testid')).toBe('first');
    expect(last?.getAttribute('data-testid')).toBe('last');

    container.remove();
  });

  it('returns undefined for both when no tabbable elements', () => {
    const container = createContainer(`<div>no focusable</div>`);

    const { first, last } = getTabbableEdges(container);
    expect(first).toBeUndefined();
    expect(last).toBeUndefined();

    container.remove();
  });
});

describe('focusFirst', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the first element in the list', () => {
    const container = createContainer(`
      <input type="text" data-testid="a" />
      <input type="text" data-testid="b" />
    `);

    const candidates = Array.from(container.querySelectorAll('input')) as HTMLElement[];
    focusFirst(candidates);

    expect(document.activeElement).toBe(candidates[0]);

    container.remove();
  });

  it('returns true when focus changed', () => {
    const container = createContainer(`<input type="text" />`);
    const candidates = Array.from(container.querySelectorAll('input')) as HTMLElement[];

    const result = focusFirst(candidates);
    expect(result).toBe(true);

    container.remove();
  });

  it('returns false when no candidate receives focus', () => {
    const result = focusFirst([]);
    expect(result).toBe(false);
  });
});

describe('focus', () => {
  it('does nothing when element is null', () => {
    expect(() => focus(null)).not.toThrow();
  });

  it('focuses the given element', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    focus(input);
    expect(document.activeElement).toBe(input);

    input.remove();
  });

  it('calls select on input when select=true', () => {
    const input = document.createElement('input');
    input.value = 'hello';
    document.body.appendChild(input);

    focus(input, { select: true });
    expect(document.activeElement).toBe(input);

    input.remove();
  });
});

describe('isSelectableInput', () => {
  it('returns true for input elements', () => {
    const input = document.createElement('input');
    expect(isSelectableInput(input)).toBe(true);
  });

  it('returns false for non-input elements', () => {
    const div = document.createElement('div');
    expect(isSelectableInput(div)).toBe(false);
  });
});

describe('isHidden', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('detects elements with visibility: hidden', () => {
    const container = createContainer('');
    const el = document.createElement('div');
    el.style.visibility = 'hidden';
    container.appendChild(el);

    expect(isHidden(el)).toBe(true);

    container.remove();
  });

  it('detects elements with display: none', () => {
    const container = createContainer('');
    const el = document.createElement('div');
    el.style.display = 'none';
    container.appendChild(el);

    expect(isHidden(el)).toBe(true);

    container.remove();
  });

  it('returns false for visible elements', () => {
    const container = createContainer('');
    const el = document.createElement('div');
    container.appendChild(el);

    expect(isHidden(el, container)).toBe(false);

    container.remove();
  });
});
