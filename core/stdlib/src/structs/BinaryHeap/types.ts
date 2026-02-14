export type Comparator<T> = (a: T, b: T) => number;

export interface BinaryHeapLike<T> extends Iterable<T>, AsyncIterable<T> {
  readonly length: number;
  readonly isEmpty: boolean;

  push(element: T): void;
  pop(): T | undefined;
  peek(): T | undefined;
  clear(): this;
  toArray(): T[];
  toString(): string;
}
