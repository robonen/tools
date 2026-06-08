import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useMousePressed } from '.';

function dispatch(target: EventTarget, type: string): Event {
  const event = new Event(type);
  target.dispatchEvent(event);
  return event;
}

describe(useMousePressed, () => {
  it('starts not pressed by default', () => {
    const scope = effectScope();
    let res: ReturnType<typeof useMousePressed>;
    scope.run(() => {
      res = useMousePressed();
    });
    expect(res!.pressed.value).toBeFalsy();
    expect(res!.sourceType.value).toBe(null);
    scope.stop();
  });

  it('honors the initial value', () => {
    const scope = effectScope();
    let res: ReturnType<typeof useMousePressed>;
    scope.run(() => {
      res = useMousePressed({ initialValue: true });
    });
    expect(res!.pressed.value).toBeTruthy();
    scope.stop();
  });

  it('sets pressed and mouse sourceType on mousedown, clears on mouseup', async () => {
    const scope = effectScope();
    let res: ReturnType<typeof useMousePressed>;
    scope.run(() => {
      res = useMousePressed();
    });

    dispatch(globalThis, 'mousedown');
    await nextTick();
    expect(res!.pressed.value).toBeTruthy();
    expect(res!.sourceType.value).toBe('mouse');

    dispatch(globalThis, 'mouseup');
    await nextTick();
    expect(res!.pressed.value).toBeFalsy();
    expect(res!.sourceType.value).toBe(null);
    scope.stop();
  });

  it('clears pressed on mouseleave', async () => {
    const scope = effectScope();
    let res: ReturnType<typeof useMousePressed>;
    scope.run(() => {
      res = useMousePressed();
    });

    dispatch(globalThis, 'mousedown');
    await nextTick();
    expect(res!.pressed.value).toBeTruthy();

    dispatch(globalThis, 'mouseleave');
    await nextTick();
    expect(res!.pressed.value).toBeFalsy();
    scope.stop();
  });

  it('tracks touch presses with touch sourceType', async () => {
    const scope = effectScope();
    let res: ReturnType<typeof useMousePressed>;
    scope.run(() => {
      res = useMousePressed();
    });

    dispatch(globalThis, 'touchstart');
    await nextTick();
    expect(res!.pressed.value).toBeTruthy();
    expect(res!.sourceType.value).toBe('touch');

    dispatch(globalThis, 'touchend');
    await nextTick();
    expect(res!.pressed.value).toBeFalsy();
    expect(res!.sourceType.value).toBe(null);
    scope.stop();
  });

  it('clears pressed on touchcancel', async () => {
    const scope = effectScope();
    let res: ReturnType<typeof useMousePressed>;
    scope.run(() => {
      res = useMousePressed();
    });

    dispatch(globalThis, 'touchstart');
    await nextTick();
    expect(res!.pressed.value).toBeTruthy();

    dispatch(globalThis, 'touchcancel');
    await nextTick();
    expect(res!.pressed.value).toBeFalsy();
    scope.stop();
  });

  it('does not register touch listeners when touch is disabled', async () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    const scope = effectScope();
    let res: ReturnType<typeof useMousePressed>;
    scope.run(() => {
      res = useMousePressed({ touch: false });
    });
    await nextTick();

    const touchCalls = addSpy.mock.calls.filter(([name]) => String(name).startsWith('touch'));
    expect(touchCalls).toHaveLength(0);

    dispatch(globalThis, 'touchstart');
    await nextTick();
    expect(res!.pressed.value).toBeFalsy();

    addSpy.mockRestore();
    scope.stop();
  });

  it('tracks drag presses when drag is enabled', async () => {
    const scope = effectScope();
    let res: ReturnType<typeof useMousePressed>;
    scope.run(() => {
      res = useMousePressed();
    });

    dispatch(globalThis, 'dragstart');
    await nextTick();
    expect(res!.pressed.value).toBeTruthy();
    expect(res!.sourceType.value).toBe('mouse');

    dispatch(globalThis, 'dragend');
    await nextTick();
    expect(res!.pressed.value).toBeFalsy();
    scope.stop();
  });

  it('clears pressed on drop', async () => {
    const scope = effectScope();
    let res: ReturnType<typeof useMousePressed>;
    scope.run(() => {
      res = useMousePressed();
    });

    dispatch(globalThis, 'dragstart');
    await nextTick();
    expect(res!.pressed.value).toBeTruthy();

    dispatch(globalThis, 'drop');
    await nextTick();
    expect(res!.pressed.value).toBeFalsy();
    scope.stop();
  });

  it('does not register drag listeners when drag is disabled', async () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    const scope = effectScope();
    scope.run(() => {
      useMousePressed({ drag: false });
    });
    await nextTick();

    const dragCalls = addSpy.mock.calls.filter(([name]) => String(name).startsWith('drag') || name === 'drop');
    expect(dragCalls).toHaveLength(0);

    addSpy.mockRestore();
    scope.stop();
  });

  it('invokes onPressed and onReleased callbacks', async () => {
    const onPressed = vi.fn();
    const onReleased = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      useMousePressed({ onPressed, onReleased });
    });

    const down = dispatch(globalThis, 'mousedown');
    await nextTick();
    expect(onPressed).toHaveBeenCalledTimes(1);
    expect(onPressed).toHaveBeenCalledWith(down);

    const up = dispatch(globalThis, 'mouseup');
    await nextTick();
    expect(onReleased).toHaveBeenCalledTimes(1);
    expect(onReleased).toHaveBeenCalledWith(up);
    scope.stop();
  });

  it('attaches passive listeners and respects the capture option', async () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    const scope = effectScope();
    scope.run(() => {
      useMousePressed({ capture: true });
    });
    await nextTick();

    const downCall = addSpy.mock.calls.find(([name]) => name === 'mousedown');
    expect(downCall).toBeDefined();
    const opts = downCall![2] as AddEventListenerOptions;
    expect(opts.passive).toBeTruthy();
    expect(opts.capture).toBeTruthy();

    addSpy.mockRestore();
    scope.stop();
  });

  it('listens for press on a custom element target', async () => {
    const el = document.createElement('div');
    const elRef = shallowRef(el);
    const addSpy = vi.spyOn(el, 'addEventListener');

    const scope = effectScope();
    let res: ReturnType<typeof useMousePressed>;
    scope.run(() => {
      res = useMousePressed({ target: elRef });
    });
    await nextTick();

    expect(addSpy.mock.calls.some(([name]) => name === 'mousedown')).toBeTruthy();

    dispatch(el, 'mousedown');
    await nextTick();
    expect(res!.pressed.value).toBeTruthy();
    expect(res!.sourceType.value).toBe('mouse');

    // release still listens on window
    dispatch(globalThis, 'mouseup');
    await nextTick();
    expect(res!.pressed.value).toBeFalsy();

    addSpy.mockRestore();
    scope.stop();
  });

  it('does nothing when window is unavailable (SSR)', () => {
    const scope = effectScope();
    let res: ReturnType<typeof useMousePressed>;
    scope.run(() => {
      res = useMousePressed({ window: undefined, initialValue: true });
    });
    // returns refs without attaching listeners
    expect(res!.pressed.value).toBeTruthy();
    expect(res!.sourceType.value).toBe(null);
    scope.stop();
  });
});
