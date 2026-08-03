import { describe, expectTypeOf, it } from 'vitest';
import { createMachine } from '.';

describe('createMachine', () => {
  const machine = createMachine({
    initial: 'idle',
    states: {
      idle: { on: { START: 'running' } },
      running: { on: { STOP: 'idle' } },
    },
  });

  it('infers the state union from the states config', () => {
    expectTypeOf(machine.current).toEqualTypeOf<'idle' | 'running'>();
  });

  it('infers the event union accepted by send', () => {
    expectTypeOf(machine.send).parameter(0).toEqualTypeOf<'START' | 'STOP'>();
  });

  it('send returns the (typed) resulting state', () => {
    expectTypeOf(machine.send('START')).toEqualTypeOf<'idle' | 'running'>();
  });

  it('empty terminal nodes do not widen the event union to string', () => {
    const terminal = createMachine({
      initial: 'idle',
      states: {
        idle: { on: { START: 'done' } },
        done: {},
      },
    });

    expectTypeOf(terminal.send).parameter(0).toEqualTypeOf<'START'>();
  });

  it('entry/exit-only nodes do not widen the event union either', () => {
    const hooked = createMachine({
      initial: 'idle',
      states: {
        idle: { on: { START: 'done' } },
        done: { entry: () => {} },
      },
    });

    expectTypeOf(hooked.send).parameter(0).toEqualTypeOf<'START'>();
  });
});
