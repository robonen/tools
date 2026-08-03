import { describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';
import { useStateMachine } from './index';

function trafficLight() {
  return useStateMachine({
    initial: 'red',
    states: {
      red: { on: { NEXT: 'green' } },
      green: { on: { NEXT: 'yellow' } },
      yellow: { on: { NEXT: 'red' } },
    },
  });
}

describe(useStateMachine, () => {
  it('starts in the initial state', () => {
    const { state, matches } = trafficLight();

    expect(state.value).toBe('red');
    expect(matches('red')).toBeTruthy();
    expect(matches('green')).toBeFalsy();
  });

  it('transitions on send and mirrors the state into the ref', () => {
    const { state, send } = trafficLight();

    expect(send('NEXT')).toBe('green');
    expect(state.value).toBe('green');

    send('NEXT');
    expect(state.value).toBe('yellow');
  });

  it('ignores events without a matching transition', () => {
    const { state, send } = useStateMachine({
      initial: 'idle',
      states: {
        idle: { on: { START: 'running' } },
        running: {},
      },
    });

    send('START');
    expect(send('START')).toBe('running');
    expect(state.value).toBe('running');
  });

  it('is reactive: computeds tracking state/matches/can re-evaluate', () => {
    const { send, matches, can, state } = trafficLight();

    const isRed = computed(() => matches('red'));
    const label = computed(() => state.value.toUpperCase());
    const canAdvance = computed(() => can('NEXT'));

    expect(isRed.value).toBeTruthy();
    expect(label.value).toBe('RED');
    expect(canAdvance.value).toBeTruthy();

    send('NEXT');

    expect(isRed.value).toBeFalsy();
    expect(label.value).toBe('GREEN');
  });

  it('respects guards and exposes them through can()', () => {
    const { state, send, can } = useStateMachine({
      initial: 'locked',
      context: { coins: 0 },
      states: {
        locked: {
          on: {
            PUSH: { target: 'open', guard: ctx => ctx.coins > 0 },
            COIN: { target: 'locked', action: (ctx) => { ctx.coins++; } },
          },
        },
        open: {},
      },
    });

    expect(can('PUSH')).toBeFalsy();
    send('PUSH');
    expect(state.value).toBe('locked');

    send('COIN');
    expect(can('PUSH')).toBeTruthy();
    send('PUSH');
    expect(state.value).toBe('open');
  });

  it('runs action, exit, and entry hooks in order', () => {
    const order: string[] = [];

    const { send } = useStateMachine({
      initial: 'a',
      states: {
        a: {
          exit: () => order.push('exit:a'),
          on: { GO: { target: 'b', action: () => order.push('action') } },
        },
        b: {
          entry: () => order.push('entry:b'),
        },
      },
    });

    send('GO');
    expect(order).toEqual(['action', 'exit:a', 'entry:b']);
  });

  it('settles on the final state when hooks send follow-up events', () => {
    const machine = useStateMachine({
      initial: 'idle',
      states: {
        idle: { on: { START: 'transient' } },
        transient: {
          entry: () => machine.send('CONTINUE'),
          on: { CONTINUE: 'done' },
        },
        done: {},
      },
    });

    expect(machine.send('START')).toBe('done');
    expect(machine.state.value).toBe('done');
  });

  it('keeps can() reactive across context-mutating self-transitions', () => {
    const { send, can } = useStateMachine({
      initial: 'locked',
      context: { coins: 0 },
      states: {
        locked: {
          on: {
            PUSH: { target: 'open', guard: ctx => ctx.coins > 0 },
            COIN: { target: 'locked', action: (ctx) => { ctx.coins++; } },
          },
        },
        open: {},
      },
    });

    const canPush = computed(() => can('PUSH'));

    expect(canPush.value).toBeFalsy();

    // Self-transition: the state string does not change, only the context.
    send('COIN');

    expect(canPush.value).toBeTruthy();
  });

  it('keeps the state ref in sync when a hook throws', () => {
    const { state, send } = useStateMachine({
      initial: 'a',
      states: {
        a: { on: { GO: 'b' } },
        b: { entry: () => { throw new Error('boom'); } },
      },
    });

    expect(() => send('GO')).toThrow('boom');
    expect(state.value).toBe('b');
  });

  it('exposes the raw machine with its context', () => {
    const onEnter = vi.fn();
    const { machine, send } = useStateMachine({
      initial: 'off',
      context: { toggles: 0 },
      states: {
        off: { on: { TOGGLE: { target: 'on', action: (ctx) => { ctx.toggles++; } } } },
        on: { entry: onEnter },
      },
    });

    send('TOGGLE');

    expect(machine.context.toggles).toBe(1);
    expect(machine.current).toBe('on');
    expect(machine.matches('on')).toBeTruthy();
    expect(onEnter).toHaveBeenCalledTimes(1);
  });
});
