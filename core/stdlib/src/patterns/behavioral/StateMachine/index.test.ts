import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMachine, createAsyncMachine, StateMachine, AsyncStateMachine } from '.';

describe('stateMachine', () => {
  describe('createMachine (without context)', () => {
    let machine: ReturnType<typeof createSimpleMachine>;

    function createSimpleMachine() {
      return createMachine({
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: 'running',
            },
          },
          running: {
            on: {
              STOP: 'idle',
              PAUSE: 'paused',
            },
          },
          paused: {
            on: {
              RESUME: 'running',
              STOP: 'idle',
            },
          },
        },
      });
    }

    beforeEach(() => {
      machine = createSimpleMachine();
    });

    it('initializes with the initial state', () => {
      expect(machine.current).toBe('idle');
    });

    it('transitions on send', () => {
      machine.send('START');

      expect(machine.current).toBe('running');
    });

    it('returns new state from send', () => {
      const result = machine.send('START');

      expect(result).toBe('running');
    });

    it('handles multiple transitions', () => {
      machine.send('START');
      machine.send('PAUSE');
      machine.send('RESUME');
      machine.send('STOP');

      expect(machine.current).toBe('idle');
    });

    it('ignores unhandled events', () => {
      machine.send('STOP');

      expect(machine.current).toBe('idle');
    });

    it('ignores events not defined in current state', () => {
      machine.send('PAUSE');

      expect(machine.current).toBe('idle');
    });

    it('matches current state', () => {
      expect(machine.matches('idle')).toBe(true);
      expect(machine.matches('running')).toBe(false);

      machine.send('START');

      expect(machine.matches('idle')).toBe(false);
      expect(machine.matches('running')).toBe(true);
    });

    it('checks if event can be handled', () => {
      expect(machine.can('START')).toBe(true);
      expect(machine.can('STOP')).toBe(false);
      expect(machine.can('PAUSE')).toBe(false);

      machine.send('START');

      expect(machine.can('START')).toBe(false);
      expect(machine.can('STOP')).toBe(true);
      expect(machine.can('PAUSE')).toBe(true);
    });
  });

  describe('createMachine (with context)', () => {
    function createContextMachine() {
      return createMachine({
        initial: 'idle',
        context: { count: 0, log: '' },
        states: {
          idle: {
            on: {
              START: {
                target: 'running',
                action: (ctx) => { ctx.count = 0; },
              },
            },
          },
          running: {
            on: {
              INCREMENT: {
                target: 'running',
                action: (ctx) => { ctx.count++; },
              },
              STOP: 'idle',
            },
          },
        },
      });
    }

    it('provides typed context', () => {
      const machine = createContextMachine();

      expect(machine.context).toEqual({ count: 0, log: '' });
    });

    it('runs action on transition', () => {
      const machine = createContextMachine();

      machine.send('START');
      machine.send('INCREMENT');
      machine.send('INCREMENT');
      machine.send('INCREMENT');

      expect(machine.context.count).toBe(3);
    });

    it('resets context via action', () => {
      const machine = createContextMachine();

      machine.send('START');
      machine.send('INCREMENT');
      machine.send('INCREMENT');
      machine.send('STOP');
      machine.send('START');

      expect(machine.context.count).toBe(0);
    });
  });

  describe('guards', () => {
    function createGuardedMachine() {
      return createMachine({
        initial: 'idle',
        context: { retries: 0 },
        states: {
          idle: {
            on: {
              TRY: {
                target: 'attempting',
                action: (ctx) => { ctx.retries++; },
              },
            },
          },
          attempting: {
            on: {
              FAIL: {
                target: 'idle',
                guard: ctx => ctx.retries < 3,
              },
              SUCCESS: 'done',
            },
          },
          done: {},
        },
      });
    }

    it('allows transition when guard returns true', () => {
      const machine = createGuardedMachine();

      machine.send('TRY');
      machine.send('FAIL');

      expect(machine.current).toBe('idle');
      expect(machine.context.retries).toBe(1);
    });

    it('blocks transition when guard returns false', () => {
      const machine = createGuardedMachine();

      machine.send('TRY');
      machine.send('FAIL');
      machine.send('TRY');
      machine.send('FAIL');
      machine.send('TRY');
      machine.send('FAIL');

      expect(machine.current).toBe('attempting');
      expect(machine.context.retries).toBe(3);
    });

    it('reflects guard in can()', () => {
      const machine = createGuardedMachine();

      machine.send('TRY');
      expect(machine.can('FAIL')).toBe(true);

      machine.send('FAIL');
      machine.send('TRY');
      machine.send('FAIL');
      machine.send('TRY');

      expect(machine.can('FAIL')).toBe(false);
    });
  });

  describe('entry/exit hooks', () => {
    it('calls exit on previous state and entry on next state', () => {
      const exitIdle = vi.fn();
      const enterRunning = vi.fn();

      const machine = createMachine({
        initial: 'idle',
        states: {
          idle: {
            on: { START: 'running' },
            exit: exitIdle,
          },
          running: {
            on: { STOP: 'idle' },
            entry: enterRunning,
          },
        },
      });

      machine.send('START');

      expect(exitIdle).toHaveBeenCalledOnce();
      expect(enterRunning).toHaveBeenCalledOnce();
    });

    it('does not call hooks when transition is blocked by guard', () => {
      const exitHook = vi.fn();
      const entryHook = vi.fn();

      const machine = createMachine({
        initial: 'locked',
        context: { unlocked: false },
        states: {
          locked: {
            on: {
              UNLOCK: {
                target: 'unlocked',
                guard: ctx => ctx.unlocked,
              },
            },
            exit: exitHook,
          },
          unlocked: {
            entry: entryHook,
          },
        },
      });

      machine.send('UNLOCK');

      expect(exitHook).not.toHaveBeenCalled();
      expect(entryHook).not.toHaveBeenCalled();
      expect(machine.current).toBe('locked');
    });

    it('calls hooks with context', () => {
      const entryHook = vi.fn();

      const machine = createMachine({
        initial: 'idle',
        context: { value: 42 },
        states: {
          idle: {
            on: { GO: 'active' },
          },
          active: {
            entry: entryHook,
          },
        },
      });

      machine.send('GO');

      expect(entryHook).toHaveBeenCalledWith({ value: 42 });
    });

    it('calls exit and entry on self-transitions', () => {
      const exitHook = vi.fn();
      const entryHook = vi.fn();

      const machine = createMachine({
        initial: 'active',
        states: {
          active: {
            on: { REFRESH: 'active' },
            entry: entryHook,
            exit: exitHook,
          },
        },
      });

      machine.send('REFRESH');

      expect(exitHook).toHaveBeenCalledOnce();
      expect(entryHook).toHaveBeenCalledOnce();
    });
  });

  describe('StateMachine class', () => {
    it('can be instantiated directly', () => {
      const machine = new StateMachine<'on' | 'off', 'TOGGLE'>(
        'off',
        {
          off: { on: { TOGGLE: 'on' } },
          on: { on: { TOGGLE: 'off' } },
        },
        undefined,
      );

      expect(machine.current).toBe('off');

      machine.send('TOGGLE');

      expect(machine.current).toBe('on');

      machine.send('TOGGLE');

      expect(machine.current).toBe('off');
    });
  });

  describe('edge cases', () => {
    it('handles state with no transitions', () => {
      const machine = createMachine({
        initial: 'start',
        states: {
          start: {
            on: { GO: 'end' },
          },
          end: {},
        },
      });

      machine.send('GO');

      expect(machine.current).toBe('end');
      expect(machine.send('GO')).toBe('end');
    });

    it('handles action that modifies context before guard on next transition', () => {
      const machine = createMachine({
        initial: 'a',
        context: { step: 0 },
        states: {
          a: {
            on: {
              NEXT: {
                target: 'b',
                action: (ctx) => { ctx.step = 1; },
              },
            },
          },
          b: {
            on: {
              NEXT: {
                target: 'c',
                guard: ctx => ctx.step === 1,
                action: (ctx) => { ctx.step = 2; },
              },
            },
          },
          c: {},
        },
      });

      machine.send('NEXT');
      machine.send('NEXT');

      expect(machine.current).toBe('c');
      expect(machine.context.step).toBe(2);
    });
  });
});

describe('asyncStateMachine', () => {
  describe('createAsyncMachine (without context)', () => {
    it('handles simple string transitions', async () => {
      const machine = createAsyncMachine({
        initial: 'idle',
        states: {
          idle: { on: { START: 'running' } },
          running: { on: { STOP: 'idle' } },
        },
      });

      const result = await machine.send('START');

      expect(result).toBe('running');
      expect(machine.current).toBe('running');
    });

    it('ignores unhandled events', async () => {
      const machine = createAsyncMachine({
        initial: 'idle',
        states: {
          idle: { on: { START: 'running' } },
          running: {},
        },
      });

      const result = await machine.send('STOP');

      expect(result).toBe('idle');
    });
  });

  describe('async guards', () => {
    it('allows transition on async guard returning true', async () => {
      const machine = createAsyncMachine({
        initial: 'idle',
        context: { allowed: true },
        states: {
          idle: {
            on: {
              GO: {
                target: 'active',
                guard: async ctx => ctx.allowed,
              },
            },
          },
          active: {},
        },
      });

      await machine.send('GO');

      expect(machine.current).toBe('active');
    });

    it('blocks transition on async guard returning false', async () => {
      const machine = createAsyncMachine({
        initial: 'idle',
        context: { allowed: false },
        states: {
          idle: {
            on: {
              GO: {
                target: 'active',
                guard: async ctx => ctx.allowed,
              },
            },
          },
          active: {},
        },
      });

      await machine.send('GO');

      expect(machine.current).toBe('idle');
    });
  });

  describe('async actions', () => {
    it('awaits async action before entering target', async () => {
      const order: string[] = [];

      const machine = createAsyncMachine({
        initial: 'idle',
        context: { data: '' },
        states: {
          idle: {
            on: {
              FETCH: {
                target: 'done',
                action: async (ctx) => {
                  await new Promise(r => setTimeout(r, 10));
                  ctx.data = 'fetched';
                  order.push('action');
                },
              },
            },
          },
          done: {
            entry: () => { order.push('entry'); },
          },
        },
      });

      await machine.send('FETCH');

      expect(machine.context.data).toBe('fetched');
      expect(order).toEqual(['action', 'entry']);
    });
  });

  describe('async entry/exit hooks', () => {
    it('awaits async exit and entry hooks in order', async () => {
      const order: string[] = [];

      const machine = createAsyncMachine({
        initial: 'a',
        states: {
          a: {
            on: { GO: 'b' },
            exit: async () => {
              await new Promise(r => setTimeout(r, 10));
              order.push('exit-a');
            },
          },
          b: {
            entry: async () => {
              await new Promise(r => setTimeout(r, 10));
              order.push('entry-b');
            },
          },
        },
      });

      await machine.send('GO');

      expect(machine.current).toBe('b');
      expect(order).toEqual(['exit-a', 'entry-b']);
    });

    it('does not call hooks when async guard blocks', async () => {
      const exitHook = vi.fn();
      const entryHook = vi.fn();

      const machine = createAsyncMachine({
        initial: 'locked',
        context: { unlocked: false },
        states: {
          locked: {
            on: {
              UNLOCK: {
                target: 'unlocked',
                guard: async ctx => ctx.unlocked,
              },
            },
            exit: exitHook,
          },
          unlocked: {
            entry: entryHook,
          },
        },
      });

      await machine.send('UNLOCK');

      expect(exitHook).not.toHaveBeenCalled();
      expect(entryHook).not.toHaveBeenCalled();
      expect(machine.current).toBe('locked');
    });
  });

  describe('can()', () => {
    it('evaluates async guard', async () => {
      const machine = createAsyncMachine({
        initial: 'idle',
        context: { ready: true },
        states: {
          idle: {
            on: {
              GO: {
                target: 'active',
                guard: async ctx => ctx.ready,
              },
            },
          },
          active: {},
        },
      });

      expect(await machine.can('GO')).toBe(true);

      machine.context.ready = false;

      expect(await machine.can('GO')).toBe(false);
    });

    it('returns false for undefined events', async () => {
      const machine = createAsyncMachine({
        initial: 'idle',
        states: {
          idle: { on: { START: 'running' } },
          running: {},
        },
      });

      expect(await machine.can('STOP')).toBe(false);
    });

    it('returns true for transitions without guard', async () => {
      const machine = createAsyncMachine({
        initial: 'idle',
        states: {
          idle: { on: { START: 'running' } },
          running: {},
        },
      });

      expect(await machine.can('START')).toBe(true);
    });
  });

  describe('matches()', () => {
    it('checks current state synchronously', async () => {
      const machine = createAsyncMachine({
        initial: 'idle',
        states: {
          idle: { on: { GO: 'active' } },
          active: {},
        },
      });

      expect(machine.matches('idle')).toBe(true);

      await machine.send('GO');

      expect(machine.matches('active')).toBe(true);
      expect(machine.matches('idle')).toBe(false);
    });
  });

  describe('AsyncStateMachine class', () => {
    it('can be instantiated directly', async () => {
      const machine = new AsyncStateMachine<'on' | 'off', 'TOGGLE'>(
        'off',
        {
          off: { on: { TOGGLE: 'on' } },
          on: { on: { TOGGLE: 'off' } },
        },
        undefined,
      );

      expect(machine.current).toBe('off');

      await machine.send('TOGGLE');

      expect(machine.current).toBe('on');

      await machine.send('TOGGLE');

      expect(machine.current).toBe('off');
    });
  });

  describe('sync callbacks work too', () => {
    it('handles sync guard/action/hooks in async machine', async () => {
      const entryHook = vi.fn();

      const machine = createAsyncMachine({
        initial: 'idle',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              GO: {
                target: 'active',
                guard: ctx => ctx.count === 0,
                action: (ctx) => { ctx.count++; },
              },
            },
          },
          active: {
            entry: entryHook,
          },
        },
      });

      await machine.send('GO');

      expect(machine.current).toBe('active');
      expect(machine.context.count).toBe(1);
      expect(entryHook).toHaveBeenCalledOnce();
    });
  });
});
