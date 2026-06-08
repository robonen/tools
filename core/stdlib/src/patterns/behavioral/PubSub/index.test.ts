import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PubSub } from '.';

describe('pubsub', () => {
  const event3 = Symbol('event3');

  let eventBus: PubSub<{
    event1: (arg: string) => void;
    event2: () => void;
    [event3]: () => void;
  }>;

  beforeEach(() => {
    eventBus = new PubSub();
  });

  it('add a listener and emit an event', () => {
    const listener = vi.fn();

    eventBus.on('event1', listener);
    eventBus.emit('event1', 'Hello');

    expect(listener).toHaveBeenCalledWith('Hello');
  });

  it('add multiple listeners and emit an event', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    eventBus.on('event1', listener1);
    eventBus.on('event1', listener2);
    eventBus.emit('event1', 'Hello');

    expect(listener1).toHaveBeenCalledWith('Hello');
    expect(listener2).toHaveBeenCalledWith('Hello');
  });

  it('emit symbol event', () => {
    const listener = vi.fn();

    eventBus.on(event3, listener);
    eventBus.emit(event3);

    expect(listener).toHaveBeenCalled();
  });

  it('add a one-time listener and emit an event', () => {
    const listener = vi.fn();

    eventBus.once('event1', listener);
    eventBus.emit('event1', 'Hello');
    eventBus.emit('event1', 'World');

    expect(listener).toHaveBeenCalledWith('Hello');
    expect(listener).not.toHaveBeenCalledWith('World');
  });

  it('add once listener and emit multiple events', () => {
    const listener = vi.fn();

    eventBus.once('event1', listener);
    eventBus.emit('event1', 'Hello');
    eventBus.emit('event1', 'World');
    eventBus.emit('event1', '!');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('Hello');
  });

  it('remove a listener', () => {
    const listener = vi.fn();

    eventBus.on('event1', listener);
    eventBus.off('event1', listener);
    eventBus.emit('event1', 'Hello');

    expect(listener).not.toHaveBeenCalled();
  });

  it('clear all listeners for an event', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    eventBus.on('event1', listener1);
    eventBus.on('event1', listener2);
    eventBus.clear('event1');
    eventBus.emit('event1', 'Hello');

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();
  });

  it('return true when emitting an event with listeners', () => {
    const listener = vi.fn();

    eventBus.on('event1', listener);
    const result = eventBus.emit('event1', 'Hello');

    expect(result).toBe(true);
  });

  it('return false when emitting an event without listeners', () => {
    const result = eventBus.emit('event1', 'Hello');

    expect(result).toBe(false);
  });

  it('calls listener only once when the same function is registered multiple times', () => {
    const listener = vi.fn();

    eventBus.on('event1', listener);
    eventBus.on('event1', listener);
    eventBus.on('event1', listener);
    eventBus.emit('event1', 'Hello');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  describe('off edge cases', () => {
    it('removes only the targeted listener of many', () => {
      const a = vi.fn();
      const b = vi.fn();
      eventBus.on('event1', a);
      eventBus.on('event1', b);

      eventBus.off('event1', a);
      eventBus.emit('event1', 'x');

      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when removing an unregistered listener or unknown event', () => {
      const a = vi.fn();
      eventBus.on('event1', a);

      expect(() => eventBus.off('event1', vi.fn())).not.toThrow();
      expect(() => eventBus.off('event2', vi.fn())).not.toThrow();

      eventBus.emit('event1', 'x');
      expect(a).toHaveBeenCalledTimes(1);
    });
  });

  describe('emit stability', () => {
    it('does not invoke listeners added during the same emit', () => {
      const added = vi.fn();
      const adder = vi.fn(() => eventBus.on('event1', added));
      eventBus.on('event1', adder);

      eventBus.emit('event1', 'x');

      expect(adder).toHaveBeenCalledTimes(1);
      expect(added).not.toHaveBeenCalled(); // only fires on the next emit
    });

    it('a once listener removes itself and fires exactly once', () => {
      const listener = vi.fn();
      eventBus.once('event1', listener);

      eventBus.emit('event1', 'a');
      eventBus.emit('event1', 'b');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('a');
    });
  });
});
