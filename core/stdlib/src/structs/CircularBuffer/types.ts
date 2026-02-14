export interface CircularBufferLike<T> extends Iterable<T>, AsyncIterable<T> {
  readonly length: number;
  readonly capacity: number;
  readonly isEmpty: boolean;
  readonly isFull: boolean;

  pushBack(element: T): void;
  pushFront(element: T): void;
  popBack(): T | undefined;
  popFront(): T | undefined;
  peekBack(): T | undefined;
  peekFront(): T | undefined;
  get(index: number): T | undefined;
  clear(): this;
  toArray(): T[];
  toString(): string;
}
