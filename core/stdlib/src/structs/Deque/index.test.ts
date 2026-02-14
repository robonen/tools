import { describe, it, expect } from 'vitest';
import { Deque } from '.';

describe('deque', () => {
  describe('constructor', () => {
    it('create an empty deque if no initial values are provided', () => {
      const deque = new Deque<number>();

      expect(deque.length).toBe(0);
      expect(deque.isEmpty).toBe(true);
    });

    it('create a deque with the provided initial values', () => {
      const deque = new Deque([1, 2, 3]);

      expect(deque.length).toBe(3);
      expect(deque.peekFront()).toBe(1);
      expect(deque.peekBack()).toBe(3);
    });

    it('create a deque with a single initial value', () => {
      const deque = new Deque(42);

      expect(deque.length).toBe(1);
      expect(deque.peekFront()).toBe(42);
    });

    it('create a deque with the provided options', () => {
      const deque = new Deque<number>(undefined, { maxSize: 5 });

      expect(deque.length).toBe(0);
      expect(deque.isFull).toBe(false);
    });
  });

  describe('pushBack', () => {
    it('add an element to the back', () => {
      const deque = new Deque<number>();
      deque.pushBack(1).pushBack(2);

      expect(deque.peekFront()).toBe(1);
      expect(deque.peekBack()).toBe(2);
      expect(deque.length).toBe(2);
    });

    it('throw an error if the deque is full', () => {
      const deque = new Deque<number>(undefined, { maxSize: 1 });
      deque.pushBack(1);

      expect(() => deque.pushBack(2)).toThrow(new RangeError('Deque is full'));
    });

    it('return this for chaining', () => {
      const deque = new Deque<number>();

      expect(deque.pushBack(1)).toBe(deque);
    });
  });

  describe('pushFront', () => {
    it('add an element to the front', () => {
      const deque = new Deque<number>();
      deque.pushFront(1).pushFront(2);

      expect(deque.peekFront()).toBe(2);
      expect(deque.peekBack()).toBe(1);
      expect(deque.length).toBe(2);
    });

    it('throw an error if the deque is full', () => {
      const deque = new Deque<number>(undefined, { maxSize: 1 });
      deque.pushFront(1);

      expect(() => deque.pushFront(2)).toThrow(new RangeError('Deque is full'));
    });

    it('return this for chaining', () => {
      const deque = new Deque<number>();

      expect(deque.pushFront(1)).toBe(deque);
    });
  });

  describe('popBack', () => {
    it('remove and return the back element', () => {
      const deque = new Deque([1, 2, 3]);

      expect(deque.popBack()).toBe(3);
      expect(deque.length).toBe(2);
    });

    it('return undefined if the deque is empty', () => {
      const deque = new Deque<number>();

      expect(deque.popBack()).toBeUndefined();
    });
  });

  describe('popFront', () => {
    it('remove and return the front element', () => {
      const deque = new Deque([1, 2, 3]);

      expect(deque.popFront()).toBe(1);
      expect(deque.length).toBe(2);
    });

    it('return undefined if the deque is empty', () => {
      const deque = new Deque<number>();

      expect(deque.popFront()).toBeUndefined();
    });
  });

  describe('peekBack', () => {
    it('return the back element without removing it', () => {
      const deque = new Deque([1, 2, 3]);

      expect(deque.peekBack()).toBe(3);
      expect(deque.length).toBe(3);
    });

    it('return undefined if the deque is empty', () => {
      const deque = new Deque<number>();

      expect(deque.peekBack()).toBeUndefined();
    });
  });

  describe('peekFront', () => {
    it('return the front element without removing it', () => {
      const deque = new Deque([1, 2, 3]);

      expect(deque.peekFront()).toBe(1);
      expect(deque.length).toBe(3);
    });

    it('return undefined if the deque is empty', () => {
      const deque = new Deque<number>();

      expect(deque.peekFront()).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('clear the deque', () => {
      const deque = new Deque([1, 2, 3]);
      deque.clear();

      expect(deque.length).toBe(0);
      expect(deque.isEmpty).toBe(true);
    });

    it('return this for chaining', () => {
      const deque = new Deque([1, 2, 3]);

      expect(deque.clear()).toBe(deque);
    });
  });

  describe('toArray', () => {
    it('return elements from front to back', () => {
      const deque = new Deque([1, 2, 3]);

      expect(deque.toArray()).toEqual([1, 2, 3]);
    });

    it('return correct order after mixed operations', () => {
      const deque = new Deque<number>();
      deque.pushBack(2);
      deque.pushBack(3);
      deque.pushFront(1);
      deque.pushFront(0);

      expect(deque.toArray()).toEqual([0, 1, 2, 3]);
    });
  });

  describe('toString', () => {
    it('return comma-separated string', () => {
      const deque = new Deque([1, 2, 3]);

      expect(deque.toString()).toBe('1,2,3');
    });
  });

  describe('iteration', () => {
    it('iterate in front-to-back order', () => {
      const deque = new Deque([1, 2, 3]);

      expect([...deque]).toEqual([1, 2, 3]);
    });

    it('iterate asynchronously', async () => {
      const deque = new Deque([1, 2, 3]);
      const elements: number[] = [];

      for await (const element of deque)
        elements.push(element);

      expect(elements).toEqual([1, 2, 3]);
    });
  });

  describe('circular buffer behavior', () => {
    it('handle wrap-around correctly', () => {
      const deque = new Deque<number>();

      for (let i = 0; i < 4; i++)
        deque.pushBack(i);

      deque.popFront();
      deque.popFront();
      deque.pushBack(4);
      deque.pushBack(5);

      expect(deque.toArray()).toEqual([2, 3, 4, 5]);
    });

    it('grow the buffer when needed', () => {
      const deque = new Deque<number>();

      for (let i = 0; i < 100; i++)
        deque.pushBack(i);

      expect(deque.length).toBe(100);
      expect(deque.peekFront()).toBe(0);
      expect(deque.peekBack()).toBe(99);
    });

    it('handle alternating front/back operations', () => {
      const deque = new Deque<number>();

      deque.pushFront(3);
      deque.pushBack(4);
      deque.pushFront(2);
      deque.pushBack(5);
      deque.pushFront(1);

      expect(deque.toArray()).toEqual([1, 2, 3, 4, 5]);

      expect(deque.popFront()).toBe(1);
      expect(deque.popBack()).toBe(5);
      expect(deque.toArray()).toEqual([2, 3, 4]);
    });
  });

  describe('mixed operations', () => {
    it('use as a stack (LIFO)', () => {
      const deque = new Deque<number>();
      deque.pushBack(1).pushBack(2).pushBack(3);

      expect(deque.popBack()).toBe(3);
      expect(deque.popBack()).toBe(2);
      expect(deque.popBack()).toBe(1);
    });

    it('use as a queue (FIFO)', () => {
      const deque = new Deque<number>();
      deque.pushBack(1).pushBack(2).pushBack(3);

      expect(deque.popFront()).toBe(1);
      expect(deque.popFront()).toBe(2);
      expect(deque.popFront()).toBe(3);
    });

    it('reuse deque after clear', () => {
      const deque = new Deque([1, 2, 3]);
      deque.clear();
      deque.pushBack(4);

      expect(deque.length).toBe(1);
      expect(deque.peekFront()).toBe(4);
    });

    it('maxSize limits capacity', () => {
      const deque = new Deque<number>(undefined, { maxSize: 3 });
      deque.pushBack(1).pushBack(2).pushBack(3);

      expect(deque.isFull).toBe(true);
      expect(() => deque.pushFront(0)).toThrow(new RangeError('Deque is full'));

      deque.popFront();
      deque.pushFront(0);

      expect(deque.toArray()).toEqual([0, 2, 3]);
    });
  });
});
