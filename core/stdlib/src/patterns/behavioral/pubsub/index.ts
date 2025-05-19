import type { AnyFunction } from '../../../types';

export type Subscriber = AnyFunction;

export type EventHandlerMap = Record<PropertyKey, Subscriber>;

/**
 * @name PubSub
 * @category Patterns
 * @description Simple PubSub implementation
 *
 * @since 0.0.2
 * 
 * @template Events - Event map where all values are function types
 */
export class PubSub<Events extends EventHandlerMap> {
  /**
   * Events map
   * 
   * @private
   * @type {Map<keyof Events, Set<Events[keyof Events]>>}
   */
  private events: Map<keyof Events, Set<Events[keyof Events]>>;

  /**
   * Creates an instance of PubSub
   */
  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to an event
   * 
   * @template {keyof Events} K
   * @param {K} event Name of the event
   * @param {Events[K]} listener Listener function
   * @returns {this}
   */
  public on<K extends keyof Events>(event: K, listener: Events[K]) {
    const listeners = this.events.get(event);

    if (listeners)
      listeners.add(listener);
    else
      this.events.set(event, new Set([listener]));

    return this;
  }

  /**
   * Unsubscribe from an event
   * 
   * @template {keyof Events} K
   * @param {K} event Name of the event
   * @param {Events[K]} listener Listener function
   * @returns {this}
   */
  public off<K extends keyof Events>(event: K, listener: Events[K]) {
    const listeners = this.events.get(event);

    if (listeners)
      listeners.delete(listener);

    return this;
  }

  /**
   * Subscribe to an event only once
   * 
   * @template {keyof Events} K
   * @param {K} event Name of the event
   * @param {Events[K]} listener Listener function
   * @returns {this}
   */
  public once<K extends keyof Events>(event: K, listener: Events[K]) {
    const onceListener = (...args: Parameters<Events[K]>) => {
        this.off(event, onceListener as Events[K]);
        listener(...args);
    };

    this.on(event, onceListener as Events[K]);

    return this;
  }

  /**
   * Emit an event
   * 
   * @template {keyof Events} K
   * @param {K} event Name of the event
   * @param {...Parameters<Events[K]>} args Arguments for the listener
   * @returns {boolean}
   */
  public emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) {
    const listeners = this.events.get(event);

    if (!listeners)
      return false;

    listeners.forEach((listener) => listener(...args));

    return true;
  }

  /**
   * Clear all listeners for an event
   * 
   * @template {keyof Events} K
   * @param {K} event Name of the event
   * @returns {this}
   */
  public clear<K extends keyof Events>(event: K) {
    this.events.delete(event);

    return this;
  }
}
