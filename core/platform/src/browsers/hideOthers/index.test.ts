import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hideOthers } from '.';

function setupTree(): { keep: HTMLElement; siblings: HTMLElement[] } {
  document.body.innerHTML = `
    <div id="a"></div>
    <div id="b"></div>
    <main id="container">
      <header id="header"></header>
      <section id="keep"><span id="inside"></span></section>
      <footer id="footer"></footer>
    </main>
    <div id="c"></div>
  `;
  const keep = document.querySelector<HTMLElement>('#keep')!;
  const siblings = [
    document.querySelector<HTMLElement>('#a')!,
    document.querySelector<HTMLElement>('#b')!,
    document.querySelector<HTMLElement>('#c')!,
    document.querySelector<HTMLElement>('#header')!,
    document.querySelector<HTMLElement>('#footer')!,
  ];
  return { keep, siblings };
}

describe('hideOthers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('hides siblings and ancestor-siblings of the target', () => {
    const { keep, siblings } = setupTree();

    hideOthers(keep);

    for (const el of siblings) expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(keep.getAttribute('aria-hidden')).toBeNull();
    expect(document.querySelector('#inside')!.getAttribute('aria-hidden')).toBeNull();
    expect(document.querySelector('#container')!.getAttribute('aria-hidden')).toBeNull();
  });

  it('marks hidden nodes with the default marker', () => {
    const { keep } = setupTree();

    hideOthers(keep);

    expect(document.querySelector('#a')!.getAttribute('data-aria-hidden')).toBe('true');
    expect(keep.getAttribute('data-aria-hidden')).toBeNull();
  });

  it('undo restores the DOM to its original state', () => {
    const { keep, siblings } = setupTree();

    const undo = hideOthers(keep);
    undo();

    for (const el of siblings) {
      expect(el.getAttribute('aria-hidden')).toBeNull();
      expect(el.getAttribute('data-aria-hidden')).toBeNull();
    }
  });

  it('ref-counts stacked calls so partial undo keeps outer layer hidden', () => {
    const { keep, siblings } = setupTree();

    const undoOuter = hideOthers(keep);
    const undoInner = hideOthers(keep);

    undoInner();

    for (const el of siblings) expect(el.getAttribute('aria-hidden')).toBe('true');

    undoOuter();

    for (const el of siblings) expect(el.getAttribute('aria-hidden')).toBeNull();
  });

  it('preserves pre-existing aria-hidden attributes after undo', () => {
    const { keep } = setupTree();
    const a = document.querySelector<HTMLElement>('#a')!;
    a.setAttribute('aria-hidden', 'true');

    const undo = hideOthers(keep);
    expect(a.getAttribute('aria-hidden')).toBe('true');

    undo();
    expect(a.getAttribute('aria-hidden')).toBe('true');
    expect(a.getAttribute('data-aria-hidden')).toBeNull();
  });

  it('does not hide [aria-live] regions or <script> elements', () => {
    document.body.innerHTML = `
      <div id="keep"></div>
      <div id="sibling"></div>
      <div id="live" aria-live="polite"></div>
      <script id="script"></script>
    `;
    const keep = document.querySelector<HTMLElement>('#keep')!;

    hideOthers(keep);

    expect(document.querySelector('#sibling')!.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('#live')!.getAttribute('aria-hidden')).toBeNull();
    expect(document.querySelector('#script')!.getAttribute('aria-hidden')).toBeNull();
  });

  it('accepts an array of targets', () => {
    document.body.innerHTML = `
      <div id="a"></div>
      <div id="b"></div>
      <div id="c"></div>
    `;
    const a = document.querySelector<HTMLElement>('#a')!;
    const b = document.querySelector<HTMLElement>('#b')!;
    const c = document.querySelector<HTMLElement>('#c')!;

    hideOthers([a, b]);

    expect(a.getAttribute('aria-hidden')).toBeNull();
    expect(b.getAttribute('aria-hidden')).toBeNull();
    expect(c.getAttribute('aria-hidden')).toBe('true');
  });

  it('respects a custom parentNode scope', () => {
    document.body.innerHTML = `
      <div id="outside"></div>
      <section id="root">
        <div id="keep"></div>
        <div id="sibling"></div>
      </section>
    `;
    const root = document.querySelector<HTMLElement>('#root')!;
    const keep = document.querySelector<HTMLElement>('#keep')!;

    hideOthers(keep, root);

    expect(document.querySelector('#sibling')!.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('#outside')!.getAttribute('aria-hidden')).toBeNull();
  });

  it('respects a custom marker name', () => {
    const { keep } = setupTree();

    const undo = hideOthers(keep, undefined, 'data-custom-marker');

    const a = document.querySelector<HTMLElement>('#a')!;
    expect(a.getAttribute('data-custom-marker')).toBe('true');
    expect(a.getAttribute('data-aria-hidden')).toBeNull();

    undo();
    expect(a.getAttribute('data-custom-marker')).toBeNull();
  });

  it('walks up ShadowDOM hosts to find targets inside closed subtrees', () => {
    document.body.innerHTML = `
      <div id="host"></div>
      <div id="sibling"></div>
    `;
    const host = document.querySelector<HTMLElement>('#host')!;
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);

    hideOthers(inner);

    expect(document.querySelector('#sibling')!.getAttribute('aria-hidden')).toBe('true');
    expect(host.getAttribute('aria-hidden')).toBeNull();
  });

  it('returns a no-op when parent is unavailable', () => {
    const orphan = document.createElement('div');
    const bodyChild = document.createElement('div');
    document.body.appendChild(bodyChild);

    // Orphan has no ownerDocument.body? It does — jsdom. Simulate by pointing
    // to a parentNode the target isn't contained in.
    const undo = hideOthers(orphan, bodyChild);
    expect(() => undo()).not.toThrow();
    expect(bodyChild.getAttribute('aria-hidden')).toBeNull();
  });

  it('logs and continues when setAttribute throws on a node', () => {
    const { keep } = setupTree();
    const a = document.querySelector<HTMLElement>('#a')!;
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const original = a.setAttribute;
    a.setAttribute = () => {
      throw new Error('boom');
    };

    expect(() => hideOthers(keep)).not.toThrow();
    expect(error).toHaveBeenCalled();

    a.setAttribute = original;
    error.mockRestore();
  });
});
