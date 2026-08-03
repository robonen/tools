import { shallowRef } from 'vue';
import { StateMachine } from '@robonen/stdlib';
import type { ExtractEvents, ExtractStates, SyncStateNodeConfig } from '@robonen/stdlib';
import type { ShallowRef } from 'vue';

export interface UseStateMachineReturn<
  States extends string,
  Events extends string,
  Context,
> {
  /** Reactive current state of the machine. */
  state: Readonly<ShallowRef<States>>;

  /**
   * Send an event to the machine, potentially causing a transition.
   * Returns the state the machine settled on (entry/exit hooks may themselves
   * send events; the returned state is the final one).
   */
  send: (event: Events) => States;

  /** Reactive check: is the machine currently in `state`? */
  matches: (state: States) => boolean;

  /** Reactive check: can `event` cause a transition from the current state? */
  can: (event: Events) => boolean;

  /** The underlying stdlib machine (context access, non-reactive escape hatch). */
  machine: StateMachine<States, Events, Context>;
}

/**
 * @name useStateMachine
 * @category State
 * @description Reactive wrapper around the stdlib `StateMachine`: a type-safe
 * finite state machine whose current state is exposed as a shallow ref, so
 * templates and computeds can branch on `state`/`matches`/`can`.
 *
 * States, events, guards, and entry/exit hooks follow the stdlib
 * `createMachine` config verbatim — this composable only adds reactivity.
 *
 * @param {object} config Machine config: `initial`, optional `context`, and `states`
 * @returns {UseStateMachineReturn} Reactive state plus `send`/`matches`/`can` and the raw machine
 *
 * @example
 * const { state, send, can } = useStateMachine({
 *   initial: 'idle',
 *   states: {
 *     idle: { on: { FETCH: 'loading' } },
 *     loading: { on: { RESOLVE: 'idle', REJECT: 'failed' } },
 *     failed: { on: { RETRY: 'loading' } },
 *   },
 * });
 *
 * send('FETCH'); // state.value === 'loading'
 * can('RETRY'); // false — reactive, usable in computeds/templates
 *
 * @since 0.2.0
 */
export function useStateMachine<
  const States extends Record<string, SyncStateNodeConfig<Context>>,
  Context,
>(config: {
  initial: NoInfer<ExtractStates<States>>;
  context: Context;
  states: States;
}): UseStateMachineReturn<ExtractStates<States>, ExtractEvents<States>, Context>;

export function useStateMachine<
  const States extends Record<string, SyncStateNodeConfig<undefined>>,
>(config: {
  initial: NoInfer<ExtractStates<States>>;
  states: States;
}): UseStateMachineReturn<ExtractStates<States>, ExtractEvents<States>, undefined>;

export function useStateMachine(config: {
  initial: string;
  context?: unknown;
  // Overload-implementation signature (mirrors stdlib `createMachine`): `any`
  // accepts every concrete `SyncStateNodeConfig<C>` — contravariant in `C` —
  // and `Context = undefined` keeps the invariant `StateMachine<..., Context>`
  // comparable with both public overloads.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  states: Record<string, SyncStateNodeConfig<any>>;
}): UseStateMachineReturn<string, string, undefined> {
  const machine = new StateMachine(config.initial, config.states, config.context as undefined);

  const state = shallowRef(machine.current);

  // Bumped on EVERY send: a self-transition leaves the state string unchanged
  // (so `state` doesn't trigger) yet its action may mutate the context that
  // `can()` guards read.
  const epoch = shallowRef(0);

  function send(event: string): string {
    // Mirror the settled state (not send's return value — entry/exit hooks may
    // send follow-up events) even when a hook throws: the machine has already
    // advanced by the time hooks run.
    try {
      machine.send(event);
    }
    finally {
      state.value = machine.current;
      epoch.value++;
    }

    return machine.current;
  }

  function matches(value: string): boolean {
    return state.value === value;
  }

  function can(event: string): boolean {
    // Track the send epoch (it covers state changes too) so callers re-evaluate
    // after every transition, including context-mutating self-transitions.
    void epoch.value;

    return machine.can(event);
  }

  return { state, send, matches, can, machine };
}
