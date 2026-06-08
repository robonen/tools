import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useAnimate } from '.';

// --- Stub Animation -------------------------------------------------------

type Listener = (ev: any) => void;

class StubAnimation {
  effect: any;
  timeline: any = { kind: 'document' };
  startTime: number | null = null;
  currentTime: number | null = 0;
  playbackRate = 1;
  pending = false;
  playState: AnimationPlayState = 'idle';
  replaceState: AnimationReplaceState = 'active';

  play = vi.fn(() => {
    this.playState = 'running';
  });

  pause = vi.fn(() => {
    this.playState = 'paused';
  });

  reverse = vi.fn(() => {
    this.playbackRate = -1;
    this.playState = 'running';
  });

  finish = vi.fn(() => {
    this.playState = 'finished';
  });

  cancel = vi.fn(() => {
    this.playState = 'idle';
  });

  persist = vi.fn();
  commitStyles = vi.fn();

  private listeners = new Map<string, Set<Listener>>();

  addEventListener = vi.fn((type: string, listener: Listener) => {
    if (!this.listeners.has(type))
      this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  });

  removeEventListener = vi.fn((type: string, listener: Listener) => {
    this.listeners.get(type)?.delete(listener);
  });

  dispatch(type: string) {
    this.listeners.get(type)?.forEach(l => l({ type }));
  }

  constructor(public keyframes: any, public options: any) {
    instances.push(this);
  }
}

let instances: StubAnimation[] = [];
let animateSpy: ReturnType<typeof vi.fn>;

// Flush enough rAF + microtasks for the useRafFn store sync to run.
async function flushFrames(count = 3) {
  for (let i = 0; i < count; i++) {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await nextTick();
  }
}

describe(useAnimate, () => {
  beforeEach(() => {
    instances = [];
    animateSpy = vi.fn(function (this: HTMLElement, keyframes: any, options: any) {
      return new StubAnimation(keyframes, options) as unknown as Animation;
    });
    // jsdom does not implement the Web Animations API
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: animateSpy,
    });
    vi.stubGlobal('KeyframeEffect', class {
      constructor(public el: any, public kf: any, public opts: any) {}
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (HTMLElement.prototype as any).animate;
  });

  it('reports support when Element.animate exists', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let api!: ReturnType<typeof useAnimate>;
    scope.run(() => {
      api = useAnimate(ref(el), [{ opacity: 0 }, { opacity: 1 }], 1000);
    });

    expect(api.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('creates the animation immediately for a resolved target', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let api!: ReturnType<typeof useAnimate>;
    scope.run(() => {
      api = useAnimate(ref(el), [{ opacity: 0 }, { opacity: 1 }], 1000);
    });

    await flushFrames();

    expect(animateSpy).toHaveBeenCalledTimes(1);
    expect(animateSpy).toHaveBeenCalledWith([{ opacity: 0 }, { opacity: 1 }], 1000);
    expect(api.animate.value).toBe(instances[0] as unknown as Animation);
    scope.stop();
  });

  it('passes an options object through to animate, stripping reserved keys', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => {
      useAnimate(ref(el), { opacity: [0, 1] }, {
        duration: 500,
        easing: 'ease-in',
        immediate: true,
        commitStyles: true,
      });
    });

    await flushFrames();

    expect(animateSpy).toHaveBeenCalledWith({ opacity: [0, 1] }, { duration: 500, easing: 'ease-in' });
    expect(instances[0]!.options).not.toHaveProperty('immediate');
    expect(instances[0]!.options).not.toHaveProperty('commitStyles');
    scope.stop();
  });

  it('does not auto-play when immediate is false', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let api!: ReturnType<typeof useAnimate>;
    scope.run(() => {
      api = useAnimate(ref(el), [{ opacity: 0 }], { duration: 1000, immediate: false });
    });

    await flushFrames();

    expect(instances[0]!.pause).toHaveBeenCalled();
    expect(api.animate.value).toBeDefined();
    scope.stop();
  });

  it('play / pause / reverse / finish / cancel delegate to the Animation', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let api!: ReturnType<typeof useAnimate>;
    scope.run(() => {
      api = useAnimate(ref(el), [{ opacity: 0 }], 1000);
    });

    await flushFrames();
    const inst = instances[0]!;

    api.pause();
    expect(inst.pause).toHaveBeenCalled();

    api.play();
    expect(inst.play).toHaveBeenCalled();

    api.reverse();
    expect(inst.reverse).toHaveBeenCalled();

    api.finish();
    expect(inst.finish).toHaveBeenCalled();

    api.cancel();
    expect(inst.cancel).toHaveBeenCalled();
    scope.stop();
  });

  it('syncs reactive playState from the live animation', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let api!: ReturnType<typeof useAnimate>;
    scope.run(() => {
      api = useAnimate(ref(el), [{ opacity: 0 }], 1000);
    });

    await flushFrames();
    const inst = instances[0]!;

    inst.playState = 'running';
    inst.currentTime = 42;
    api.play();
    await flushFrames();

    expect(api.playState.value).toBe('running');
    expect(api.currentTime.value).toBe(42);
    scope.stop();
  });

  it('writes currentTime back to the animation', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let api!: ReturnType<typeof useAnimate>;
    scope.run(() => {
      api = useAnimate(ref(el), [{ opacity: 0 }], 1000);
    });

    await flushFrames();
    const inst = instances[0]!;

    api.currentTime.value = 250;
    expect(inst.currentTime).toBe(250);
    expect(api.currentTime.value).toBe(250);
    scope.stop();
  });

  it('writes playbackRate back to the animation', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let api!: ReturnType<typeof useAnimate>;
    scope.run(() => {
      api = useAnimate(ref(el), [{ opacity: 0 }], 1000);
    });

    await flushFrames();
    const inst = instances[0]!;

    api.playbackRate.value = 2;
    expect(inst.playbackRate).toBe(2);
    expect(api.playbackRate.value).toBe(2);
    scope.stop();
  });

  it('applies persist and initial playbackRate options', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => {
      useAnimate(ref(el), [{ opacity: 0 }], { duration: 1000, persist: true, playbackRate: 3 });
    });

    await flushFrames();
    const inst = instances[0]!;

    expect(inst.persist).toHaveBeenCalled();
    expect(inst.playbackRate).toBe(3);
    scope.stop();
  });

  it('commits styles on finish when commitStyles is set', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => {
      useAnimate(ref(el), [{ opacity: 0 }], { duration: 1000, commitStyles: true });
    });

    await flushFrames();
    const inst = instances[0]!;

    inst.dispatch('finish');
    expect(inst.commitStyles).toHaveBeenCalled();
    scope.stop();
  });

  it('calls onReady with the created animation', async () => {
    const el = document.createElement('div');
    const onReady = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      useAnimate(ref(el), [{ opacity: 0 }], { duration: 1000, onReady });
    });

    await flushFrames();

    expect(onReady).toHaveBeenCalledWith(instances[0]);
    scope.stop();
  });

  it('routes thrown errors to onError instead of throwing', async () => {
    const el = document.createElement('div');
    const onError = vi.fn();
    const scope = effectScope();
    let api!: ReturnType<typeof useAnimate>;
    scope.run(() => {
      api = useAnimate(ref(el), [{ opacity: 0 }], { duration: 1000, onError });
    });

    await flushFrames();
    const inst = instances[0]!;
    const boom = new Error('boom');
    inst.play.mockImplementationOnce(() => {
      throw boom;
    });

    expect(() => api.play()).not.toThrow();
    expect(onError).toHaveBeenCalledWith(boom);
    scope.stop();
  });

  it('clears the animation when the target becomes null', async () => {
    const el = document.createElement('div');
    const target = ref<HTMLElement | null>(el);
    const scope = effectScope();
    let api!: ReturnType<typeof useAnimate>;
    scope.run(() => {
      api = useAnimate(target, [{ opacity: 0 }], 1000);
    });

    await flushFrames();
    expect(api.animate.value).toBeDefined();

    target.value = null;
    await nextTick();
    expect(api.animate.value).toBeUndefined();
    scope.stop();
  });

  it('cancels the animation on scope dispose', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => {
      useAnimate(ref(el), [{ opacity: 0 }], 1000);
    });

    await flushFrames();
    const inst = instances[0]!;

    scope.stop();
    expect(inst.cancel).toHaveBeenCalled();
  });

  it('is not supported and never animates when window is undefined (SSR)', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let api!: ReturnType<typeof useAnimate>;
    scope.run(() => {
      api = useAnimate(ref(el), [{ opacity: 0 }], { duration: 1000, window: undefined });
    });

    await flushFrames();

    expect(api.isSupported.value).toBeFalsy();
    expect(animateSpy).not.toHaveBeenCalled();
    expect(api.animate.value).toBeUndefined();
    scope.stop();
  });
});
