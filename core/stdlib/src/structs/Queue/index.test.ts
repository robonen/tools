import { describe, it, expect } from 'vitest';
import { Queue } from '.';

describe('queue', () => {
  describe('constructor', () => {
    it('create an empty queue if no initial values are provided', () => {
      const queue = new Queue<number>();

      expect(queue.length).toBe(0);
      expect(queue.isEmpty).toBe(true);
    });

    it('create a queue with the provided initial values', () => {
      const queue = new Queue([1, 2, 3]);

      expect(queue.length).toBe(3);
      expect(queue.peek()).toBe(1);
    });

    it('create a queue with a single initial value', () => {
      const queue = new Queue(42);

      expect(queue.length).toBe(1);
      expect(queue.peek()).toBe(42);
    });

    it('create a queue with the provided options', () => {
      const queue = new Queue<number>(undefined, { maxSize: 5 });

      expect(queue.length).toBe(0);
      expect(queue.isFull).toBe(false);
    });
  });

  describe('enqueue', () => {
    it('add an element to the back of the queue', () => {
      const queue = new Queue<number>();
      queue.enqueue(1);

      expect(queue.length).toBe(1);
      expect(queue.peek()).toBe(1);
    });

    it('maintain FIFO order', () => {
      const queue = new Queue<number>();
      queue.enqueue(1).enqueue(2).enqueue(3);

      expect(queue.peek()).toBe(1);
    });

    it('throw an error if the queue is full', () => {
      const queue = new Queue<number>(undefined, { maxSize: 1 });
      queue.enqueue(1);

      expect(() => queue.enqueue(2)).toThrow(new RangeError('Queue is full'));
    });

    it('return this for chaining', () => {
      const queue = new Queue<number>();
      const result = queue.enqueue(1);

      expect(result).toBe(queue);
    });
  });

  describe('dequeue', () => {
    it('remove and return the front element', () => {
      const queue = new Queue([1, 2, 3]);
      const element = queue.dequeue();

      expect(element).toBe(1);
      expect(queue.length).toBe(2);
    });

    it('return undefined if the queue is empty', () => {
      const queue = new Queue<number>();

      expect(queue.dequeue()).toBeUndefined();
    });

    it('maintain FIFO order across multiple dequeues', () => {
      const queue = new Queue([1, 2, 3]);

      expect(queue.dequeue()).toBe(1);
      expect(queue.dequeue()).toBe(2);
      expect(queue.dequeue()).toBe(3);
      expect(queue.dequeue()).toBeUndefined();
    });

    it('compact internal storage after many dequeues', () => {
      const queue = new Queue<number>();

      for (let i = 0; i < 100; i++)
        queue.enqueue(i);

      for (let i = 0; i < 80; i++)
        queue.dequeue();

      expect(queue.length).toBe(20);
      expect(queue.peek()).toBe(80);
    });
  });

  describe('peek', () => {
    it('return the front element without removing it', () => {
      const queue = new Queue([1, 2, 3]);

      expect(queue.peek()).toBe(1);
      expect(queue.length).toBe(3);
    });

    it('return undefined if the queue is empty', () => {
      const queue = new Queue<number>();

      expect(queue.peek()).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('clear the queue', () => {
      const queue = new Queue([1, 2, 3]);
      queue.clear();

      expect(queue.length).toBe(0);
      expect(queue.isEmpty).toBe(true);
    });

    it('return this for chaining', () => {
      const queue = new Queue([1, 2, 3]);

      expect(queue.clear()).toBe(queue);
    });
  });

  describe('toArray', () => {
    it('return elements in FIFO order', () => {
      const queue = new Queue([1, 2, 3]);

      expect(queue.toArray()).toEqual([1, 2, 3]);
    });

    it('return correct array after dequeues', () => {
      const queue = new Queue([1, 2, 3, 4, 5]);
      queue.dequeue();
      queue.dequeue();

      expect(queue.toArray()).toEqual([3, 4, 5]);
    });
  });

  describe('toString', () => {
    it('return comma-separated string', () => {
      const queue = new Queue([1, 2, 3]);

      expect(queue.toString()).toBe('1,2,3');
    });
  });

  describe('iteration', () => {
    it('iterate over the queue in FIFO order', () => {
      const queue = new Queue([1, 2, 3]);

      expect([...queue]).toEqual([1, 2, 3]);
    });

    it('iterate correctly after dequeues', () => {
      const queue = new Queue([1, 2, 3, 4]);
      queue.dequeue();

      expect([...queue]).toEqual([2, 3, 4]);
    });

    it('iterate over the queue asynchronously in FIFO order', async () => {
      const queue = new Queue([1, 2, 3]);
      const elements: number[] = [];

      for await (const element of queue)
        elements.push(element);

      expect(elements).toEqual([1, 2, 3]);
    });
  });

  describe('mixed operations', () => {
    it('interleave enqueue and dequeue', () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.enqueue(2);
      expect(queue.dequeue()).toBe(1);

      queue.enqueue(3);
      expect(queue.dequeue()).toBe(2);
      expect(queue.dequeue()).toBe(3);
      expect(queue.isEmpty).toBe(true);
    });

    it('reuse queue after clear', () => {
      const queue = new Queue([1, 2, 3]);
      queue.clear();
      queue.enqueue(4);

      expect(queue.length).toBe(1);
      expect(queue.peek()).toBe(4);
    });
  });
});
