import { isArray } from '../../types';
import type { LinkedListLike, LinkedListNode } from './types';

export type { LinkedListLike, LinkedListNode } from './types';

/**
 * Creates a new doubly linked list node
 *
 * @template T The type of the value
 * @param {T} value The value to store
 * @returns {LinkedListNode<T>} The created node
 */
function createNode<T>(value: T): LinkedListNode<T> {
    return { value, prev: undefined, next: undefined };
}

/**
 * @name LinkedList
 * @category Data Structures
 * @description Doubly linked list with O(1) push/pop on both ends and O(1) insert/remove by node reference
 *
 * @since 0.0.8
 *
 * @template T The type of elements stored in the list
 */
export class LinkedList<T> implements LinkedListLike<T> {
    /**
     * The number of elements in the list
     *
     * @private
     * @type {number}
     */
    private count: number = 0;

    /**
     * The first node in the list
     *
     * @private
     * @type {LinkedListNode<T> | undefined}
     */
    private first: LinkedListNode<T> | undefined;

    /**
     * The last node in the list
     *
     * @private
     * @type {LinkedListNode<T> | undefined}
     */
    private last: LinkedListNode<T> | undefined;

    /**
     * Creates an instance of LinkedList
     *
     * @param {(T[] | T)} [initialValues] The initial values to add to the list
     */
    constructor(initialValues?: T[] | T) {
        if (initialValues != null) {
            const items = isArray(initialValues) ? initialValues : [initialValues];

            for (const item of items)
                this.pushBack(item);
        }
    }

    /**
     * Gets the number of elements in the list
     * @returns {number} The number of elements in the list
     */
    public get length(): number {
        return this.count;
    }

    /**
     * Checks if the list is empty
     * @returns {boolean} `true` if the list is empty, `false` otherwise
     */
    public get isEmpty(): boolean {
        return this.count === 0;
    }

    /**
     * Gets the first node
     * @returns {LinkedListNode<T> | undefined} The first node, or `undefined` if the list is empty
     */
    public get head(): LinkedListNode<T> | undefined {
        return this.first;
    }

    /**
     * Gets the last node
     * @returns {LinkedListNode<T> | undefined} The last node, or `undefined` if the list is empty
     */
    public get tail(): LinkedListNode<T> | undefined {
        return this.last;
    }

    /**
     * Appends a value to the end of the list
     * @param {T} value The value to append
     * @returns {LinkedListNode<T>} The created node
     */
    public pushBack(value: T): LinkedListNode<T> {
        const node = createNode(value);

        if (this.last) {
            node.prev = this.last;
            this.last.next = node;
            this.last = node;
        } else {
            this.first = node;
            this.last = node;
        }

        this.count++;

        return node;
    }

    /**
     * Prepends a value to the beginning of the list
     * @param {T} value The value to prepend
     * @returns {LinkedListNode<T>} The created node
     */
    public pushFront(value: T): LinkedListNode<T> {
        const node = createNode(value);

        if (this.first) {
            node.next = this.first;
            this.first.prev = node;
            this.first = node;
        } else {
            this.first = node;
            this.last = node;
        }

        this.count++;

        return node;
    }

    /**
     * Removes and returns the last value
     * @returns {T | undefined} The last value, or `undefined` if the list is empty
     */
    public popBack(): T | undefined {
        if (!this.last) return undefined;

        const node = this.last;

        this.detach(node);

        return node.value;
    }

    /**
     * Removes and returns the first value
     * @returns {T | undefined} The first value, or `undefined` if the list is empty
     */
    public popFront(): T | undefined {
        if (!this.first) return undefined;

        const node = this.first;

        this.detach(node);

        return node.value;
    }

    /**
     * Returns the last value without removing it
     * @returns {T | undefined} The last value, or `undefined` if the list is empty
     */
    public peekBack(): T | undefined {
        return this.last?.value;
    }

    /**
     * Returns the first value without removing it
     * @returns {T | undefined} The first value, or `undefined` if the list is empty
     */
    public peekFront(): T | undefined {
        return this.first?.value;
    }

    /**
     * Inserts a value before the given node
     * @param {LinkedListNode<T>} node The reference node
     * @param {T} value The value to insert
     * @returns {LinkedListNode<T>} The created node
     */
    public insertBefore(node: LinkedListNode<T>, value: T): LinkedListNode<T> {
        const newNode = createNode(value);

        newNode.next = node;
        newNode.prev = node.prev;

        if (node.prev) {
            node.prev.next = newNode;
        } else {
            this.first = newNode;
        }

        node.prev = newNode;
        this.count++;

        return newNode;
    }

    /**
     * Inserts a value after the given node
     * @param {LinkedListNode<T>} node The reference node
     * @param {T} value The value to insert
     * @returns {LinkedListNode<T>} The created node
     */
    public insertAfter(node: LinkedListNode<T>, value: T): LinkedListNode<T> {
        const newNode = createNode(value);

        newNode.prev = node;
        newNode.next = node.next;

        if (node.next) {
            node.next.prev = newNode;
        } else {
            this.last = newNode;
        }

        node.next = newNode;
        this.count++;

        return newNode;
    }

    /**
     * Removes a node from the list by reference in O(1)
     * @param {LinkedListNode<T>} node The node to remove
     * @returns {T} The value of the removed node
     */
    public remove(node: LinkedListNode<T>): T {
        this.detach(node);

        return node.value;
    }

    /**
     * Removes all elements from the list
     * @returns {this} The list instance for chaining
     */
    public clear(): this {
        this.first = undefined;
        this.last = undefined;
        this.count = 0;

        return this;
    }

    /**
     * Returns a shallow copy of the list values as an array
     * @returns {T[]} Array of values from head to tail
     */
    public toArray(): T[] {
        const result = new Array<T>(this.count);
        let current = this.first;
        let i = 0;

        while (current) {
            result[i++] = current.value;
            current = current.next;
        }

        return result;
    }

    /**
     * Returns a string representation of the list
     * @returns {string} String representation
     */
    public toString(): string {
        return this.toArray().toString();
    }

    /**
     * Iterator over list values from head to tail
     */
    public *[Symbol.iterator](): Iterator<T> {
        let current = this.first;

        while (current) {
            yield current.value;
            current = current.next;
        }
    }

    /**
     * Async iterator over list values from head to tail
     */
    public async *[Symbol.asyncIterator](): AsyncIterator<T> {
        for (const value of this)
            yield value;
    }

    /**
     * Detaches a node from the list, updating head/tail and count
     *
     * @private
     * @param {LinkedListNode<T>} node The node to detach
     */
    private detach(node: LinkedListNode<T>): void {
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.first = node.next;
        }

        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.last = node.prev;
        }

        node.prev = undefined;
        node.next = undefined;
        this.count--;
    }
}
