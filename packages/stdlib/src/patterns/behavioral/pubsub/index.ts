export type Subscriber = (...args: any[]) => void;
export type EventsRecord = Record<string, Subscriber>;

export class PubSub<Events extends EventsRecord> {
  private events: Map<keyof Events, Set<Events[keyof Events]>>;

  constructor() {
    this.events = new Map();
  }

  public on<K extends keyof Events>(event: K, listener: Events[K]) {
    const listeners = this.events.get(event);

    if (listeners)
      listeners.add(listener);
    else
      this.events.set(event, new Set([listener]));

    return this;
  }

  public off<K extends keyof Events>(event: K, listener: Events[K]) {
    const listeners = this.events.get(event);

    if (listeners)
      listeners.delete(listener);

    return this;
  }

  public once<K extends keyof Events>(event: K, listener: Events[K]) {
    const onceListener = (...args: Parameters<Events[K]>) => {
        this.off(event, onceListener as Events[K]);
        listener(...args);
    };

    this.on(event, onceListener as Events[K]);

    return this;
  }

  public emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): boolean {
    const listeners = this.events.get(event);

    if (!listeners)
      return false;

    listeners.forEach((listener) => listener(...args));

    return true;
  }

  public clear<K extends keyof Events>(event: K) {
    this.events.delete(event);

    return this;
  }
}
