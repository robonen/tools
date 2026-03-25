/**
 * Base class for state machines — holds shared state, getters, and matches()
 *
 * @template States - Union of state names
 * @template Events - Union of event names
 * @template Context - Machine context type
 * @template NodeConfig - State node configuration type
 */
export class BaseStateMachine<
  States extends string,
  _Events extends string,
  Context,
  NodeConfig,
> {
  protected currentState: States;
  protected readonly states: Record<string, NodeConfig>;

  /** Machine context */
  readonly context: Context;

  constructor(
    initial: States,
    states: Record<string, NodeConfig>,
    context: Context,
  ) {
    this.currentState = initial;
    this.context = context;
    this.states = states;
  }

  /** Current state of the machine */
  get current(): States {
    return this.currentState;
  }

  /**
   * Check if the machine is in a specific state
   *
   * @param state - State to check
   */
  matches(state: States): boolean {
    return this.currentState === state;
  }
}
