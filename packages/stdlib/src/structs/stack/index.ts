export type StackOptions = {
    maxSize?: number;
};

/**
 * Represents a stack data structure
 * @template T The type of elements stored in the stack
 */
export class Stack<T> implements Iterable<T>, AsyncIterable<T> {
    /**
     * The maximum number of elements that the stack can hold
     * 
     * @private
     * @type {number}
     */
    private maxSize: number;

    /**
     * The stack data structure
     * 
     * @private
     * @type {T[]}
     */
    private stack: T[];

    /**
     * Creates an instance of Stack
     * 
     * @param {(T[] | T)} [initialValues] The initial values to add to the stack
     * @param {StackOptions} [options] The options for the stack
     * @memberof Stack
     */
    constructor(initialValues?: T[] | T, options?: StackOptions) {
        this.maxSize = options?.maxSize ?? Infinity;
        this.stack = Array.isArray(initialValues) ? initialValues : initialValues ? [initialValues] : [];
    }
    
    /**
     * Gets the number of elements in the stack
     * @returns {number} The number of elements in the stack
     */
    public get length(): number {
        return this.stack.length;
    }

    /**
     * Checks if the stack is empty
     * @returns {boolean} `true` if the stack is empty, `false` otherwise
     */
    public get isEmpty(): boolean {
        return this.stack.length === 0;
    }

    /**
     * Checks if the stack is full
     * @returns {boolean} `true` if the stack is full, `false` otherwise
     */
    public get isFull(): boolean {
        return this.stack.length === this.maxSize;
    }

    /**
     * Pushes an element onto the stack
     * @param {T} element The element to push onto the stack
     * @returns {this}
     * @throws {RangeError} If the stack is full
     */
    public push(element: T) {
        if (this.isFull)
            throw new RangeError('Stack is full');
        
        this.stack.push(element);

        return this;
    }

    /**
     * Pops an element from the stack
     * @returns {T} The element popped from the stack
     */
    public pop(): T | undefined {
        return this.stack.pop();
    }

    /**
     * Peeks at the top element of the stack
     * @returns {T} The top element of the stack
     */
    public peek(): T | undefined {
        if (this.isEmpty)
            throw new RangeError('Stack is empty');
        
        return this.stack[this.stack.length - 1];
    }

    /**
     * Clears the stack
     * 
     * @returns {this}
     */
    public clear() {
        this.stack.length = 0;

        return this;
    }

    /**
     * Converts the stack to an array
     * 
     * @returns {T[]}
     */
    public toArray(): T[] {
        return this.stack.toReversed();
    }

    /**
     * Returns a string representation of the stack
     * 
     * @returns {string}
     */
    public toString() {
        return this.toArray().toString();
    }

    /**
     * Returns an iterator for the stack
     * 
     * @returns {IterableIterator<T>}
     */
    public [Symbol.iterator]() {
        return this.toArray()[Symbol.iterator]();
    }

    /**
     * Returns an async iterator for the stack
     * 
     * @returns {AsyncIterableIterator<T>}
     */
    public async *[Symbol.asyncIterator]() {
        for (const element of this.toArray()) {
            yield element;
        }
    }
}
