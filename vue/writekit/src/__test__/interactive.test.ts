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
  /**
   * The atom itself must stay selectable — this is what makes a click on the
   * card's chrome select the block so Backspace removes it.
   */
  it('does not match the atom island itself, unlike isInteractiveTarget', () => {
    const atom = document.createElement('div');
    atom.setAttribute('contenteditable', 'false');
    atom.innerHTML = '<header class="head">Image</header>';
    document.body.append(atom);

    expect(isInteractiveControl(atom)).toBe(false);
    expect(isInteractiveControl(atom.querySelector('header'))).toBe(false);
    expect(isInteractiveTarget(atom)).toBe(true);

    atom.remove();
  });

  it('matches a switch clicked on its visually-hidden checkbox\'s label', () => {
    // The shape every switch in the wild has: a real checkbox kept off-screen,
    // and the thing the pointer actually lands on is a plain <span>.
    const atom = document.createElement('div');
    atom.innerHTML = '<label><input type="checkbox"><span class="track"></span><span class="lbl">Fake door</span></label>';
    document.body.append(atom);

    expect(isInteractiveControl(atom.querySelector('.track'))).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.lbl'))).toBe(true);
    expect(isInteractiveControl(atom.querySelector('input'))).toBe(true);

    atom.remove();
  });

  it('matches ARIA widgets built from plain elements', () => {
    const atom = document.createElement('div');
    atom.innerHTML = `
      <span role="slider"><svg class="thumb"></svg></span>
      <div role="switch"><span class="dot"></span></div>
      <div role="menuitem"><span class="mi">Replace</span></div>
      <div data-writekit-interactive><span class="custom"></span></div>
      <div class="plain"><span class="inert"></span></div>
    `;
    document.body.append(atom);

    expect(isInteractiveControl(atom.querySelector('.thumb'))).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.dot'))).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.mi'))).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.custom'))).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.inert'))).toBe(false);

    atom.remove();
  });

  it('matches native controls, and ignores an anchor with nothing to follow', () => {
    const atom = document.createElement('div');
    atom.innerHTML = '<button class="b"><svg class="i"></svg></button><select class="s"></select><a class="no-href">x</a>';
    document.body.append(atom);

    expect(isInteractiveControl(atom.querySelector('.i'))).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.s'))).toBe(true);
    expect(isInteractiveControl(atom.querySelector('.no-href'))).toBe(false);
    expect(isInteractiveControl(null)).toBe(false);

    atom.remove();
  });
});
