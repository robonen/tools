import { describe, expect, it } from 'vitest';
import { isInteractiveControl, isInteractiveTarget } from '../view/interactive';

describe('isInteractiveTarget', () => {
  it('matches atom controls and contenteditable=false islands, not writekit text', () => {
    const root = document.createElement('div');
    root.setAttribute('contenteditable', 'true');
    root.innerHTML = '<p class="text">hi</p><figure contenteditable="false"><input class="cap"></figure>';
    document.body.append(root);

    expect(isInteractiveTarget(root.querySelector('input.cap'))).toBe(true);
    expect(isInteractiveTarget(root.querySelector('figure'))).toBe(true);
    expect(isInteractiveTarget(root.querySelector('p.text'))).toBe(false);
    expect(isInteractiveTarget(root)).toBe(false);
    expect(isInteractiveTarget(null)).toBe(false);

    root.remove();
  });
});

describe('isInteractiveControl', () => {
  /** An atom rendered the way BlockView renders one, inside the content root. */
  function mount(inner: string): { root: HTMLElement; atom: Element } {
    const root = document.createElement('div');
    root.setAttribute('role', 'textbox');
    root.setAttribute('contenteditable', 'true');
    root.innerHTML = `<div class="atom" contenteditable="false">${inner}</div>`;
    document.body.append(root);

    return { root, atom: root.querySelector('.atom')! };
  }

  /**
   * The atom itself must stay selectable — this is what makes a click on the
   * card's chrome select the block so Backspace removes it.
   */
  it('does not match the atom island itself, unlike isInteractiveTarget', () => {
    const { root, atom } = mount('<header class="head">Image</header>');

    expect(isInteractiveControl(atom, atom)).toBe(false);
    expect(isInteractiveControl(atom.querySelector('.head'), atom)).toBe(false);
    expect(isInteractiveTarget(atom)).toBe(true);

    root.remove();
  });

  it('matches a switch clicked anywhere on its label, not just the checkbox', () => {
    // The shape every switch in the wild has: a real checkbox kept off-screen,
    // and the thing the pointer actually lands on is a plain <span>.
    const { root, atom } = mount(
      '<label><input type="checkbox"><span class="track"></span><span class="lbl">Fake door</span></label>',
    );

    expect(isInteractiveControl(atom.querySelector('.track'), atom)).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.lbl'), atom)).toBe(true);
    expect(isInteractiveControl(atom.querySelector('input'), atom)).toBe(true);

    root.remove();
  });

  it('matches ARIA widgets built from plain elements', () => {
    const { root, atom } = mount(`
      <span role="slider"><svg class="thumb"></svg></span>
      <div role="switch"><span class="dot"></span></div>
      <div role="menuitem"><span class="mi">Replace</span></div>
      <div data-writekit-interactive><span class="custom"></span></div>
      <div class="plain"><span class="inert"></span></div>
    `);

    expect(isInteractiveControl(atom.querySelector('.thumb'), atom)).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.dot'), atom)).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.mi'), atom)).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.custom'), atom)).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.inert'), atom)).toBe(false);

    root.remove();
  });

  it('stops at the block: the content root is a widget of its own', () => {
    // WritekitContent carries role="textbox". Without the boundary every click
    // inside any atom finds it on the way up and reads as interactive, which
    // would leave atoms permanently unselectable.
    const { root, atom } = mount('<span class="chrome">Image</span>');
    const chrome = atom.querySelector('.chrome');

    expect(isInteractiveControl(chrome, atom)).toBe(false);
    expect(isInteractiveControl(chrome)).toBe(true); // unbounded: finds the root

    root.remove();
  });

  it('matches native controls, and ignores an anchor with nothing to follow', () => {
    const { root, atom } = mount(
      '<button class="b"><svg class="i"></svg></button><select class="s"></select><a class="no-href">x</a>',
    );

    expect(isInteractiveControl(atom.querySelector('.i'), atom)).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.s'), atom)).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.no-href'), atom)).toBe(false);
    expect(isInteractiveControl(null, atom)).toBe(false);

    root.remove();
  });
});
