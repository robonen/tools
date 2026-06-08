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
});
