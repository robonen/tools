import { Deque } from '../Deque';
import type { QueueLike } from './types';

export type { QueueLike } from './types';

export interface QueueOptions {
  maxSize?: number;
}

/**
 * @name Queue
 * @category Data Structures
 * @description Represents a queue data structure (FIFO) backed by a Deque
 *
 * @since 0.0.8
 *
 * @template T The type of elements stored in the queue
 */
export class Queue<T> implements QueueLike<T> {
  /**
   * The underlying deque
   *
   * @private
   * @type {Deque<T>}
   */
  private readonly deque: Deque<T>;

  /**
   * Creates an instance of Queue
   *
   * @param {(T[] | T)} [initialValues] The initial values to add to the queue
   * @param {QueueOptions} [options] The options for the queue
   */
  constructor(initialValues?: T[] | T, options?: QueueOptions) {
    this.deque = new Deque(initialValues, options);
  }

  /**
   * Gets the number of elements in the queue
   * @returns {number} The number of elements in the queue
   */
  get length() {
    return this.deque.length;
  }

  /**
   * Checks if the queue is empty
   * @returns {boolean} `true` if the queue is empty, `false` otherwise
   */
  get isEmpty() {
    return this.deque.isEmpty;
  }

  /**
   * Checks if the queue is full
   * @returns {boolean} `true` if the queue is full, `false` otherwise
   */
  get isFull() {
    return this.deque.isFull;
  }

  /**
   * Adds an element to the back of the queue
   * @param {T} element The element to enqueue
   * @returns {this}
   * @throws {RangeError} If the queue is full
   */
  enqueue(element: T) {
    if (this.deque.isFull)
      throw new RangeError('Queue is full');

    this.deque.pushBack(element);

    return this;
  }

  /**
   * Removes and returns the front element of the queue
   * @returns {T | undefined} The front element, or undefined if the queue is empty
   */
  dequeue() {
    return this.deque.popFront();
  }

  /**
   * Returns the front element without removing it
   * @returns {T | undefined} The front element, or undefined if the queue is empty
   */
  peek() {
    return this.deque.peekFront();
  }

  /**
   * Clears the queue
   *
   * @returns {this}
   */
  clear() {
    this.deque.clear();

    return this;
  }

  /**
   * Converts the queue to an array in FIFO order
   *
   * @returns {T[]}
   */
  toArray() {
    return this.deque.toArray();
  }

  /**
   * Returns a string representation of the queue
   *
   * @returns {string}
   */
  toString() {
    return this.deque.toString();
  }

  /**
   * Returns an iterator for the queue
   *
   * @returns {IterableIterator<T>}
   */
  [Symbol.iterator]() {
    return this.deque[Symbol.iterator]();
  }

  /**
   * Returns an async iterator for the queue
   *
   * @returns {AsyncIterableIterator<T>}
   */
  async *[Symbol.asyncIterator]() {
    for (const element of this.deque)
      yield element;
  }
}
