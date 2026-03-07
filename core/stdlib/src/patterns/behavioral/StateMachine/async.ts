import { isString } from '../../../types';
import { BaseStateMachine } from './base';
import type { AsyncStateNodeConfig, ExtractStates, ExtractEvents } from './types';

/**
 * @name AsyncStateMachine
 * @category Patterns
 * @description Async finite state machine with support for async guards, actions, and hooks
 *
 * @since 0.0.8
 *
 * @template States - Union of state names
 * @template Events - Union of event names
 * @template Context - Machine context type
 */
export class AsyncStateMachine<
  States extends string = string,
  Events extends string = string,
  Context = undefined,
> extends BaseStateMachine<States, Events, Context, AsyncStateNodeConfig<Context>> {
  /**
   * Send an event to the machine, awaiting async guards, actions, and hooks
   *
   * @param event - Event name
   * @returns The current state after processing the event
   */
  async send(event: Events): Promise<States> {
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
      if (transition.guard && !(await transition.guard(this.context)))
        return this.currentState;

      await transition.action?.(this.context);
      target = transition.target;
    }

    await stateNode.exit?.(this.context);
    this.currentState = target as States;
    await this.states[this.currentState]?.entry?.(this.context);

    return this.currentState;
  }

  /**
   * Check if an event can trigger a transition, awaiting async guards
   *
   * @param event - Event to check
   */
  async can(event: Events): Promise<boolean> {
    const stateNode = this.states[this.currentState];

    if (!stateNode?.on)
      return false;

    const transition = stateNode.on[event];

    if (transition === undefined)
      return false;

    if (!isString(transition) && transition.guard)
      return await transition.guard(this.context);

    return true;
  }
}

/**
 * Create a type-safe async finite state machine with context
 *
 * @example
 * ```ts
 * const machine = createAsyncMachine({
 *   initial: 'idle',
 *   context: { data: '' },
 *   states: {
 *     idle: {
 *       on: {
 *         FETCH: {
 *           target: 'loaded',
 *           guard: async () => await hasPermission(),
 *           action: async (ctx) => { ctx.data = await fetchData(); },
 *         },
 *       },
 *     },
 *     loaded: {
 *       entry: async (ctx) => { await saveToCache(ctx.data); },
 *     },
 *   },
 * });
 *
 * await machine.send('FETCH'); // 'loaded'
 * ```
 */
export function createAsyncMachine<
  const States extends Record<string, AsyncStateNodeConfig<Context>>,
  Context,
>(config: {
  initial: NoInfer<ExtractStates<States>>;
  context: Context;
  states: States;
}): AsyncStateMachine<ExtractStates<States>, ExtractEvents<States>, Context>;

export function createAsyncMachine<
  const States extends Record<string, AsyncStateNodeConfig<undefined>>,
>(config: {
  initial: NoInfer<ExtractStates<States>>;
  states: States;
}): AsyncStateMachine<ExtractStates<States>, ExtractEvents<States>, undefined>;

export function createAsyncMachine(config: {
  initial: string;
  context?: unknown;
  states: Record<string, AsyncStateNodeConfig<any>>;
}): AsyncStateMachine {
  return new AsyncStateMachine(
    config.initial,
    config.states,
    config.context as undefined,
  );
}
