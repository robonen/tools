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
  Events extends string,
  Context,
  NodeConfig,
> {
  protected _current: States;
  protected _context: Context;
  protected _states: Record<string, NodeConfig>;

  constructor(
    initial: States,
    states: Record<string, NodeConfig>,
    context: Context,
  ) {
    this._current = initial;
    this._context = context;
    this._states = states;
  }

  /** Current state of the machine */
  get current(): States {
    return this._current;
  }

  /** Machine context */
  get context(): Context {
    return this._context;
  }

  /**
   * Check if the machine is in a specific state
   *
   * @param state - State to check
   */
  matches(state: States): boolean {
    return this._current === state;
  }
}
