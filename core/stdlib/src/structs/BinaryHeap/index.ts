import { first } from '../../arrays';
import { isArray } from '../../types';
import type { BinaryHeapLike, Comparator } from './types';

export type { BinaryHeapLike, Comparator } from './types';

export interface BinaryHeapOptions<T> {
  comparator?: Comparator<T>;
}

/**
 * Default min-heap comparator for numeric values
 *
 * @param {number} a First element
 * @param {number} b Second element
 * @returns {number} Negative if a < b, positive if a > b, zero if equal
 */
const defaultComparator: Comparator<any> = (a: number, b: number) => a - b;

/**
 * @name BinaryHeap
 * @category Data Structures
 * @description Binary heap backed by a flat array with configurable comparator
 *
 * @since 0.0.8
 *
 * @template T The type of elements stored in the heap
 */
export class BinaryHeap<T> implements BinaryHeapLike<T> {
  /**
     * The comparator function used to order elements
     *
     * @private
     * @type {Comparator<T>}
     */
  private readonly comparator: Comparator<T>;

  /**
     * Internal flat array backing the heap
     *
     * @private
     * @type {T[]}
     */
  private readonly heap: T[] = [];

  /**
     * Creates an instance of BinaryHeap
     *
     * @param {(T[] | T)} [initialValues] The initial values to heapify
     * @param {BinaryHeapOptions<T>} [options] Heap configuration
     */
  constructor(initialValues?: T[] | T, options?: BinaryHeapOptions<T>) {
    this.comparator = options?.comparator ?? defaultComparator;

    if (initialValues !== null && initialValues !== undefined) {
      const items = isArray(initialValues) ? initialValues : [initialValues];
      this.heap.push(...items);
      this.heapify();
    }
  }

  /**
     * Gets the number of elements in the heap
     * @returns {number} The number of elements in the heap
     */
  public get length(): number {
    return this.heap.length;
  }

  /**
     * Checks if the heap is empty
     * @returns {boolean} `true` if the heap is empty, `false` otherwise
     */
  public get isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
     * Pushes an element into the heap
     * @param {T} element The element to insert
     */
  public push(element: T): void {
    this.heap.push(element);
    this.siftUp(this.heap.length - 1);
  }

  /**
     * Removes and returns the root element (min or max depending on comparator)
     * @returns {T | undefined} The root element, or `undefined` if the heap is empty
     */
  public pop(): T | undefined {
    if (this.heap.length === 0) return undefined;

    const root = first(this.heap)!;
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }

    return root;
  }

  /**
     * Returns the root element without removing it
     * @returns {T | undefined} The root element, or `undefined` if the heap is empty
     */
  public peek(): T | undefined {
    return first(this.heap);
  }

  /**
     * Removes all elements from the heap
     * @returns {this} The heap instance for chaining
     */
  public clear(): this {
    this.heap.length = 0;
    return this;
  }

  /**
     * Returns a shallow copy of the heap elements as an array (heap order, not sorted)
     * @returns {T[]} Array of elements in heap order
     */
  public toArray(): T[] {
    return this.heap.slice();
  }

  /**
     * Returns a string representation of the heap
     * @returns {string} String representation
     */
  public toString(): string {
    return `BinaryHeap(${this.heap.length})`;
  }

  /**
     * Iterator over heap elements in heap order
     */
  public* [Symbol.iterator](): Iterator<T> {
    yield* this.heap;
  }

  /**
     * Async iterator over heap elements in heap order
     */
  public async* [Symbol.asyncIterator](): AsyncIterator<T> {
    for (const element of this.heap)
      yield element;
  }

  /**
     * Restores heap property by sifting an element up
     *
     * @private
     * @param {number} index The index of the element to sift up
     */
  private siftUp(index: number): void {
    const heap = this.heap;
    const cmp = this.comparator;

    while (index > 0) {
      const parent = (index - 1) >> 1;

      if (cmp(heap[index]!, heap[parent]!) >= 0) break;

      const temp = heap[index]!;
      heap[index] = heap[parent]!;
      heap[parent] = temp;

      index = parent;
    }
  }

  /**
     * Restores heap property by sifting an element down
     *
     * @private
     * @param {number} index The index of the element to sift down
     */
  private siftDown(index: number): void {
    const heap = this.heap;
    const cmp = this.comparator;
    const length = heap.length;

    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < length && cmp(heap[left]!, heap[smallest]!) < 0) {
        smallest = left;
      }

      if (right < length && cmp(heap[right]!, heap[smallest]!) < 0) {
        smallest = right;
      }

      if (smallest === index) break;

      const temp = heap[index]!;
      heap[index] = heap[smallest]!;
      heap[smallest] = temp;

      index = smallest;
    }
  }

  /**
     * Builds heap from unordered array in O(n) using Floyd's algorithm
     *
     * @private
     */
  private heapify(): void {
    for (let i = (this.heap.length >> 1) - 1; i >= 0; i--) {
      this.siftDown(i);
    }
  }
}
