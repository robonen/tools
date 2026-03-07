import { isString } from '../../../types';
import { BaseStateMachine } from './base';
import type { SyncStateNodeConfig, ExtractStates, ExtractEvents } from './types';

/**
 * @name StateMachine
 * @category Patterns
 * @description Simple, performant, and type-safe finite state machine
 *
 * @since 0.0.8
 *
 * @template States - Union of state names
 * @template Events - Union of event names
 * @template Context - Machine context type
 */
export class StateMachine<
  States extends string = string,
  Events extends string = string,
  Context = undefined,
> extends BaseStateMachine<States, Events, Context, SyncStateNodeConfig<Context>> {
  /**
   * Send an event to the machine, potentially causing a state transition
   *
   * @param event - Event name
   * @returns The current state after processing the event
   */
  send(event: Events): States {
    const stateNode = this.states[this.currentState];

    if (!stateNode?.on)
      return this.currentState;

    const transition = stateNode.on[event];

    if (transition === undefined)
      return this.currentState;

    let target: string;

    if (isString(transition)) {
      target = transition;
    }
    else {
      if (transition.guard && !transition.guard(this.context))
        return this.currentState;

      transition.action?.(this.context);
      target = transition.target;
    }

    stateNode.exit?.(this.context);
    this.currentState = target as States;
    this.states[this.currentState]?.entry?.(this.context);

    return this.currentState;
  }

  /**
   * Check if an event can trigger a transition from the current state
   *
   * @param event - Event to check
   */
  can(event: Events): boolean {
    const stateNode = this.states[this.currentState];

    if (!stateNode?.on)
      return false;

    const transition = stateNode.on[event];

    if (transition === undefined)
      return false;

    if (!isString(transition) && transition.guard)
      return transition.guard(this.context);

    return true;
  }
}

/**
 * Create a type-safe synchronous finite state machine with context
 *
 * @example
 * ```ts
 * const machine = createMachine({
 *   initial: 'idle',
 *   context: { retries: 0 },
 *   states: {
 *     idle: {
 *       on: { START: 'running' },
 *     },
 *     running: {
 *       on: {
 *         FAIL: {
 *           target: 'idle',
 *           guard: (ctx) => ctx.retries < 3,
 *           action: (ctx) => { ctx.retries++; },
 *         },
 *         STOP: 'idle',
 *       },
 *     },
 *   },
 * });
 *
 * machine.send('START'); // 'running'
 * ```
 */
export function createMachine<
  const States extends Record<string, SyncStateNodeConfig<Context>>,
  Context,
>(config: {
  initial: NoInfer<ExtractStates<States>>;
  context: Context;
  states: States;
}): StateMachine<ExtractStates<States>, ExtractEvents<States>, Context>;

export function createMachine<
  const States extends Record<string, SyncStateNodeConfig<undefined>>,
>(config: {
  initial: NoInfer<ExtractStates<States>>;
  states: States;
}): StateMachine<ExtractStates<States>, ExtractEvents<States>, undefined>;

export function createMachine(config: {
  initial: string;
  context?: unknown;
  states: Record<string, SyncStateNodeConfig<any>>;
}): StateMachine {
  return new StateMachine(
    config.initial,
    config.states,
    config.context as undefined,
  );
}
