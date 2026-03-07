export interface LinkedListNode<T> {
  value: T;
  prev: LinkedListNode<T> | undefined;
  next: LinkedListNode<T> | undefined;
}

export interface LinkedListLike<T> extends Iterable<T>, AsyncIterable<T> {
  readonly length: number;
  readonly isEmpty: boolean;

  readonly head: LinkedListNode<T> | undefined;
  readonly tail: LinkedListNode<T> | undefined;

  pushBack(value: T): LinkedListNode<T>;
  pushFront(value: T): LinkedListNode<T>;
  popBack(): T | undefined;
  popFront(): T | undefined;
  peekBack(): T | undefined;
  peekFront(): T | undefined;

  insertBefore(node: LinkedListNode<T>, value: T): LinkedListNode<T>;
  insertAfter(node: LinkedListNode<T>, value: T): LinkedListNode<T>;
  remove(node: LinkedListNode<T>): T;

  clear(): this;
  toArray(): T[];
  toString(): string;
}
