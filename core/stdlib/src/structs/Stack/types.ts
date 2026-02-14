export interface StackLike<T> extends Iterable<T>, AsyncIterable<T> {
  readonly length: number;
  readonly isEmpty: boolean;
  readonly isFull: boolean;

  push(element: T): this;
  pop(): T | undefined;
  peek(): T | undefined;
  clear(): this;
  toArray(): T[];
  toString(): string;
}
