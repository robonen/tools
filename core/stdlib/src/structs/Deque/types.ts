export interface DequeLike<T> extends Iterable<T>, AsyncIterable<T> {
  readonly length: number;
  readonly isEmpty: boolean;
  readonly isFull: boolean;

  pushBack(element: T): this;
  pushFront(element: T): this;
  popBack(): T | undefined;
  popFront(): T | undefined;
  peekBack(): T | undefined;
  peekFront(): T | undefined;
  clear(): this;
  toArray(): T[];
  toString(): string;
}
