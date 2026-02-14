import { isArray } from '../../types';
import type { CircularBufferLike } from './types';

export type { CircularBufferLike } from './types';

const MIN_CAPACITY = 4;

/**
 * @name CircularBuffer
 * @category Data Structures
 * @description A circular (ring) buffer with automatic growth, O(1) push/pop on both ends
 *
 * @since 0.0.8
 *
 * @template T The type of elements stored in the buffer
 */
export class CircularBuffer<T> implements CircularBufferLike<T> {
  /**
   * The internal storage
   *
   * @private
   * @type {(T | undefined)[]}
   */
  private buffer: (T | undefined)[];

  /**
   * The index of the front element
   *
   * @private
   * @type {number}
   */
  private head: number;

  /**
   * The number of elements in the buffer
   *
   * @private
   * @type {number}
   */
  private count: number;

  /**
   * Creates an instance of CircularBuffer
   *
   * @param {(T[] | T)} [initialValues] The initial values to add to the buffer
   * @param {number} [initialCapacity] The initial capacity hint (rounded up to next power of two)
   */
  constructor(initialValues?: T[] | T, initialCapacity?: number) {
    this.head = 0;
    this.count = 0;

    const items = isArray(initialValues) ? initialValues : initialValues !== undefined ? [initialValues] : [];
    const requested = Math.max(items.length, initialCapacity ?? 0);
    const cap = Math.max(MIN_CAPACITY, nextPowerOfTwo(requested));

    this.buffer = new Array(cap);

    for (const item of items)
      this.pushBack(item);
  }

  /**
   * Gets the number of elements in the buffer
   * @returns {number}
   */
  get length() {
    return this.count;
  }

  /**
   * Gets the current capacity of the buffer
   * @returns {number}
   */
  get capacity() {
    return this.buffer.length;
  }

  /**
   * Checks if the buffer is empty
   * @returns {boolean}
   */
  get isEmpty() {
    return this.count === 0;
  }

  /**
   * Checks if the buffer is at capacity (before auto-grow)
   * @returns {boolean}
   */
  get isFull() {
    return this.count === this.buffer.length;
  }

  /**
   * Adds an element to the back of the buffer
   * @param {T} element The element to add
   */
  pushBack(element: T) {
    if (this.count === this.buffer.length)
      this.grow();

    this.buffer[(this.head + this.count) & (this.buffer.length - 1)] = element;
    this.count++;
  }

  /**
   * Adds an element to the front of the buffer
   * @param {T} element The element to add
   */
  pushFront(element: T) {
    if (this.count === this.buffer.length)
      this.grow();

    this.head = (this.head - 1 + this.buffer.length) & (this.buffer.length - 1);
    this.buffer[this.head] = element;
    this.count++;
  }

  /**
   * Removes and returns the back element
   * @returns {T | undefined} The back element, or undefined if empty
   */
  popBack() {
    if (this.isEmpty)
      return undefined;

    const index = (this.head + this.count - 1) & (this.buffer.length - 1);
    const element = this.buffer[index];

    this.buffer[index] = undefined;
    this.count--;

    return element;
  }

  /**
   * Removes and returns the front element
   * @returns {T | undefined} The front element, or undefined if empty
   */
  popFront() {
    if (this.isEmpty)
      return undefined;

    const element = this.buffer[this.head];

    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) & (this.buffer.length - 1);
    this.count--;

    return element;
  }

  /**
   * Returns the back element without removing it
   * @returns {T | undefined}
   */
  peekBack() {
    if (this.isEmpty)
      return undefined;

    return this.buffer[(this.head + this.count - 1) & (this.buffer.length - 1)];
  }

  /**
   * Returns the front element without removing it
   * @returns {T | undefined}
   */
  peekFront() {
    if (this.isEmpty)
      return undefined;

    return this.buffer[this.head];
  }

  /**
   * Gets element at logical index (0 = front)
   * @param {number} index The logical index
   * @returns {T | undefined}
   */
  get(index: number) {
    if (index < 0 || index >= this.count)
      return undefined;

    return this.buffer[(this.head + index) & (this.buffer.length - 1)];
  }

  /**
   * Clears the buffer
   *
   * @returns {this}
   */
  clear() {
    this.buffer = new Array(MIN_CAPACITY);
    this.head = 0;
    this.count = 0;

    return this;
  }

  /**
   * Converts the buffer to an array from front to back
   *
   * @returns {T[]}
   */
  toArray() {
    const result = new Array<T>(this.count);

    for (let i = 0; i < this.count; i++)
      result[i] = this.buffer[(this.head + i) & (this.buffer.length - 1)] as T;

    return result;
  }

  /**
   * Returns a string representation
   *
   * @returns {string}
   */
  toString() {
    return this.toArray().toString();
  }

  /**
   * Returns an iterator (front to back)
   *
   * @returns {IterableIterator<T>}
   */
  [Symbol.iterator]() {
    return this.toArray()[Symbol.iterator]();
  }

  /**
   * Returns an async iterator (front to back)
   *
   * @returns {AsyncIterableIterator<T>}
   */
  async *[Symbol.asyncIterator]() {
    for (const element of this)
      yield element;
  }

  /**
   * Doubles the buffer capacity and linearizes elements
   *
   * @private
   */
  private grow() {
    const newCapacity = this.buffer.length << 1;
    const newBuffer = new Array<T | undefined>(newCapacity);

    for (let i = 0; i < this.count; i++)
      newBuffer[i] = this.buffer[(this.head + i) & (this.buffer.length - 1)];

    this.buffer = newBuffer;
    this.head = 0;
  }
}

/**
 * Returns the next power of two >= n
 *
 * @param {number} n
 * @returns {number}
 */
function nextPowerOfTwo(n: number): number {
  if (n <= 0)
    return 1;

  n--;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;

  return n + 1;
}
