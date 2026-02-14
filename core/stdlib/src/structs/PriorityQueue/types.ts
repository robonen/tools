import type { Comparator } from '../BinaryHeap';

export interface PriorityQueueLike<T> extends Iterable<T>, AsyncIterable<T> {
    readonly length: number;
    readonly isEmpty: boolean;
    readonly isFull: boolean;

    enqueue(element: T): void;
    dequeue(): T | undefined;
    peek(): T | undefined;
    clear(): this;
    toArray(): T[];
    toString(): string;
}

export type { Comparator };
