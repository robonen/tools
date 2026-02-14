import { describe, expect, it } from 'vitest';

import { LinkedList } from '.';

describe('LinkedList', () => {
    describe('constructor', () => {
        it('should create an empty list', () => {
            const list = new LinkedList<number>();

            expect(list.length).toBe(0);
            expect(list.isEmpty).toBe(true);
            expect(list.head).toBeUndefined();
            expect(list.tail).toBeUndefined();
        });

        it('should create a list from single value', () => {
            const list = new LinkedList(42);

            expect(list.length).toBe(1);
            expect(list.peekFront()).toBe(42);
            expect(list.peekBack()).toBe(42);
        });

        it('should create a list from array', () => {
            const list = new LinkedList([1, 2, 3]);

            expect(list.length).toBe(3);
            expect(list.peekFront()).toBe(1);
            expect(list.peekBack()).toBe(3);
        });
    });

    describe('pushBack', () => {
        it('should append to empty list', () => {
            const list = new LinkedList<number>();

            const node = list.pushBack(1);

            expect(list.length).toBe(1);
            expect(node.value).toBe(1);
            expect(list.head).toBe(node);
            expect(list.tail).toBe(node);
        });

        it('should append to non-empty list', () => {
            const list = new LinkedList([1, 2]);

            list.pushBack(3);

            expect(list.length).toBe(3);
            expect(list.peekBack()).toBe(3);
            expect(list.peekFront()).toBe(1);
        });

        it('should return the created node', () => {
            const list = new LinkedList<number>();

            const node = list.pushBack(5);

            expect(node.value).toBe(5);
            expect(node.prev).toBeUndefined();
            expect(node.next).toBeUndefined();
        });
    });

    describe('pushFront', () => {
        it('should prepend to empty list', () => {
            const list = new LinkedList<number>();

            const node = list.pushFront(1);

            expect(list.length).toBe(1);
            expect(list.head).toBe(node);
            expect(list.tail).toBe(node);
        });

        it('should prepend to non-empty list', () => {
            const list = new LinkedList([2, 3]);

            list.pushFront(1);

            expect(list.length).toBe(3);
            expect(list.peekFront()).toBe(1);
            expect(list.peekBack()).toBe(3);
        });
    });

    describe('popBack', () => {
        it('should return undefined for empty list', () => {
            const list = new LinkedList<number>();

            expect(list.popBack()).toBeUndefined();
        });

        it('should remove and return last value', () => {
            const list = new LinkedList([1, 2, 3]);

            expect(list.popBack()).toBe(3);
            expect(list.length).toBe(2);
            expect(list.peekBack()).toBe(2);
        });

        it('should handle single element', () => {
            const list = new LinkedList(1);

            expect(list.popBack()).toBe(1);
            expect(list.isEmpty).toBe(true);
            expect(list.head).toBeUndefined();
            expect(list.tail).toBeUndefined();
        });
    });

    describe('popFront', () => {
        it('should return undefined for empty list', () => {
            const list = new LinkedList<number>();

            expect(list.popFront()).toBeUndefined();
        });

        it('should remove and return first value', () => {
            const list = new LinkedList([1, 2, 3]);

            expect(list.popFront()).toBe(1);
            expect(list.length).toBe(2);
            expect(list.peekFront()).toBe(2);
        });

        it('should handle single element', () => {
            const list = new LinkedList(1);

            expect(list.popFront()).toBe(1);
            expect(list.isEmpty).toBe(true);
            expect(list.head).toBeUndefined();
            expect(list.tail).toBeUndefined();
        });
    });

    describe('peekBack', () => {
        it('should return undefined for empty list', () => {
            const list = new LinkedList<number>();

            expect(list.peekBack()).toBeUndefined();
        });

        it('should return last value without removing', () => {
            const list = new LinkedList([1, 2, 3]);

            expect(list.peekBack()).toBe(3);
            expect(list.length).toBe(3);
        });
    });

    describe('peekFront', () => {
        it('should return undefined for empty list', () => {
            const list = new LinkedList<number>();

            expect(list.peekFront()).toBeUndefined();
        });

        it('should return first value without removing', () => {
            const list = new LinkedList([1, 2, 3]);

            expect(list.peekFront()).toBe(1);
            expect(list.length).toBe(3);
        });
    });

    describe('insertBefore', () => {
        it('should insert before head', () => {
            const list = new LinkedList<number>();
            const node = list.pushBack(2);

            list.insertBefore(node, 1);

            expect(list.peekFront()).toBe(1);
            expect(list.peekBack()).toBe(2);
            expect(list.length).toBe(2);
        });

        it('should insert before middle node', () => {
            const list = new LinkedList([1, 3]);
            const tail = list.tail!;

            list.insertBefore(tail, 2);

            expect(list.toArray()).toEqual([1, 2, 3]);
        });

        it('should return the created node', () => {
            const list = new LinkedList<number>();
            const existing = list.pushBack(2);

            const newNode = list.insertBefore(existing, 1);

            expect(newNode.value).toBe(1);
            expect(newNode.next).toBe(existing);
        });
    });

    describe('insertAfter', () => {
        it('should insert after tail', () => {
            const list = new LinkedList<number>();
            const node = list.pushBack(1);

            list.insertAfter(node, 2);

            expect(list.peekFront()).toBe(1);
            expect(list.peekBack()).toBe(2);
            expect(list.length).toBe(2);
        });

        it('should insert after middle node', () => {
            const list = new LinkedList([1, 3]);
            const head = list.head!;

            list.insertAfter(head, 2);

            expect(list.toArray()).toEqual([1, 2, 3]);
        });

        it('should return the created node', () => {
            const list = new LinkedList<number>();
            const existing = list.pushBack(1);

            const newNode = list.insertAfter(existing, 2);

            expect(newNode.value).toBe(2);
            expect(newNode.prev).toBe(existing);
        });
    });

    describe('remove', () => {
        it('should remove head node', () => {
            const list = new LinkedList([1, 2, 3]);
            const head = list.head!;

            const value = list.remove(head);

            expect(value).toBe(1);
            expect(list.length).toBe(2);
            expect(list.peekFront()).toBe(2);
        });

        it('should remove tail node', () => {
            const list = new LinkedList([1, 2, 3]);
            const tail = list.tail!;

            const value = list.remove(tail);

            expect(value).toBe(3);
            expect(list.length).toBe(2);
            expect(list.peekBack()).toBe(2);
        });

        it('should remove middle node', () => {
            const list = new LinkedList([1, 2, 3]);
            const middle = list.head!.next!;

            const value = list.remove(middle);

            expect(value).toBe(2);
            expect(list.toArray()).toEqual([1, 3]);
        });

        it('should remove single element', () => {
            const list = new LinkedList<number>();
            const node = list.pushBack(1);

            list.remove(node);

            expect(list.isEmpty).toBe(true);
            expect(list.head).toBeUndefined();
            expect(list.tail).toBeUndefined();
        });

        it('should detach the removed node', () => {
            const list = new LinkedList([1, 2, 3]);
            const middle = list.head!.next!;

            list.remove(middle);

            expect(middle.prev).toBeUndefined();
            expect(middle.next).toBeUndefined();
        });
    });

    describe('clear', () => {
        it('should remove all elements', () => {
            const list = new LinkedList([1, 2, 3]);

            const result = list.clear();

            expect(list.length).toBe(0);
            expect(list.isEmpty).toBe(true);
            expect(list.head).toBeUndefined();
            expect(list.tail).toBeUndefined();
            expect(result).toBe(list);
        });
    });

    describe('toArray', () => {
        it('should return empty array for empty list', () => {
            const list = new LinkedList<number>();

            expect(list.toArray()).toEqual([]);
        });

        it('should return values from head to tail', () => {
            const list = new LinkedList([1, 2, 3]);

            expect(list.toArray()).toEqual([1, 2, 3]);
        });
    });

    describe('toString', () => {
        it('should return comma-separated values', () => {
            const list = new LinkedList([1, 2, 3]);

            expect(list.toString()).toBe('1,2,3');
        });
    });

    describe('iterator', () => {
        it('should iterate from head to tail', () => {
            const list = new LinkedList([1, 2, 3]);

            expect([...list]).toEqual([1, 2, 3]);
        });

        it('should yield nothing for empty list', () => {
            const list = new LinkedList<number>();

            expect([...list]).toEqual([]);
        });
    });

    describe('async iterator', () => {
        it('should async iterate from head to tail', async () => {
            const list = new LinkedList([1, 2, 3]);
            const result: number[] = [];

            for await (const value of list)
                result.push(value);

            expect(result).toEqual([1, 2, 3]);
        });
    });

    describe('node linking', () => {
        it('should maintain correct prev/next references', () => {
            const list = new LinkedList<number>();
            const a = list.pushBack(1);
            const b = list.pushBack(2);
            const c = list.pushBack(3);

            expect(a.next).toBe(b);
            expect(b.prev).toBe(a);
            expect(b.next).toBe(c);
            expect(c.prev).toBe(b);
            expect(a.prev).toBeUndefined();
            expect(c.next).toBeUndefined();
        });

        it('should update links after removal', () => {
            const list = new LinkedList<number>();
            const a = list.pushBack(1);
            const b = list.pushBack(2);
            const c = list.pushBack(3);

            list.remove(b);

            expect(a.next).toBe(c);
            expect(c.prev).toBe(a);
        });
    });

    describe('interleaved operations', () => {
        it('should handle mixed push/pop from both ends', () => {
            const list = new LinkedList<number>();

            list.pushBack(1);
            list.pushBack(2);
            list.pushFront(0);

            expect(list.popFront()).toBe(0);
            expect(list.popBack()).toBe(2);
            expect(list.popFront()).toBe(1);
            expect(list.isEmpty).toBe(true);
        });

        it('should handle insert and remove by node reference', () => {
            const list = new LinkedList<number>();
            const a = list.pushBack(1);
            const c = list.pushBack(3);
            const b = list.insertAfter(a, 2);
            const d = list.insertBefore(c, 2.5);

            expect(list.toArray()).toEqual([1, 2, 2.5, 3]);

            list.remove(b);
            list.remove(d);

            expect(list.toArray()).toEqual([1, 3]);
        });
    });
});
