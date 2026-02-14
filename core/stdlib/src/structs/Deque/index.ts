import { CircularBuffer } from '../CircularBuffer';
import type { DequeLike } from './types';

export type { DequeLike } from './types';

export interface DequeOptions {
  maxSize?: number;
}

/**
 * @name Deque
 * @category Data Structures
 * @description Represents a double-ended queue backed by a circular buffer
 *
 * @since 0.0.8
 *
 * @template T The type of elements stored in the deque
 */
export class Deque<T> implements DequeLike<T> {
  /**
   * The maximum number of elements that the deque can hold
   *
   * @private
   * @type {number}
   */
  private readonly maxSize: number;

  /**
   * The underlying circular buffer
   *
   * @private
   * @type {CircularBuffer<T>}
   */
  private readonly buffer: CircularBuffer<T>;

  /**
   * Creates an instance of Deque
   *
   * @param {(T[] | T)} [initialValues] The initial values to add to the deque
   * @param {DequeOptions} [options] The options for the deque
   */
  constructor(initialValues?: T[] | T, options?: DequeOptions) {
    this.maxSize = options?.maxSize ?? Infinity;
    this.buffer = new CircularBuffer(initialValues);
  }

  /**
   * Gets the number of elements in the deque
   * @returns {number} The number of elements in the deque
   */
  get length() {
    return this.buffer.length;
  }

  /**
   * Checks if the deque is empty
   * @returns {boolean} `true` if the deque is empty, `false` otherwise
   */
  get isEmpty() {
    return this.buffer.isEmpty;
  }

  /**
   * Checks if the deque is full
   * @returns {boolean} `true` if the deque is full, `false` otherwise
   */
  get isFull() {
    return this.buffer.length === this.maxSize;
  }

  /**
   * Adds an element to the back of the deque
   * @param {T} element The element to add
   * @returns {this}
   * @throws {RangeError} If the deque is full
   */
  pushBack(element: T) {
    if (this.isFull)
      throw new RangeError('Deque is full');

    this.buffer.pushBack(element);

    return this;
  }

  /**
   * Adds an element to the front of the deque
   * @param {T} element The element to add
   * @returns {this}
   * @throws {RangeError} If the deque is full
   */
  pushFront(element: T) {
    if (this.isFull)
      throw new RangeError('Deque is full');

    this.buffer.pushFront(element);

    return this;
  }

  /**
   * Removes and returns the back element of the deque
   * @returns {T | undefined} The back element, or undefined if empty
   */
  popBack() {
    return this.buffer.popBack();
  }

  /**
   * Removes and returns the front element of the deque
   * @returns {T | undefined} The front element, or undefined if empty
   */
  popFront() {
    return this.buffer.popFront();
  }

  /**
   * Returns the back element without removing it
   * @returns {T | undefined} The back element, or undefined if empty
   */
  peekBack() {
    return this.buffer.peekBack();
  }

  /**
   * Returns the front element without removing it
   * @returns {T | undefined} The front element, or undefined if empty
   */
  peekFront() {
    return this.buffer.peekFront();
  }

  /**
   * Clears the deque
   *
   * @returns {this}
   */
  clear() {
    this.buffer.clear();

    return this;
  }

  /**
   * Converts the deque to an array from front to back
   *
   * @returns {T[]}
   */
  toArray() {
    return this.buffer.toArray();
  }

  /**
   * Returns a string representation of the deque
   *
   * @returns {string}
   */
  toString() {
    return this.buffer.toString();
  }

  /**
   * Returns an iterator for the deque (front to back)
   *
   * @returns {IterableIterator<T>}
   */
  [Symbol.iterator]() {
    return this.buffer[Symbol.iterator]();
  }

  /**
   * Returns an async iterator for the deque (front to back)
   *
   * @returns {AsyncIterableIterator<T>}
   */
  async *[Symbol.asyncIterator]() {
    for (const element of this.buffer)
      yield element;
  }
}
