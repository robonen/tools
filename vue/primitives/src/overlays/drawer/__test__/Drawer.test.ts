import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { VNode } from 'vue';
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from '../index';
import { DRAWER_STYLE_ID } from '../style';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  document.getElementById(DRAWER_STYLE_ID)?.remove();
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

/** Drains Vue's scheduler (including `flush: 'post'` watchers). */
async function flush(): Promise<void> {
  await nextTick();
  await nextTick();
  await nextTick();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Waits out the 500ms "no dragging during the open animation" guard. */
async function openSettled(): Promise<void> {
  await flush();
  await sleep(600);
}

function $<T extends Element = HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function $content(): HTMLElement | null {
  return $('[data-drawer]');
}

function $trigger(): HTMLElement {
  return $<HTMLElement>('[aria-haspopup="dialog"]')!;
}

function $close(): HTMLButtonElement | undefined {
  return [...document.querySelectorAll('button')].find(b => b.textContent === 'Close');
}

function pointer(el: Element, type: string, x: number, y: number) {
  el.dispatchEvent(new PointerEvent(type, {
    button: type === 'pointermove' ? -1 : 0,
    pointerId: 1,
    isPrimary: true,
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  }));
}

/**
 * Quick drag: ~10ms between moves keeps the velocity tracker's samples fresh,
 * so releasing right after reads as a fling.
 */
async function fastDrag(el: Element, points: Array<[number, number]>) {
  pointer(el, 'pointerdown', points[0]![0], points[0]![1]);

  for (const [x, y] of points.slice(1)) {
    await sleep(10);
    pointer(el, 'pointermove', x, y);
  }
}

/** Drag, then pause past MAX_VELOCITY_AGE so the release velocity reads 0. */
async function slowDrag(el: Element, points: Array<[number, number]>) {
  await fastDrag(el, points);
  await sleep(120);
}

interface MountOptions {
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
  dismissible?: boolean;
  direction?: 'top' | 'bottom' | 'left' | 'right';
  snapPoints?: Array<number | string>;
  handleOnly?: boolean;
  withHandle?: boolean;
  contentStyle?: Record<string, string>;
  extraContent?: () => VNode;
  onUpdateOpen?: (v: boolean, details?: { reason?: string }) => void;
  onUpdateActiveSnapPoint?: (v: number | string) => void;
  onRelease?: (open: boolean) => void;
  onAnimationEnd?: (open: boolean) => void;
  onClose?: () => void;
}

function mountDrawer(options: MountOptions = {}) {
  const { withHandle = true } = options;

  const Wrapper = defineComponent({
    setup() {
      return () => h(
        DrawerRoot,
        {
          open: options.open,
          defaultOpen: options.defaultOpen,
          modal: options.modal ?? true,
          dismissible: options.dismissible ?? true,
          direction: options.direction ?? 'bottom',
          snapPoints: options.snapPoints,
          handleOnly: options.handleOnly,
          'onUpdate:open': options.onUpdateOpen,
          'onUpdate:activeSnapPoint': options.onUpdateActiveSnapPoint,
          onRelease: options.onRelease,
          onAnimationEnd: options.onAnimationEnd,
          onClose: options.onClose,
        },
        {
          default: () => [
            h(DrawerTrigger, null, { default: () => 'Open' }),
            h(DrawerPortal, null, {
              default: () => [
                h(DrawerOverlay, { 'data-testid': 'overlay' }),
                h(DrawerContent, { style: { height: '200px', width: '200px', ...options.contentStyle } }, {
                  default: () => [
                    withHandle ? h(DrawerHandle) : null,
                    h(DrawerTitle, null, { default: () => 'Title' }),
                    h(DrawerDescription, null, { default: () => 'Desc' }),
                    h(DrawerClose, null, { default: () => 'Close' }),
                    options.extraContent ? options.extraContent() : null,
                  ],
                }),
              ],
            }),
          ],
        },
      );
    },
  });

  return track(mount(Wrapper, { attachTo: document.body }));
}

describe('Drawer / markup', () => {
  it('renders closed by default', () => {
    mountDrawer();
    expect($trigger().getAttribute('data-state')).toBe('closed');
    expect($content()).toBeNull();
  });

  it('injects the critical drawer stylesheet once', async () => {
    mountDrawer({ defaultOpen: true });
    await flush();
    const tags = document.querySelectorAll(`#${DRAWER_STYLE_ID}`);
    expect(tags.length).toBe(1);
    expect(tags[0]!.textContent).toContain('@keyframes slideFromBottom');
  });

  it('exposes drawer data attributes on the content when open', async () => {
    mountDrawer({ defaultOpen: true, direction: 'right' });
    await flush();
    const content = $content()!;
    expect(content.getAttribute('data-state')).toBe('open');
    expect(content.getAttribute('data-drawer-direction')).toBe('right');
    expect(content.hasAttribute('data-drawer')).toBe(true);
  });

  it('renders the handle without throwing (handleRef wiring)', async () => {
    mountDrawer({ defaultOpen: true, withHandle: true });
    await flush();
    expect($('[data-drawer-handle]')).toBeTruthy();
    expect($('[data-drawer-handle-hitarea]')).toBeTruthy();
  });
});

describe('Drawer / open state', () => {
  it('opens when the trigger is clicked (uncontrolled)', async () => {
    mountDrawer();
    $trigger().click();
    await flush();
    expect($content()).toBeTruthy();
  });

  it('closes when DrawerClose is clicked', async () => {
    mountDrawer({ defaultOpen: true });
    await flush();
    $close()!.click();
    await flush();
    // Presence keeps the node for the exit animation; data-state flips to closed.
    expect($content()?.getAttribute('data-state') ?? 'closed').toBe('closed');
  });

  it('emits update:open with a trigger-press reason (controlled)', async () => {
    const onUpdateOpen = vi.fn();
    mountDrawer({ open: false, onUpdateOpen });

    $trigger().click();
    await flush();
    expect(onUpdateOpen).toHaveBeenCalledWith(true, { reason: 'trigger-press' });
  });

  it('emits close exactly once when dismissed via DrawerClose', async () => {
    const onClose = vi.fn();
    mountDrawer({ defaultOpen: true, onClose });
    await flush();

    $close()!.click();
    await flush();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('emits close when a controlled drawer is closed by flipping v-model:open', async () => {
    // Regression: closing purely by setting the bound `open` prop to false (not
    // via a dialog dismissal) must still run the close side effects.
    const onClose = vi.fn();
    const onUpdateOpen = vi.fn();
    const state = ref(true);
    const Wrapper = defineComponent({
      setup() {
        return () => h(
          DrawerRoot,
          {
            open: state.value,
            'onUpdate:open': (v: boolean, details?: unknown) => {
              state.value = v;
              onUpdateOpen(v, details);
            },
            onClose,
          },
          {
            default: () => h(DrawerPortal, null, {
              default: () => h(DrawerContent, null, {
                default: () => h(DrawerTitle, null, { default: () => 'Title' }),
              }),
            }),
          },
        );
      },
    });

    track(mount(Wrapper, { attachTo: document.body }));
    await flush();
    expect($content()).toBeTruthy();

    state.value = false;
    await flush();
    expect(onClose).toHaveBeenCalledTimes(1);
    // A programmatic flip carries no reason.
    expect(onUpdateOpen).toHaveBeenCalledWith(false, undefined);
  });
});

describe('Drawer / overlay', () => {
  it('renders an overlay for modal drawers', async () => {
    mountDrawer({ defaultOpen: true, modal: true });
    await flush();
    expect($('[data-drawer-overlay]')).toBeTruthy();
  });

  it('omits the overlay for non-modal drawers', async () => {
    mountDrawer({ defaultOpen: true, modal: false });
    await flush();
    expect($('[data-drawer-overlay]')).toBeNull();
  });
});

describe('Drawer / dismiss reasons', () => {
  it('tags an Escape dismissal with escape-key', async () => {
    const onUpdateOpen = vi.fn();
    mountDrawer({ defaultOpen: true, onUpdateOpen });
    await flush();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    await flush();
    expect(onUpdateOpen).toHaveBeenCalledWith(false, { reason: 'escape-key' });
  });

  it('tags a DrawerClose click with close-press', async () => {
    const onUpdateOpen = vi.fn();
    mountDrawer({ defaultOpen: true, onUpdateOpen });
    await flush();

    $close()!.click();
    await flush();
    expect(onUpdateOpen).toHaveBeenCalledWith(false, { reason: 'close-press' });
  });
});

describe('Drawer / handle', () => {
  it('closes a dismissible drawer without snap points on a handle tap', async () => {
    const onUpdateOpen = vi.fn();
    mountDrawer({ defaultOpen: true, onUpdateOpen });
    await flush();

    $('[data-drawer-handle]')!.click();
    await sleep(250); // past the double-tap window
    await flush();
    expect(onUpdateOpen).toHaveBeenCalledWith(false, { reason: 'handle-press' });
  });

  it('keeps a non-dismissible drawer open on a handle tap', async () => {
    // Regression: the condition used to be inverted — a handle tap closed
    // exactly the drawers that declared themselves non-dismissible.
    const onUpdateOpen = vi.fn();
    mountDrawer({ defaultOpen: true, dismissible: false, onUpdateOpen });
    await flush();

    $('[data-drawer-handle]')!.click();
    await sleep(250);
    await flush();
    expect(onUpdateOpen).not.toHaveBeenCalled();
    expect($content()!.getAttribute('data-state')).toBe('open');
  });

  it('cycles snap points on tap and reports the new active point', async () => {
    const onUpdateActiveSnapPoint = vi.fn();
    mountDrawer({ defaultOpen: true, snapPoints: [0.5, 1], onUpdateActiveSnapPoint });
    await flush();

    $('[data-drawer-handle]')!.click();
    await sleep(250);
    await flush();
    expect(onUpdateActiveSnapPoint).toHaveBeenCalledWith(1);
  });

  it('cycles once on a double tap, not twice', async () => {
    const onUpdateActiveSnapPoint = vi.fn();
    mountDrawer({ defaultOpen: true, snapPoints: [0.3, 0.6, 1], onUpdateActiveSnapPoint });
    await flush();
    onUpdateActiveSnapPoint.mockClear();

    const handle = $('[data-drawer-handle]')!;

    // A full tap is pointerdown → pointerup → click. Both taps are dispatched
    // in the same synchronous block: no timer can fire in between, so the
    // second press deterministically lands inside the double-tap window and
    // must cancel the first pending cycle.
    pointer(handle, 'pointerdown', 100, 100);
    pointer(handle, 'pointerup', 100, 100);
    handle.click();
    pointer(handle, 'pointerdown', 100, 100);
    pointer(handle, 'pointerup', 100, 100);
    handle.click();

    await sleep(300);
    await flush();

    expect(onUpdateActiveSnapPoint).toHaveBeenCalledWith(0.6);
    expect(onUpdateActiveSnapPoint).not.toHaveBeenCalledWith(1);
  });

  it('does not cycle when a short drag on the handle ends in a click', async () => {
    const onUpdateActiveSnapPoint = vi.fn();
    const onUpdateOpen = vi.fn();
    // Full-height content: fraction snap points assume the drawer can cover
    // the window, otherwise every release projects as "closer to closed".
    mountDrawer({ defaultOpen: true, snapPoints: [0.5, 1], contentStyle: { height: '100vh' }, onUpdateActiveSnapPoint, onUpdateOpen });
    await openSettled();
    onUpdateActiveSnapPoint.mockClear();

    const handle = $('[data-drawer-handle]')!;

    // A small real drag from the handle (upward, so a dismissible drawer at
    // its first snap point doesn't legitimately close), then the click the
    // browser dispatches after release — pointer capture keeps it on the
    // handle. The engaged drag must suppress the tap-to-cycle.
    await slowDrag(handle, [[100, 300], [100, 290], [100, 280]]);
    pointer(handle, 'pointerup', 100, 280);
    handle.click();

    await sleep(300);
    await flush();

    expect(onUpdateActiveSnapPoint).not.toHaveBeenCalledWith(1);
    expect(onUpdateOpen).not.toHaveBeenCalled();
  });

  it('does not fire a pending tap cycle after the handle unmounts', async () => {
    const showHandle = ref(true);
    const onUpdateActiveSnapPoint = vi.fn();

    // The root must stay mounted (its emitter alive) while only the handle
    // unmounts — otherwise a leaked timer could never be observed.
    const Wrapper = defineComponent({
      setup() {
        return () => h(
          DrawerRoot,
          { defaultOpen: true, snapPoints: [0.5, 1], 'onUpdate:activeSnapPoint': onUpdateActiveSnapPoint },
          {
            default: () => h(DrawerPortal, null, {
              default: () => h(DrawerContent, { style: { height: '200px' } }, {
                default: () => [
                  showHandle.value ? h(DrawerHandle) : null,
                  h(DrawerTitle, null, { default: () => 'Title' }),
                  h(DrawerDescription, null, { default: () => 'Desc' }),
                ],
              }),
            }),
          },
        );
      },
    });

    track(mount(Wrapper, { attachTo: document.body }));
    await flush();
    onUpdateActiveSnapPoint.mockClear();

    $('[data-drawer-handle]')!.click();
    showHandle.value = false; // unmount inside the 120ms window
    await flush();
    await sleep(250);

    expect(onUpdateActiveSnapPoint).not.toHaveBeenCalled();
  });
});

describe('Drawer / drag gesture', () => {
  it('closes on a swipe past the close threshold with a swipe reason', async () => {
    const onUpdateOpen = vi.fn();
    const onRelease = vi.fn();
    mountDrawer({ defaultOpen: true, onUpdateOpen, onRelease });
    await openSettled();

    const content = $content()!;
    await slowDrag(content, [[100, 300], [100, 330], [100, 360], [100, 390]]);
    pointer(content, 'pointerup', 100, 390);
    await flush();

    expect(onUpdateOpen).toHaveBeenCalledWith(false, { reason: 'swipe' });
    expect(onRelease).toHaveBeenCalledWith(false);
  });

  it('marks the content and overlay with data-swiping while dragging', async () => {
    mountDrawer({ defaultOpen: true });
    await openSettled();

    const content = $content()!;
    // Small drag + pause: stays under both the distance and velocity
    // thresholds, so the drawer remains open after release.
    await slowDrag(content, [[100, 300], [100, 315], [100, 330]]);

    expect(content.hasAttribute('data-swiping')).toBe(true);
    expect(content.classList.contains('drawer-dragging')).toBe(true);
    expect($('[data-drawer-overlay]')!.hasAttribute('data-swiping')).toBe(true);

    pointer(content, 'pointerup', 100, 330);
    await flush();
    expect(content.getAttribute('data-state')).toBe('open');
    expect(content.hasAttribute('data-swiping')).toBe(false);
  });

  it('settles back below the threshold when released without momentum', async () => {
    const onUpdateOpen = vi.fn();
    const onRelease = vi.fn();
    mountDrawer({ defaultOpen: true, onUpdateOpen, onRelease });
    await openSettled();

    const content = $content()!;
    // 30px of a 200px drawer — under the 25% threshold; pause kills momentum.
    await slowDrag(content, [[100, 300], [100, 315], [100, 330]]);
    pointer(content, 'pointerup', 100, 330);
    await flush();

    expect(onUpdateOpen).not.toHaveBeenCalled();
    expect(onRelease).toHaveBeenCalledWith(true);
    expect(content.style.transform).toBe('translate3d(0px, 0px, 0px)');
  });

  it('does not close after the user reverses past the cancel threshold', async () => {
    // "Changed my mind": drag well past the close threshold, pull back, hold,
    // release — the drawer must stay open even though the release point alone
    // clears the distance threshold.
    const onUpdateOpen = vi.fn();
    mountDrawer({ defaultOpen: true, onUpdateOpen });
    await openSettled();

    const content = $content()!;
    await slowDrag(content, [[100, 300], [100, 360], [100, 420], [100, 360]]);
    pointer(content, 'pointerup', 100, 360);
    await flush();

    expect(onUpdateOpen).not.toHaveBeenCalled();
    expect(content.getAttribute('data-state')).toBe('open');
  });

  it('recovers cleanly from pointercancel mid-drag', async () => {
    const onUpdateOpen = vi.fn();
    mountDrawer({ defaultOpen: true, onUpdateOpen });
    await openSettled();

    const content = $content()!;
    await fastDrag(content, [[100, 300], [100, 330], [100, 360]]);
    expect(content.classList.contains('drawer-dragging')).toBe(true);

    pointer(content, 'pointercancel', 100, 360);
    await flush();

    expect(content.classList.contains('drawer-dragging')).toBe(false);
    expect(content.hasAttribute('data-swiping')).toBe(false);
    expect(onUpdateOpen).not.toHaveBeenCalled();
    expect(content.style.transform).toBe('translate3d(0px, 0px, 0px)');

    // The next gesture still works.
    await slowDrag(content, [[100, 300], [100, 340], [100, 380], [100, 420]]);
    pointer(content, 'pointerup', 100, 420);
    await flush();
    expect(onUpdateOpen).toHaveBeenCalledWith(false, { reason: 'swipe' });
  });

  it('ignores a cross-axis gesture (axis lock)', async () => {
    const onUpdateOpen = vi.fn();
    mountDrawer({ defaultOpen: true, onUpdateOpen });
    await openSettled();

    const content = $content()!;
    // Mostly-horizontal movement on a bottom drawer must never latch a drag.
    await fastDrag(content, [[100, 300], [140, 305], [180, 310], [220, 315]]);
    pointer(content, 'pointerup', 220, 315);
    await flush();

    expect(content.classList.contains('drawer-dragging')).toBe(false);
    expect(onUpdateOpen).not.toHaveBeenCalled();
  });

  it('scales the close-out animation with the fling velocity', async () => {
    const onUpdateOpen = vi.fn();
    const onAnimationEnd = vi.fn();
    mountDrawer({ defaultOpen: true, onUpdateOpen, onAnimationEnd });
    await openSettled();

    const content = $content()!;
    // Rapid successive moves keep the instantaneous velocity high.
    await fastDrag(content, [[100, 300], [100, 330], [100, 360], [100, 390]]);
    pointer(content, 'pointerup', 100, 390);
    await flush();

    expect(onUpdateOpen).toHaveBeenCalledWith(false, { reason: 'swipe' });
    // The inline duration overrides the stylesheet's 0.5s for this close only.
    expect(content.style.animationDuration).not.toBe('');
    expect(Number.parseFloat(content.style.animationDuration)).toBeLessThan(0.5);

    // animationEnd follows the (scaled) animation, via the real animationend.
    await vi.waitFor(() => expect(onAnimationEnd).toHaveBeenCalledWith(false), { timeout: 1000 });
  });

  it('keeps the default close duration for a slow release past the threshold', async () => {
    const onUpdateOpen = vi.fn();
    mountDrawer({ defaultOpen: true, onUpdateOpen });
    await openSettled();

    const content = $content()!;
    await slowDrag(content, [[100, 300], [100, 330], [100, 360], [100, 390]]);
    pointer(content, 'pointerup', 100, 390);
    await flush();

    expect(onUpdateOpen).toHaveBeenCalledWith(false, { reason: 'swipe' });
    expect(content.style.animationDuration).toBe('');
  });
});

describe('Drawer / pointer capture', () => {
  it('captures the pointer on the pressed element, not the drawer content', async () => {
    mountDrawer({
      defaultOpen: true,
      extraContent: () => h('button', { 'data-testid': 'inner' }, 'Inner'),
    });
    await flush();

    const content = $content()!;
    const button = $<HTMLButtonElement>('[data-testid="inner"]')!;
    const captured: Element[] = [];

    for (const el of [content, button])
      (el as any).setPointerCapture = () => captured.push(el);

    pointer(button, 'pointerdown', 100, 300);

    // Capturing on the drawer would retarget the compat mouse events, so the
    // button would never receive `click` — the capture must land on the button.
    expect(captured).toEqual([button]);

    pointer(button, 'pointerup', 100, 300);
    await flush();
    expect(content.getAttribute('data-state')).toBe('open');
  });

  it('captures on the handle for handleOnly gestures', async () => {
    mountDrawer({ defaultOpen: true, handleOnly: true });
    await flush();

    const content = $content()!;
    const handle = $('[data-drawer-handle]')!;
    const hitarea = $('[data-drawer-handle-hitarea]')!;
    const captured: Element[] = [];

    for (const el of [content, handle, hitarea])
      (el as any).setPointerCapture = () => captured.push(el);

    pointer(hitarea, 'pointerdown', 100, 300);

    expect(captured).toEqual([handle]);

    pointer(hitarea, 'pointerup', 100, 300);
    await flush();
  });
});

describe('Drawer / lifecycle machine', () => {
  it('resets the active snap point only when a close actually settles', async () => {
    const open = ref(true);
    const active = ref<number | string | null | undefined>(0.9);

    const Wrapper = defineComponent({
      setup() {
        return () => h(
          DrawerRoot,
          {
            open: open.value,
            snapPoints: [0.4, 0.9],
            activeSnapPoint: active.value,
            'onUpdate:open': (v: boolean) => { open.value = v; },
            'onUpdate:activeSnapPoint': (v: number | string) => { active.value = v; },
          },
          {
            default: () => h(DrawerPortal, null, {
              default: () => h(DrawerContent, { style: { height: '200px' } }, {
                default: () => [
                  h(DrawerTitle, null, { default: () => 'Title' }),
                  h(DrawerDescription, null, { default: () => 'Desc' }),
                ],
              }),
            }),
          },
        );
      },
    });

    track(mount(Wrapper, { attachTo: document.body }));
    await flush();

    // Close, then reopen before the exit settles: the pending close cleanup
    // must NOT fire on the now-live drawer (the old fixed 500ms timeout did).
    open.value = false;
    await flush();
    await sleep(60);
    open.value = true;
    await flush();
    await sleep(700);

    expect(active.value).toBe(0.9);

    // A close that actually settles still resets to the first snap point.
    open.value = false;
    await flush();
    await sleep(700);

    expect(active.value).toBe(0.4);
  });
});

describe('Drawer / scroll containers', () => {
  function scrollerContent(direction: 'vertical' | 'horizontal') {
    return () => h(
      'div',
      {
        'data-testid': 'scroller',
        style: direction === 'vertical'
          ? 'height: 100px; overflow-y: auto;'
          : 'width: 100px; overflow-x: auto;',
      },
      [h('div', {
        style: direction === 'vertical' ? 'height: 400px;' : 'width: 400px; height: 20px;',
      }, [h('span', { 'data-testid': 'leaf' }, 'content')])],
    );
  }

  it('lets a mid-scroll container own the gesture (vertical)', async () => {
    const onUpdateOpen = vi.fn();
    mountDrawer({ defaultOpen: true, onUpdateOpen, extraContent: scrollerContent('vertical') });
    await openSettled();

    const content = $content()!;
    const scroller = $('[data-testid="scroller"]')!;
    const leaf = $('[data-testid="leaf"]')!;

    scroller.scrollTop = 50;
    await slowDrag(leaf, [[100, 300], [100, 340], [100, 380], [100, 420]]);
    pointer(leaf, 'pointerup', 100, 420);
    await flush();
    expect(content.classList.contains('drawer-dragging')).toBe(false);
    expect(onUpdateOpen).not.toHaveBeenCalled();

    // At the top edge the same gesture is a dismiss.
    scroller.scrollTop = 0;
    await sleep(150); // clear the scroll-lock timeout
    await slowDrag(leaf, [[100, 300], [100, 340], [100, 380], [100, 420]]);
    pointer(leaf, 'pointerup', 100, 420);
    await flush();
    expect(onUpdateOpen).toHaveBeenCalledWith(false, { reason: 'swipe' });
  });

  it('respects horizontal scroll containers in side drawers', async () => {
    // Regression: left/right drawers used to skip every shouldDrag check.
    const onUpdateOpen = vi.fn();
    mountDrawer({
      defaultOpen: true,
      direction: 'right',
      onUpdateOpen,
      extraContent: scrollerContent('horizontal'),
    });
    await openSettled();

    const content = $content()!;
    const scroller = $('[data-testid="scroller"]')!;
    const leaf = $('[data-testid="leaf"]')!;

    scroller.scrollLeft = 50;
    await slowDrag(leaf, [[100, 300], [140, 300], [180, 300], [220, 300]]);
    pointer(leaf, 'pointerup', 220, 300);
    await flush();
    expect(content.classList.contains('drawer-dragging')).toBe(false);
    expect(onUpdateOpen).not.toHaveBeenCalled();

    scroller.scrollLeft = 0;
    await sleep(150);
    await slowDrag(leaf, [[100, 300], [140, 300], [180, 300], [220, 300]]);
    pointer(leaf, 'pointerup', 220, 300);
    await flush();
    expect(onUpdateOpen).toHaveBeenCalledWith(false, { reason: 'swipe' });
  });
});

describe('Drawer / snap points', () => {
  it('positions the drawer at the first snap point and exposes the offsets', async () => {
    mountDrawer({ defaultOpen: true, snapPoints: [0.5, 1] });
    await flush();

    const content = $content()!;
    expect(content.getAttribute('data-drawer-snap-points')).toBe('true');

    const expected = Math.round(window.innerHeight - window.innerHeight * 0.5);
    await vi.waitFor(() => {
      expect(content.style.transform).toBe(`translate3d(0px, ${expected}px, 0px)`);
    });
    expect(content.style.getPropertyValue('--snap-point-height')).toBe(`${expected}px`);
  });

  it('resolves px and rem snap points', async () => {
    mountDrawer({ defaultOpen: true, snapPoints: ['10rem', '500px'] });
    await flush();

    const content = $content()!;
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const expected = Math.round(window.innerHeight - 10 * rem);
    await vi.waitFor(() => {
      expect(content.style.transform).toBe(`translate3d(0px, ${expected}px, 0px)`);
    });
  });
});
