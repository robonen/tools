export interface QueueLike<T> extends Iterable<T>, AsyncIterable<T> {
  readonly length: number;
  readonly isEmpty: boolean;
  readonly isFull: boolean;

  enqueue(element: T): this;
  dequeue(): T | undefined;
  peek(): T | undefined;
  clear(): this;
  toArray(): T[];
  toString(): string;
}
