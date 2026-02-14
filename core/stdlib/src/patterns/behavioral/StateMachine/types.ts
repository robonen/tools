import type { MaybePromise } from '../../../types';

/**
 * Configuration for a state transition
 *
 * @template Context - Machine context type
 * @template Guard - Guard return type (boolean or MaybePromise\<boolean\>)
 * @template Action - Action return type (void or MaybePromise\<void\>)
 */
export interface TransitionConfig<
  Context,
  Guard = boolean,
  Action = void,
> {
  /** Target state to transition to */
  target: string;
  /** Guard condition — transition only occurs if this returns true */
  guard?: (context: Context) => Guard;
  /** Side effect executed during transition (before entering target state) */
  action?: (context: Context) => Action;
}

/**
 * A transition can be a target state name or a detailed configuration
 */
export type Transition<
  Context,
  Guard = boolean,
  Action = void,
> = string | TransitionConfig<Context, Guard, Action>;

/**
 * Configuration for a state node
 *
 * @template Context - Machine context type
 * @template Guard - Guard return type
 * @template Hook - Hook return type (entry/exit/action)
 */
export interface StateNodeConfig<
  Context,
  Guard = boolean,
  Hook = void,
> {
  /** Map of event names to transitions */
  on?: Record<string, Transition<Context, Guard, Hook>>;
  /** Hook called when entering this state */
  entry?: (context: Context) => Hook;
  /** Hook called when exiting this state */
  exit?: (context: Context) => Hook;
}

/** Sync state node config — guards return boolean, hooks return void */
export type SyncStateNodeConfig<Context> = StateNodeConfig<Context, boolean, void>;

/** Async state node config — guards return MaybePromise\<boolean\>, hooks return MaybePromise\<void\> */
export type AsyncStateNodeConfig<Context> = StateNodeConfig<Context, MaybePromise<boolean>, MaybePromise<void>>;

export type ExtractStates<T> = keyof T & string;

export type ExtractEvents<T> = {
  [K in keyof T]: T[K] extends { readonly on?: Readonly<Record<infer E extends string, any>> }
    ? E
    : never;
}[keyof T];
