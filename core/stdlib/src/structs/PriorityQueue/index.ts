import { BinaryHeap } from '../BinaryHeap';
import type { Comparator, PriorityQueueLike } from './types';

export type { PriorityQueueLike } from './types';
export type { Comparator } from './types';

export interface PriorityQueueOptions<T> {
  comparator?: Comparator<T>;
  maxSize?: number;
}

/**
 * @name PriorityQueue
 * @category Data Structures
 * @description Priority queue backed by a binary heap with configurable comparator and optional max size
 *
 * @since 0.0.8
 *
 * @template T The type of elements stored in the queue
 */
export class PriorityQueue<T> implements PriorityQueueLike<T> {
  /**
     * The maximum number of elements the queue can hold
     *
     * @private
     * @type {number}
     */
  private readonly maxSize: number;

  /**
     * Internal binary heap backing the queue
     *
     * @private
     * @type {BinaryHeap<T>}
     */
  private readonly heap: BinaryHeap<T>;

  /**
     * Creates an instance of PriorityQueue
     *
     * @param {(T[] | T)} [initialValues] The initial values to add to the queue
     * @param {PriorityQueueOptions<T>} [options] Queue configuration
     */
  constructor(initialValues?: T[] | T, options?: PriorityQueueOptions<T>) {
    this.maxSize = options?.maxSize ?? Infinity;
    this.heap = new BinaryHeap(initialValues, { comparator: options?.comparator });

    if (this.heap.length > this.maxSize) {
      throw new RangeError('Initial values exceed maxSize');
    }
  }

  /**
     * Gets the number of elements in the queue
     * @returns {number} The number of elements in the queue
     */
  public get length(): number {
    return this.heap.length;
  }

  /**
     * Checks if the queue is empty
     * @returns {boolean} `true` if the queue is empty, `false` otherwise
     */
  public get isEmpty(): boolean {
    return this.heap.isEmpty;
  }

  /**
     * Checks if the queue is full
     * @returns {boolean} `true` if the queue has reached maxSize, `false` otherwise
     */
  public get isFull(): boolean {
    return this.heap.length >= this.maxSize;
  }

  /**
     * Enqueues an element by priority
     * @param {T} element The element to enqueue
     * @throws {RangeError} If the queue is full
     */
  public enqueue(element: T): void {
    if (this.isFull)
      throw new RangeError('PriorityQueue is full');

    this.heap.push(element);
  }

  /**
     * Dequeues the highest-priority element
     * @returns {T | undefined} The highest-priority element, or `undefined` if empty
     */
  public dequeue(): T | undefined {
    return this.heap.pop();
  }

  /**
     * Returns the highest-priority element without removing it
     * @returns {T | undefined} The highest-priority element, or `undefined` if empty
     */
  public peek(): T | undefined {
    return this.heap.peek();
  }

  /**
     * Removes all elements from the queue
     * @returns {this} The queue instance for chaining
     */
  public clear(): this {
    this.heap.clear();
    return this;
  }

  /**
     * Returns a shallow copy of elements in heap order
     * @returns {T[]} Array of elements
     */
  public toArray(): T[] {
    return this.heap.toArray();
  }

  /**
     * Returns a string representation of the queue
     * @returns {string} String representation
     */
  public toString(): string {
    return `PriorityQueue(${this.heap.length})`;
  }

  /**
     * Iterator over queue elements in heap order
     */
  public* [Symbol.iterator](): Iterator<T> {
    yield* this.heap;
  }

  /**
     * Async iterator over queue elements in heap order
     */
  public async* [Symbol.asyncIterator](): AsyncIterator<T> {
    for (const element of this.heap)
      yield element;
  }
}
